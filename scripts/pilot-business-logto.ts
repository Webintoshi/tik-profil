import { config as loadEnv } from "dotenv";

import { createConfiguredPilotAdoptionService } from "../src/server/business-imports/pilot-adoption.ts";
import {
    parsePilotCommand,
    publicProvisionResult,
    writeCredentialOnce,
} from "./pilot-business-logto-cli.ts";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

async function main(): Promise<void> {
    const command = parsePilotCommand(process.argv.slice(2));
    const service = await createConfiguredPilotAdoptionService();
    if (command.mode === "preflight") {
        console.log(JSON.stringify(await service.preflight(command.slug)));
        return;
    }
    if (command.mode === "rollback") {
        console.log(JSON.stringify(await service.rollback(command.slug)));
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
