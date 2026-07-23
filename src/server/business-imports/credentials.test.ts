import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { allocateLoginAlias, generateInitialPassword } from "./credentials.ts";

test("initial password satisfies every class and has fixed length", () => {
    for (let index = 0; index < 100; index += 1) {
        const password = generateInitialPassword();
        assert.equal(password.length, 16);
        assert.match(password, /[a-z]/);
        assert.match(password, /[A-Z]/);
        assert.match(password, /[0-9]/);
        assert.match(password, /[^A-Za-z0-9]/);
    }
});

test("password generation uses node crypto randomInt without Math.random", async () => {
    const source = await readFile(new URL("./credentials.ts", import.meta.url), "utf8");

    assert.match(source, /from "node:crypto"/);
    assert.match(source, /\brandomInt\s*\(/);
    assert.doesNotMatch(source, /Math\.random/);
});

test("allocates aliases in base, district, then stable candidate-suffix order", async () => {
    const attempted: string[] = [];
    const repository = {
        async reserveAlias(candidateId: string, alias: string) {
            assert.equal(candidateId, "candidate-12345678");
            attempted.push(alias);
            return attempted.length === 3;
        },
    };

    const alias = await allocateLoginAlias(repository, {
        businessName: "İdeal Pet Shop",
        candidateId: "candidate-12345678",
        district: "Altınordu",
    });

    assert.equal(attempted[0], "ideal-pet-shop@tikprofil.com");
    assert.equal(attempted[1], "ideal-pet-shop-altinordu@tikprofil.com");
    assert.match(attempted[2] ?? "", /^ideal-pet-shop-[a-z0-9]{6}@tikprofil\.com$/);
    assert.equal(alias, attempted[2]);

    const repeated: string[] = [];
    await allocateLoginAlias({
        async reserveAlias(_candidateId: string, candidateAlias: string) {
            repeated.push(candidateAlias);
            return repeated.length === 3;
        },
    }, {
        businessName: "İdeal Pet Shop",
        candidateId: "candidate-12345678",
        district: "Altınordu",
    });
    assert.equal(repeated[2], attempted[2]);
});

test("keeps every attempted email local part within 64 characters", async () => {
    const attempted: string[] = [];

    await assert.rejects(
        allocateLoginAlias({
            async reserveAlias(_candidateId: string, alias: string) {
                attempted.push(alias);
                return false;
            },
        }, {
            businessName: `Ç${"ok-uzun-isim".repeat(12)}`,
            candidateId: "candidate-for-a-long-business-name",
            district: `Ü${"nye".repeat(30)}`,
        }),
        (error: unknown) => error instanceof Error && error.message === "login_alias_unavailable",
    );

    assert.equal(attempted.length, 3);
    for (const alias of attempted) {
        const [localPart, domain] = alias.split("@");
        assert.equal(domain, "tikprofil.com");
        assert.ok(localPart);
        assert.ok(localPart.length <= 64);
        assert.match(localPart, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
    assert.match(attempted[2] ?? "", /-[a-z0-9]{6}@tikprofil\.com$/);
});
