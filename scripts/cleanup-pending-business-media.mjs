import "dotenv/config";

import pg from "pg";

import { deleteFromR2 } from "../src/lib/r2Storage.ts";
import { cleanupStalePendingMedia } from "../src/server/media/media-cleanup.ts";

function required(name) {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name}_required`);
    return value;
}

function readHours() {
    const argument = process.argv.find((value) => value.startsWith("--older-than-hours="));
    if (!argument) return 24;
    return Number(argument.split("=")[1]);
}

const db = new pg.Client({ connectionString: required("DATABASE_URL") });
await db.connect();
try {
    const report = await cleanupStalePendingMedia({
        apply: process.argv.includes("--apply"),
        db,
        deleteObject: deleteFromR2,
        olderThanHours: readHours(),
    });
    console.log(JSON.stringify(report));
    if (report.failedObjects > 0) process.exitCode = 1;
} finally {
    await db.end();
}
