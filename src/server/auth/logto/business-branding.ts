import { createHash } from "node:crypto";

export const BUSINESS_LOGTO_CUSTOM_CSS = `
:root {
  color-scheme: light;
  font-family: "Jost", "Avenir Next", "Segoe UI", sans-serif;
}

html,
body,
#app {
  min-height: 100%;
  background: #FAF8F4 !important;
  color: #211A12 !important;
}

body {
  margin: 0;
}

#app main[class*="main"] {
  box-sizing: border-box;
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 32px 16px !important;
}

#app main[class*="main"] > div[class*="wrapper"] {
  box-sizing: border-box;
  width: min(100%, 408px) !important;
  margin: 0 auto !important;
  padding: 32px !important;
  border: 1px solid #E7DED3 !important;
  border-radius: 8px !important;
  background: #FFFFFF !important;
  box-shadow: 0 18px 48px rgba(33, 26, 18, 0.08) !important;
}

#app img[class*="logo"] {
  width: auto !important;
  max-width: 124px !important;
  max-height: 52px !important;
  margin-bottom: 24px !important;
}

#app h1,
#app h2,
#app h3,
#app label,
#app [class*="title"] {
  color: #211A12 !important;
  letter-spacing: 0 !important;
}

#app p,
#app [class*="description"],
#app [class*="subtitle"] {
  color: #6F665C !important;
}

#app input {
  box-sizing: border-box;
  min-height: 52px !important;
  border: 1px solid #E7DED3 !important;
  border-radius: 8px !important;
  background: #FFFFFF !important;
  color: #211A12 !important;
  box-shadow: none !important;
}

#app input:hover {
  border-color: #D7C8B7 !important;
}

#app input:focus,
#app input:focus-visible {
  border-color: #FFB347 !important;
  outline: 2px solid rgba(255, 179, 71, 0.34) !important;
  outline-offset: 1px !important;
  box-shadow: none !important;
}

#app [class*="_container"]:has(input) label {
  transition: opacity 120ms ease !important;
}

#app [class*="_active"]:has(input) label {
  top: 50% !important;
  font-size: 14px !important;
  opacity: 0 !important;
  transform: translateY(-50%) !important;
}

#app [class*="_active"]:has(input) fieldset legend {
  width: 0 !important;
  max-width: 0 !important;
  padding: 0 !important;
}

#app [class*="_active"]:has(input) fieldset legend > span {
  display: none !important;
}

#app button[type="submit"] {
  min-height: 50px !important;
  border: 1px solid #FFB347 !important;
  border-radius: 8px !important;
  background: #FFB347 !important;
  color: #211A12 !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
  box-shadow: none !important;
  transition: background-color 160ms ease, transform 160ms ease !important;
}

#app button[type="submit"]:hover {
  background: #F6A52F !important;
}

#app button[type="submit"]:active {
  transform: translateY(1px) !important;
}

#app button:focus-visible,
#app a:focus-visible {
  outline: 2px solid #FFB347 !important;
  outline-offset: 2px !important;
}

#app [class*="error"],
#app [role="alert"] {
  color: #C93D36 !important;
}

#app main button:has(img[alt*="google" i]),
#app main div:has(> button img[alt*="google" i]),
#app main div[class*="divider"],
#app main a[href*="logto.io"] {
  display: none !important;
}

@media (max-width: 480px) {
  #app main[class*="main"] {
    align-items: flex-start;
    padding: 20px 12px !important;
  }

  #app main[class*="main"] > div[class*="wrapper"] {
    width: 100% !important;
    padding: 24px 18px !important;
  }

  #app input,
  #app button[type="submit"] {
    width: 100% !important;
  }
}
`;

export interface BusinessBrandingPayload {
    branding: {
        darkFavicon: string;
        darkLogoUrl: string;
        favicon: string;
        logoUrl: string;
    };
    color: {
        darkPrimaryColor: string;
        isDarkModeEnabled: boolean;
        primaryColor: string;
    };
    customCss: string;
    displayName: string;
    privacyPolicyUrl: string;
    signInMode: "SignInAndRegister";
    termsOfUseUrl: string;
}

export interface BusinessAuthenticationPayload {
    signIn: {
        methods: Array<{
            identifier: "email" | "phone";
            isPasswordPrimary: true;
            password: true;
            verificationCode: false;
        }>;
    };
    signInMode: "SignInAndRegister";
    signUp: {
        identifiers: ["phone"];
        password: true;
        secondaryIdentifiers: [{
            identifier: "email";
            verify: true;
        }];
        verify: true;
    };
}

export function buildBusinessAuthenticationPayload(): BusinessAuthenticationPayload {
    return {
        signIn: {
            methods: [
                {
                    identifier: "email",
                    isPasswordPrimary: true,
                    password: true,
                    verificationCode: false,
                },
                {
                    identifier: "phone",
                    isPasswordPrimary: true,
                    password: true,
                    verificationCode: false,
                },
            ],
        },
        signInMode: "SignInAndRegister",
        signUp: {
            identifiers: ["phone"],
            password: true,
            secondaryIdentifiers: [{ identifier: "email", verify: true }],
            verify: true,
        },
    };
}

function normalizeBaseUrl(baseUrl: string): string {
    return new URL(baseUrl).origin;
}

export function buildBusinessBrandingPayload(baseUrl: string): BusinessBrandingPayload {
    const origin = normalizeBaseUrl(baseUrl);
    const logoUrl = `${origin}/brand/tik-business-wordmark.png`;
    const favicon = `${origin}/brand/tik-business-favicon.svg`;

    return {
        branding: {
            darkFavicon: favicon,
            darkLogoUrl: logoUrl,
            favicon,
            logoUrl,
        },
        color: {
            darkPrimaryColor: "#FFB347",
            isDarkModeEnabled: false,
            primaryColor: "#FFB347",
        },
        customCss: BUSINESS_LOGTO_CUSTOM_CSS,
        displayName: "Tık Profil İşletme",
        privacyPolicyUrl: `${origin}/gizlilik-politikasi`,
        signInMode: "SignInAndRegister",
        termsOfUseUrl: `${origin}/kullanim-sartlari`,
    };
}

export interface BrandingConfigurationSummary {
    applicationId: string | null;
    branding: unknown;
    color: unknown;
    customCssLength: number;
    customCssSha256: string | null;
    displayName: string | null;
    signInMode: string | null;
}

export function summarizeBrandingConfiguration(
    configuration: Record<string, unknown> | null | undefined,
): BrandingConfigurationSummary {
    const customCss = typeof configuration?.customCss === "string" ? configuration.customCss : "";

    return {
        applicationId: typeof configuration?.applicationId === "string" ? configuration.applicationId : null,
        branding: configuration?.branding ?? null,
        color: configuration?.color ?? null,
        customCssLength: customCss.length,
        customCssSha256: customCss
            ? createHash("sha256").update(customCss).digest("hex")
            : null,
        displayName: typeof configuration?.displayName === "string" ? configuration.displayName : null,
        signInMode: typeof configuration?.signInMode === "string" ? configuration.signInMode : null,
    };
}
