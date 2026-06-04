import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const scriptFile = fileURLToPath(import.meta.url);
export const scriptDir = dirname(scriptFile);
export const repoRoot = resolve(scriptDir, "..", "..");
export const artifactsRoot = resolve(repoRoot, "artifacts", "migrations");
export const appDocumentArchiveCollections = [
    "admins",
    "businesses",
    "business_owners",
    "business_staff",
    "qr_scans",
];

let envLoaded = false;

export function loadEnvironment() {
    if (envLoaded) {
        return;
    }

    const envResult = loadEnv({
        path: resolve(repoRoot, ".env.local"),
        override: false,
        quiet: true,
    });

    if (envResult.error) {
        loadEnv({ quiet: true });
    }

    envLoaded = true;
}

export function ensureRequiredEnv(name) {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`Missing ${name}.`);
    }

    return value;
}

export function maskEmail(value) {
    if (!value || typeof value !== "string" || !value.includes("@")) {
        return "(missing)";
    }

    const [local, domain] = value.split("@");
    const localMask = `${local.slice(0, 2)}***`;
    const domainMask = `${domain.slice(0, 1)}***`;
    return `${localMask}@${domainMask}`;
}

export function maskIdentifier(value) {
    if (!value || typeof value !== "string") {
        return "(missing)";
    }

    if (value.length <= 6) {
        return `${value.slice(0, 2)}***`;
    }

    return `${value.slice(0, 4)}***${value.slice(-2)}`;
}

export function maskDatabaseTarget(databaseUrl) {
    const parsed = new URL(databaseUrl);
    const protocol = parsed.protocol.replace(/:$/, "");

    if (!["postgres", "postgresql"].includes(protocol)) {
        throw new Error("DATABASE_URL must use the postgres:// or postgresql:// scheme.");
    }

    const databaseName = parsed.pathname.replace(/^\/+/, "") || "(default)";
    const username = parsed.username ? `${parsed.username.slice(0, 2)}***` : "(none)";
    const host = parsed.hostname || "(unknown)";
    const port = parsed.port || "5432";

    return `host=${host} port=${port} db=${databaseName} user=${username}`;
}

export function sha256(input) {
    return createHash("sha256").update(input).digest("hex");
}

function toStableValue(value) {
    if (Array.isArray(value)) {
        return value.map((entry) => toStableValue(entry));
    }

    if (value && typeof value === "object" && !(value instanceof Date)) {
        return Object.fromEntries(
            Object.keys(value)
                .sort((left, right) => left.localeCompare(right))
                .map((key) => [key, toStableValue(value[key])]),
        );
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    return value;
}

export function stableStringify(value) {
    return JSON.stringify(toStableValue(value));
}

export function toJsonText(value) {
    return `${JSON.stringify(toStableValue(value), null, 2)}\n`;
}

export function toIsoOrNull(value) {
    if (!value) {
        return null;
    }

    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function pickFirstString(...values) {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }

    return null;
}

export function normalizeBoolean(value) {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "yes", "active"].includes(normalized)) {
            return true;
        }
        if (["false", "0", "no", "inactive", "disabled"].includes(normalized)) {
            return false;
        }
    }

    return null;
}

export function normalizeStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean);
}

export async function ensureDirectory(directoryPath) {
    await mkdir(directoryPath, { recursive: true });
    return directoryPath;
}

export function toRepoRelativePath(targetPath) {
    return relative(repoRoot, targetPath).replace(/\\/g, "/");
}

export function resolveFromRepo(value) {
    if (!value) {
        return null;
    }

    return isAbsolute(value) ? value : resolve(repoRoot, value);
}

export async function writeNdjsonFile(filePath, rows) {
    const text = rows.map((row) => stableStringify(row)).join("\n");
    const finalText = text ? `${text}\n` : "";
    await writeFile(filePath, finalText, "utf8");
    return {
        bytes: Buffer.byteLength(finalText),
        checksum: sha256(finalText),
    };
}

export async function writeJsonFile(filePath, value) {
    const text = toJsonText(value);
    await writeFile(filePath, text, "utf8");
    return {
        bytes: Buffer.byteLength(text),
        checksum: sha256(text),
    };
}

export async function readJsonFile(filePath) {
    const text = await readFile(filePath, "utf8");
    return JSON.parse(text);
}

export async function readNdjsonFile(filePath) {
    const text = await readFile(filePath, "utf8");
    return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line));
}

export function parseArgs(argv = process.argv.slice(2)) {
    const parsed = { _: [] };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];

        if (!token.startsWith("--")) {
            parsed._.push(token);
            continue;
        }

        const equalsIndex = token.indexOf("=");
        if (equalsIndex > -1) {
            const key = token.slice(2, equalsIndex);
            parsed[key] = token.slice(equalsIndex + 1);
            continue;
        }

        const key = token.slice(2);
        const nextToken = argv[index + 1];

        if (nextToken && !nextToken.startsWith("--")) {
            parsed[key] = nextToken;
            index += 1;
        } else {
            parsed[key] = true;
        }
    }

    return parsed;
}

export async function resolveArtifactDirectory(args) {
    const explicitManifest = resolveFromRepo(args.manifest);
    if (explicitManifest) {
        return dirname(explicitManifest);
    }

    const explicitDirectory = resolveFromRepo(args["artifact-dir"] || process.env.MIGRATION_ARTIFACT_DIR);
    if (explicitDirectory) {
        return explicitDirectory;
    }

    return null;
}

export function buildRunId(prefix = "p0") {
    return `${prefix}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

export function summarizeEntity(entity, rowCount, source) {
    return `${entity}: ${rowCount} rows from ${source}`;
}
