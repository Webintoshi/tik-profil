import { config as loadEnv } from "dotenv";

import { createLogtoManagementClient } from "../src/server/auth/logto/management-client.ts";
import { createPilotAdoptionService } from "../src/server/business-imports/pilot-adoption.ts";
import { pilotAdoptionRepository } from "../src/server/business-imports/pilot-adoption-repository.ts";
import { createBusinessProvisioningService } from "../src/server/business-imports/provisioning.ts";
import { publicProfileWriter } from "../src/server/business-imports/public-profile-writer.ts";
import { businessProvisioningRepository } from "../src/server/business-imports/repository.ts";
import {
    parsePilotCommand,
    publicProvisionResult,
    writeCredentialOnce,
} from "./pilot-business-logto-cli.ts";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

function requiredEnv(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name.toLowerCase()}_required`);
    return value;
}

async function main(): Promise<void> {
    const command = parsePilotCommand(process.argv.slice(2));
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
    if (command.mode === "preflight") {
        console.log(JSON.stringify(await service.preflight(command.slug)));
        return;
    }
    if (command.mode === "rollback") {
        console.log(JSON.stringify(await service.rollback(command.slug)));
        return;
    }
    if (command.mode === "acknowledge") {
        console.log(JSON.stringify(await service.acknowledge({
            deliveryGeneration: command.deliveryGeneration,
            slug: command.slug,
        })));
        return;
    }
    if (command.mode === "reset") {
        const credential = await service.reset(command.slug);
        await writeCredentialOnce(command.credentialFile, credential);
        console.log(JSON.stringify(publicProvisionResult({
            business: { id: credential.businessId, name: credential.businessName, status: "active" },
            credentials: credential,
            status: "reset",
        })));
        return;
    }

    const result = await service.provision({ actorId: command.actorId, slug: command.slug });
    if (result.status === "provisioned") {
        await writeCredentialOnce(command.credentialFile, result.credentials);
    }
    console.log(JSON.stringify(publicProvisionResult(result)));
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "pilot_failed";
    console.error(JSON.stringify({ error: message }));
    process.exitCode = 1;
});
