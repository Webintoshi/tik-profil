import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { ORDU_DISTRICTS } from "../../../server/business-imports/contracts.ts";

const root = process.cwd();

async function source(relativePath: string): Promise<string> {
    return readFile(path.join(root, relativePath), "utf8");
}

test("uses canonical Turkish Ordu district values accepted by the API", () => {
    assert.equal(ORDU_DISTRICTS.length, 19);
    assert.equal(ORDU_DISTRICTS.includes("Akkuş"), true);
    assert.equal(ORDU_DISTRICTS.includes("Altınordu"), true);
    assert.equal(ORDU_DISTRICTS.includes("Çatalpınar"), true);
    assert.equal(ORDU_DISTRICTS.includes("Ünye"), true);
    assert.equal(ORDU_DISTRICTS.some((district) => /Å|Ä|Ã/.test(district)), false);
});

test("server page enforces platform admin access and passes the API district contract", async () => {
    const page = await source("src/app/dashboard/businesses/import/page.tsx");

    assert.match(page, /requirePlatformAdmin\(\)/);
    assert.match(page, /redirect\("\/webintoshi"\)/);
    assert.match(page, /<BusinessImportClient districts=\{\[\.\.\.ORDU_DISTRICTS\]\}/);
});

test("workspace starts and polls a dry-run while rendering all six batch values", async () => {
    const client = await source("src/components/admin/business-imports/BusinessImportClient.tsx");

    assert.match(client, /\/api\/admin\/business-imports\/places\/petshops/);
    assert.match(client, /city:\s*"Ordu"/);
    assert.match(client, /districts:\s*selectedDistricts/);
    assert.match(client, /idempotencyKey/);
    assert.match(client, /\/api\/admin\/business-imports\/\$\{batchId\}/);
    for (const label of ["Durum", "Yeni aday", "Eşleşen", "Atlanan", "Başarısız", "İlçe kapsamı"]) {
        assert.match(client, new RegExp(label));
    }
    assert.match(client, /Google verileri canlı önizlemedir/);
});

test("candidate review separates live Google data from permanent sourced facts", async () => {
    const row = await source("src/components/admin/business-imports/CandidateReviewRow.tsx");

    assert.match(row, /Google canlı önizleme/);
    assert.match(row, /salt okunur/i);
    assert.match(row, /Tık Profil kalıcı bilgileri/);
    assert.match(row, /Google tarafından sağlanmıştır/);
    for (const sourceType of ["business_website", "business_submitted", "public_registry", "admin_verified"]) {
        assert.match(row, new RegExp(sourceType));
    }
    for (const field of ["name", "city", "district", "category", "address", "phone", "website"]) {
        assert.match(row, new RegExp(`fieldKey:\\s*"${field}"`));
    }
    for (const command of ["Reddet", "Mükerrer", "Onayla"]) {
        assert.match(row, new RegExp(command));
    }
    assert.match(row, /Onay için eksik:/);
    assert.match(row, /disabled=\{!approval\.complete/);
    assert.match(row, /İşlemi tekrar dene/);
});

test("operator errors cover stable statuses with retry affordances", async () => {
    const client = await source("src/components/admin/business-imports/BusinessImportClient.tsx");

    for (const status of [401, 403, 404, 409, 429, 502]) {
        assert.match(client, new RegExp(`${status}:`));
    }
    for (const message of [
        "Oturumunuz sona erdi",
        "Bu işlem için platform yöneticisi yetkisi gerekiyor",
        "İçe aktarma kaydı bulunamadı",
        "İşlem mevcut durumla çakıştı",
        "Google Places istek sınırına ulaşıldı",
        "Dış hizmet geçici olarak yanıt vermiyor",
    ]) {
        assert.match(client, new RegExp(message));
    }
    assert.match(client, /Yeniden dene/);
    assert.match(client, /Kurtarma denemesi başlat/);
});

test("one-time credentials stay in memory and acknowledge only explicit delivery", async () => {
    const client = await source("src/components/admin/business-imports/BusinessImportClient.tsx");
    const dialog = await source("src/components/admin/business-imports/OneTimeCredentialsDialog.tsx");
    const combined = `${client}\n${dialog}`;

    assert.match(client, /useState<ImmediateBusinessCredential\[\]>/);
    assert.match(client, /pagehide/);
    assert.match(client, /beforeunload/);
    assert.match(client, /setCredentials\(\[\]\)/);
    assert.match(client, /filter\(\(credential\) => credential\.deliveryGeneration !== deliveryGeneration\)/);

    assert.match(dialog, /Tek kullanımlık işletme giriş bilgileri/);
    assert.match(dialog, /Logto hesabı teslimat onaylanana kadar askıda kalır/);
    assert.match(dialog, /Giriş adresini kopyala/);
    assert.match(dialog, /Şifreyi kopyala/);
    assert.match(dialog, /Teslim edildi/);
    assert.match(dialog, /\/api\/admin\/businesses\/\$\{encodeURIComponent\(credential\.businessId\)\}\/credentials\/acknowledge/);
    assert.match(dialog, /deliveryGeneration:\s*credential\.deliveryGeneration/);
    assert.equal((dialog.match(/acknowledgeCredential\(/g) ?? []).length, 2);
    assert.match(dialog, /if \(!response\.ok\)[\s\S]*onAcknowledged\(credential\.deliveryGeneration\)/);

    assert.doesNotMatch(combined, /localStorage|sessionStorage|URLSearchParams|history\.pushState|history\.replaceState/);
    assert.doesNotMatch(combined, /console\.(?:log|info|debug)\s*\([^)]*credential/i);
    assert.doesNotMatch(combined, /\.csv\b|CSV|Dışa aktar|Export/);
});

test("credential dialog is modal, keyboard trapped, and restores focus", async () => {
    const dialog = await source("src/components/admin/business-imports/OneTimeCredentialsDialog.tsx");

    assert.match(dialog, /role="dialog"/);
    assert.match(dialog, /aria-modal="true"/);
    assert.match(dialog, /event\.key === "Escape"/);
    assert.match(dialog, /event\.key === "Tab"/);
    assert.match(dialog, /previouslyFocused\.focus\(\)/);
    assert.match(dialog, /aria-live="polite"/);
});

test("business list exposes the import entry action beside add business", async () => {
    const page = await source("src/app/dashboard/businesses/page.tsx");

    assert.match(page, /MapPinned/);
    assert.match(page, /href="\/dashboard\/businesses\/import"/);
    assert.match(page, /İşletme İçe Aktar/);
    assert.match(page, /Yeni İşletme Ekle/);
});
