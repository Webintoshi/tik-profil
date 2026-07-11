import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ownerRoute = new URL("./route.ts", import.meta.url);
const publicRoute = new URL("../public-appointments/route.ts", import.meta.url);

test("clinic public and owner creation write canonical appointment intervals", async () => {
    const [owner, publicSource] = await Promise.all([
        readFile(ownerRoute, "utf8"),
        readFile(publicRoute, "utf8"),
    ]);
    for (const source of [owner, publicSource]) {
        assert.match(source, /starts_at/);
        assert.match(source, /ends_at/);
        assert.match(source, /business_name/);
        assert.match(source, /service_name/);
        assert.match(source, /staff_name/);
        assert.match(source, /23P01/);
    }
});

test("clinic owner mutations use canonical status lifecycle and never hard-delete", async () => {
    const source = await readFile(ownerRoute, "utf8");
    assert.match(source, /appointmentRepository\.listBusiness\('clinic'/);
    assert.match(source, /appointmentRepository\.updateBusinessStatus\('clinic'/);
    assert.doesNotMatch(source, /\.delete\(\)/);
    assert.doesNotMatch(source, /updateData\.(date|timeSlot|staffId|serviceId)/);
});
