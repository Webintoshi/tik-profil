import assert from "node:assert/strict";
import test from "node:test";

import { auditPublicSectors } from "./audit-ordu-public-sectors.mjs";

test("auditPublicSectors checks category totals and every public profile", async () => {
    const profileRequests = [];
    const fetchImpl = async (url, options = {}) => {
        const parsed = new URL(url);
        if (parsed.pathname === "/api/kesfet/categories") {
            return Response.json({
                categories: [{ id: "beauty", label: "G\u00fczellik", count: 2 }],
            });
        }
        if (parsed.pathname === "/api/kesfet") {
            return Response.json({
                total: 2,
                businesses: [
                    { id: "1", slug: "bir", name: "Bir", lat: 1, lng: 2, logoUrl: "/photo/1" },
                    { id: "2", slug: "iki", name: "\u0130ki", lat: 3, lng: 4, logoUrl: null },
                ],
            });
        }
        profileRequests.push({ pathname: parsed.pathname, method: options.method });
        return new Response(null, { status: 200 });
    };

    const report = await auditPublicSectors({
        baseUrl: "https://example.test",
        sectors: [{ id: "beauty", label: "G\u00fczellik" }],
        fetchImpl,
        concurrency: 2,
    });

    assert.equal(report.totals.businesses, 2);
    assert.equal(report.totals.profilesOk, 2);
    assert.equal(report.sectors[0].withPhoto, 1);
    assert.equal(report.sectors[0].missingRequiredFields, 0);
    assert.deepEqual(profileRequests, [
        { pathname: "/bir", method: "HEAD" },
        { pathname: "/iki", method: "HEAD" },
    ]);
});

test("auditPublicSectors retries transient profile request failures", async () => {
    let profileAttempts = 0;
    const fetchImpl = async (url) => {
        const parsed = new URL(url);
        if (parsed.pathname === "/api/kesfet/categories") {
            return Response.json({ categories: [{ id: "beauty", label: "Beauty", count: 1 }] });
        }
        if (parsed.pathname === "/api/kesfet") {
            return Response.json({
                total: 1,
                businesses: [{ id: "1", slug: "bir", name: "Bir", lat: 1, lng: 2 }],
            });
        }
        profileAttempts++;
        if (profileAttempts < 3) throw new Error("transient");
        return new Response(null, { status: 200 });
    };

    const report = await auditPublicSectors({
        baseUrl: "https://example.test",
        sectors: [{ id: "beauty", label: "Beauty" }],
        fetchImpl,
        profileRetries: 2,
        retryDelayMs: 0,
    });

    assert.equal(report.ok, true);
    assert.equal(profileAttempts, 3);
});
