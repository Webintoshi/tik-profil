import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { ImmediateBusinessCredential } from "../src/server/business-imports/provisioning.ts";

export type PilotCommand =
    | { deliveryGeneration: string; mode: "acknowledge"; slug: string }
    | { mode: "preflight"; slug: string }
    | { credentialFile: string; mode: "reset"; slug: string }
    | { mode: "rollback"; slug: string }
    | { actorId: string; credentialFile: string; mode: "provision"; slug: string };

function optionValue(args: readonly string[], name: string): string | undefined {
    const index = args.indexOf(name);
    const value = index >= 0 ? args[index + 1]?.trim() : undefined;
    return value || undefined;
}

export function parsePilotCommand(args: readonly string[]): PilotCommand {
    const selectedModes = ["--acknowledge", "--preflight", "--provision", "--reset", "--rollback"]
        .filter((flag) => args.includes(flag));
    if (selectedModes.length !== 1) throw new Error("exactly_one_mode_required");
    const slug = optionValue(args, "--slug");
    if (!slug) throw new Error("slug_required");
    if (selectedModes[0] === "--preflight") return { mode: "preflight", slug };
    if (selectedModes[0] === "--rollback") return { mode: "rollback", slug };
    if (selectedModes[0] === "--acknowledge") {
        const deliveryGeneration = optionValue(args, "--delivery-generation");
        if (!deliveryGeneration || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(deliveryGeneration)) {
            throw new Error("valid_delivery_generation_required");
        }
        return { deliveryGeneration, mode: "acknowledge", slug };
    }
    if (selectedModes[0] === "--reset") {
        const credentialFile = optionValue(args, "--credential-file");
        if (!credentialFile) throw new Error("credential_file_required");
        return { credentialFile, mode: "reset", slug };
    }

    const actorId = optionValue(args, "--actor-id");
    const credentialFile = optionValue(args, "--credential-file");
    if (!actorId || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(actorId)) {
        throw new Error("valid_actor_id_required");
    }
    if (!credentialFile) throw new Error("credential_file_required");
    return { actorId, credentialFile, mode: "provision", slug };
}

export async function writeCredentialOnce(
    path: string,
    credential: ImmediateBusinessCredential,
): Promise<string> {
    const absolutePath = resolve(path);
    await writeFile(absolutePath, `${JSON.stringify(credential, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
    });
    return absolutePath;
}

export function publicProvisionResult(result: {
    business: { id: string; name: string; status: string };
    status: string;
    credentials?: ImmediateBusinessCredential;
}): Record<string, unknown> {
    return {
        business: result.business,
        credentialDeliveryGeneration: result.credentials?.deliveryGeneration ?? null,
        credentialWritten: Boolean(result.credentials),
        loginEmail: result.credentials?.loginEmail ?? null,
        status: result.status,
    };
}
