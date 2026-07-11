import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const route = (relative: string) => readFile(new URL(relative, import.meta.url), "utf8").catch(() => "");

test("mobile reservation routes expose normalized options, availability, history, create, and both cancel URLs", async () => {
    const [main, options, availability, cancel, cancelAlias] = await Promise.all([
        route("./route.ts"),
        route("./options/route.ts"),
        route("./availability/route.ts"),
        route("./[id]/route.ts"),
        route("./[id]/cancel/route.ts"),
    ]);

    assert.match(main, /createReservationHandlers/);
    assert.match(main, /export async function GET/);
    assert.match(main, /export async function POST/);
    assert.match(options, /handlers\.getOptions\(request\)/);
    assert.match(availability, /handlers\.getAvailability\(request\)/);
    assert.match(cancel, /export async function DELETE/);
    assert.match(cancel, /export async function PATCH/);
    assert.match(cancel, /handlers\.cancel\(id\)/);
    assert.match(cancelAlias, /export async function DELETE/);
    assert.match(cancelAlias, /export async function PATCH/);
    assert.match(cancelAlias, /handlers\.cancel\(id\)/);
});

test("owner route delegates list and status lifecycle to the canonical repository adapter", async () => {
    const owner = await route("./owner/route.ts");
    assert.match(owner, /requireBusinessMember/);
    assert.match(owner, /handlers\.listBusiness\(request\)/);
    assert.match(owner, /handlers\.updateBusinessStatus\(request\)/);
    assert.doesNotMatch(owner, /getSupabaseAdmin|app_documents/);
});

test("legacy vehicle owner API and native mobile adapter share one canonical reservation table", async () => {
    const [legacyOwner, repository] = await Promise.all([
        readFile(new URL("../../vehicle-rental/reservations/route.ts", import.meta.url), "utf8"),
        readFile(new URL("../../../../server/repositories/reservation.repository.ts", import.meta.url), "utf8"),
    ]);
    assert.match(legacyOwner, /from\('vehicle_reservations'\)/);
    assert.match(repository, /INSERT INTO vehicle_reservations/);
    assert.match(repository, /"vehicle_reservations"/);
    assert.match(repository, /UPDATE \$\{table\}/);
});
