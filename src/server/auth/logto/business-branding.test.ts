import assert from "node:assert/strict";
import test from "node:test";
import {
    BUSINESS_LOGTO_CUSTOM_CSS,
    buildBusinessAuthenticationPayload,
    buildBusinessBrandingPayload,
    summarizeBrandingConfiguration,
} from "./business-branding";

test("requires verified email, password and an unverified profile phone without username", () => {
    const payload = buildBusinessAuthenticationPayload();

    assert.deepEqual(payload.signIn.methods, [
        { identifier: "email", isPasswordPrimary: true, password: true, verificationCode: false },
    ]);
    assert.deepEqual(payload.signUp, {
        identifiers: ["email"],
        password: true,
        secondaryIdentifiers: [{ identifier: "phone", verify: false }],
        verify: true,
    });
    assert.equal(payload.signInMode, "SignInAndRegister");
    assert.doesNotMatch(JSON.stringify(payload), /username/);
});

test("builds the amber Tik Profil application branding payload", () => {
    const payload = buildBusinessBrandingPayload("https://tikprofil.com/");

    assert.deepEqual(payload.color, {
        darkPrimaryColor: "#FFB347",
        isDarkModeEnabled: false,
        primaryColor: "#FFB347",
    });
    assert.equal(payload.signInMode, "SignInAndRegister");
    assert.equal(payload.displayName, "Tık Profil İşletme");
    assert.equal(payload.branding.logoUrl, "https://tikprofil.com/brand/tik-business-wordmark.png");
    assert.equal(payload.branding.favicon, "https://tikprofil.com/brand/tik-business-favicon.svg");
    assert.equal(payload.privacyPolicyUrl, "https://tikprofil.com/gizlilik-politikasi");
    assert.equal(payload.termsOfUseUrl, "https://tikprofil.com/kullanim-sartlari");
});

test("custom CSS styles the Logto form and removes consumer actions", () => {
    for (const token of ["#FFB347", "#F6A52F", "#FAF8F4", "#211A12", "#6F665C", "#E7DED3"]) {
        assert.match(BUSINESS_LOGTO_CUSTOM_CSS, new RegExp(token, "i"));
    }

    assert.match(BUSINESS_LOGTO_CUSTOM_CSS, /focus-visible/);
    assert.doesNotMatch(BUSINESS_LOGTO_CUSTOM_CSS, /a\[href\^=["']\\?\/register/);
    assert.match(BUSINESS_LOGTO_CUSTOM_CSS, /button:has\(img\[alt\*=["']google/i);
    assert.match(BUSINESS_LOGTO_CUSTOM_CSS, /div\[class\*=["']divider/);
    assert.match(BUSINESS_LOGTO_CUSTOM_CSS, /logto\.io/i);
    assert.match(BUSINESS_LOGTO_CUSTOM_CSS, /@media \(max-width: 480px\)/);
});

test("focused Logto inputs do not float their placeholder over the border", () => {
    assert.match(BUSINESS_LOGTO_CUSTOM_CSS, /\[class\*=["']_active["']\]:has\(input\) label/);
    assert.match(BUSINESS_LOGTO_CUSTOM_CSS, /opacity:\s*0\s*!important/);
    assert.match(BUSINESS_LOGTO_CUSTOM_CSS, /fieldset legend/);
    assert.match(BUSINESS_LOGTO_CUSTOM_CSS, /max-width:\s*0\s*!important/);
});

test("inspection summaries do not serialize credentials", () => {
    const summary = summarizeBrandingConfiguration({
        access_token: "secret-token",
        applicationId: "business-app",
        branding: { logoUrl: "https://tikprofil.com/logo.svg" },
        client_secret: "secret-client",
        color: { primaryColor: "#FFB347" },
        customCss: "body {}",
        displayName: "Tık Profil İşletme",
        signInMode: "SignIn",
    });
    const serialized = JSON.stringify(summary);

    assert.doesNotMatch(serialized, /secret-token|secret-client|access_token|client_secret/);
    assert.equal(summary.applicationId, "business-app");
    assert.equal(summary.customCssLength, 7);
});
