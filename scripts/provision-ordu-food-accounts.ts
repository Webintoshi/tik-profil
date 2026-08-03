import { chmod, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { config as loadEnv } from "dotenv";
import pg from "pg";
import type { QueryResultRow } from "pg";

import { createLogtoManagementClient } from "../src/server/auth/logto/management-client.ts";
import { createPilotAdoptionService } from "../src/server/business-imports/pilot-adoption.ts";
import { pilotAdoptionRepository } from "../src/server/business-imports/pilot-adoption-repository.ts";
import { createBusinessProvisioningService } from "../src/server/business-imports/provisioning.ts";
import { publicProfileWriter } from "../src/server/business-imports/public-profile-writer.ts";
import { businessProvisioningRepository } from "../src/server/business-imports/repository.ts";
import { writeCredentialOnce } from "./pilot-business-logto-cli.ts";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export interface BulkProvisionCommand {
    actorId: string | null;
    apply: boolean;
    categoryLabel: string;
    concurrency: number;
    credentialDir: string | null;
    industryId: string;
    limit: number | null;
}

interface EligibleBusiness extends QueryResultRow {
    category: string;
    district: string;
    name: string;
    slug: string;
}

function optionValue(args: readonly string[], name: string): string | null {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1]?.trim() || null : null;
}

function positiveInteger(value: string | null, errorCode: string): number | null {
    if (value === null) return null;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(errorCode);
    return parsed;
}

export function parseBulkProvisionCommand(args: readonly string[]): BulkProvisionCommand {
    const knownOptions = new Set([
        "--actor-id", "--apply", "--category-label", "--concurrency", "--credential-dir",
        "--industry-id", "--limit",
    ]);
    for (let index = 0; index < args.length; index += 1) {
        const argument = args[index];
        if (!knownOptions.has(argument)) throw new Error(`unknown_option:${argument}`);
        if (argument !== "--apply") {
            if (!args[index + 1] || args[index + 1]?.startsWith("--")) {
                throw new Error(`option_value_required:${argument}`);
            }
            index += 1;
        }
    }

    const apply = args.includes("--apply");
    const actorId = optionValue(args, "--actor-id");
    const categoryLabel = optionValue(args, "--category-label") ?? "Fast Food";
    const credentialDir = optionValue(args, "--credential-dir");
    const industryId = optionValue(args, "--industry-id") ?? "fastfood";
    const concurrency = positiveInteger(optionValue(args, "--concurrency"), "concurrency_invalid") ?? 2;
    const limit = positiveInteger(optionValue(args, "--limit"), "limit_invalid");

    if (concurrency > 4) throw new Error("concurrency_out_of_range");
    if (!/^[a-z0-9_]+$/.test(industryId)) throw new Error("industry_id_invalid");
    if (categoryLabel.length > 80) throw new Error("category_label_invalid");
    if (apply && (!actorId || !UUID_PATTERN.test(actorId))) throw new Error("actor_id_required");
    if (apply && !credentialDir) throw new Error("credential_dir_required");
    return { actorId, apply, categoryLabel, concurrency, credentialDir, industryId, limit };
}

export function credentialFilename(slug: string): string {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("unsafe_business_slug");
    return `${slug}.json`;
}

export async function retryCredentialAcknowledgement<T>(
    operation: () => Promise<T>,
    wait: (milliseconds: number) => Promise<void> = (milliseconds) => new Promise((resolveWait) => {
        setTimeout(resolveWait, milliseconds);
    }),
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt < 2) await wait(250 * (2 ** attempt));
        }
    }
    throw lastError;
}

function requiredEnv(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name.toLowerCase()}_required`);
    return value;
}

export const ELIGIBLE_BUSINESSES_SQL = `
    SELECT business.slug, business.name, business.district,
           COALESCE(business.industry_label, $3) AS category
    FROM businesses business
    INNER JOIN business_discovery_profiles discovery ON discovery.business_id = business.id
    WHERE business.source = 'google_places_verified_import'
      AND lower(COALESCE(business.city, '')) = 'ordu'
      AND lower(COALESCE(business.industry_id, '')) = $2
      AND discovery.source_type = 'google_places'
      AND discovery.claim_state = 'unclaimed'
      AND business.package_id IS NULL
      AND business.plan_id IS NULL
      AND NULLIF(BTRIM(business.phone), '') IS NOT NULL
      AND business.lat IS NOT NULL
      AND business.lng IS NOT NULL
      AND NOT EXISTS (
            SELECT 1 FROM business_memberships membership
            WHERE membership.business_id = business.id
      )
      AND NOT EXISTS (
            SELECT 1 FROM business_account_issuances issuance
            WHERE issuance.business_id = business.id
      )
    ORDER BY business.district, business.industry_label, business.name, business.id
    LIMIT $1
`;

async function listEligibleBusinesses(
    limit: number | null,
    industryId: string,
    categoryLabel: string,
): Promise<EligibleBusiness[]> {
    const client = new pg.Client({ connectionString: requiredEnv("DATABASE_URL") });
    await client.connect();
    try {
        const result = await client.query<EligibleBusiness>(
            ELIGIBLE_BUSINESSES_SQL,
            [limit ?? 100_000, industryId, categoryLabel],
        );
        return result.rows;
    } finally {
        await client.end();
    }
}

function categoryCounts(businesses: readonly EligibleBusiness[]): Record<string, number> {
    return businesses.reduce<Record<string, number>>((counts, business) => {
        counts[business.category] = (counts[business.category] ?? 0) + 1;
        return counts;
    }, {});
}

async function main(): Promise<void> {
    const command = parseBulkProvisionCommand(process.argv.slice(2));
    const businesses = await listEligibleBusinesses(
        command.limit,
        command.industryId,
        command.categoryLabel,
    );
    if (!command.apply) {
        console.log(JSON.stringify({
            mode: "dry-run",
            eligible: businesses.length,
            byCategory: categoryCounts(businesses),
        }));
        return;
    }

    const credentialDir = resolve(command.credentialDir!);
    await mkdir(credentialDir, { recursive: true, mode: 0o700 });
    await chmod(credentialDir, 0o700);

    const logto = createLogtoManagementClient({
        apiResource: process.env.LOGTO_MANAGEMENT_API_RESOURCE?.trim(),
        appId: requiredEnv("LOGTO_MANAGEMENT_APP_ID"),
        appSecret: requiredEnv("LOGTO_MANAGEMENT_APP_SECRET"),
        endpoint: requiredEnv("LOGTO_ENDPOINT"),
    });
    const provisioning = createBusinessProvisioningService({
        logto,
        profiles: publicProfileWriter,
        repository: businessProvisioningRepository,
    });
    const service = createPilotAdoptionService({ logto, provisioning, repository: pilotAdoptionRepository });
    const results: Array<{ error?: string; slug: string; status: "active" | "failed" | "skipped" }> = [];
    let cursor = 0;

    async function worker(): Promise<void> {
        while (cursor < businesses.length) {
            const business = businesses[cursor++];
            if (!business) return;
            try {
                const provisioned = await service.provision({ actorId: command.actorId!, slug: business.slug });
                if (provisioned.status !== "provisioned") {
                    results.push({ slug: business.slug, status: "skipped" });
                    continue;
                }
                const credentialPath = join(credentialDir, credentialFilename(business.slug));
                await writeCredentialOnce(credentialPath, provisioned.credentials);
                await retryCredentialAcknowledgement(() => service.acknowledge({
                    deliveryGeneration: provisioned.credentials.deliveryGeneration,
                    slug: business.slug,
                }));
                results.push({ slug: business.slug, status: "active" });
            } catch (error) {
                results.push({
                    slug: business.slug,
                    status: "failed",
                    error: error instanceof Error ? error.message : "provisioning_failed",
                });
            }
        }
    }

    await Promise.all(Array.from({ length: command.concurrency }, () => worker()));
    const failures = results.filter((result) => result.status === "failed");
    console.log(JSON.stringify({
        mode: "apply",
        eligible: businesses.length,
        active: results.filter((result) => result.status === "active").length,
        skipped: results.filter((result) => result.status === "skipped").length,
        failed: failures.length,
        failures,
    }));
    if (failures.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    void main().catch((error) => {
        console.error(JSON.stringify({ error: error instanceof Error ? error.message : "bulk_provision_failed" }));
        process.exitCode = 1;
    });
}
