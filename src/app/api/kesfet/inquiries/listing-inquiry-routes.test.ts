import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const route = (relative: string) => readFile(new URL(relative, import.meta.url), "utf8").catch(() => "");

test("listing inquiry routes expose options, customer history/create/cancel, and owner lifecycle", async () => {
    const [options, inquiries, cancel, owner] = await Promise.all([
        route("../listings/options/route.ts"),
        route("./route.ts"),
        route("./[id]/cancel/route.ts"),
        route("./owner/route.ts"),
    ]);

    assert.match(options, /handlers\.getOptions\(request\)/);
    assert.match(inquiries, /customerHandlers\.getInquiries\(\)/);
    assert.match(inquiries, /inquiryHandlers\.create\(request\)/);
    assert.match(cancel, /export async function PATCH/);
    assert.match(cancel, /handlers\.cancel\(id\)/);
    assert.match(owner, /requireBusinessMember/);
    assert.match(owner, /handlers\.listBusiness\(request\)/);
    assert.match(owner, /handlers\.updateBusinessStatus\(request\)/);
});

test("new listing routes use server repositories and guards rather than legacy web storage clients", async () => {
    const sources = await Promise.all([
        route("../listings/options/route.ts"), route("./route.ts"),
        route("./[id]/cancel/route.ts"), route("./owner/route.ts"),
    ]);
    const source = sources.join("\n");

    assert.match(source, /listingInquiryRepository/);
    assert.match(source, /requireCustomer/);
    assert.doesNotMatch(source, /getSupabase|getCollectionREST|app_documents|em_listings/);
});
