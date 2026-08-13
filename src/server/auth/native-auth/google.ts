import { OAuth2Client, type TokenPayload } from "google-auth-library";

export interface VerifiedGoogleIdentity {
    avatarUrl: string | null;
    displayName: string | null;
    email: string;
    providerSubject: string;
}

export interface GoogleIdentityVerifier {
    verify(idToken: string): Promise<VerifiedGoogleIdentity>;
}

export function mapGoogleTokenPayload(payload: TokenPayload | undefined): VerifiedGoogleIdentity {
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        throw new Error("Google identity token is missing a verified email.");
    }
    return {
        avatarUrl: payload.picture?.trim() || null,
        displayName: payload.name?.trim() || null,
        email: payload.email.trim().toLocaleLowerCase("en-US"),
        providerSubject: payload.sub,
    };
}

export function createGoogleIdentityVerifier(clientIds: readonly string[]): GoogleIdentityVerifier {
    const audiences = clientIds.map((value) => value.trim()).filter(Boolean);
    if (audiences.length === 0) {
        throw new Error("GOOGLE_AUTH_CLIENT_IDS must include at least one OAuth web client ID.");
    }
    const client = new OAuth2Client();
    return {
        async verify(idToken: string) {
            const ticket = await client.verifyIdToken({ audience: audiences, idToken });
            return mapGoogleTokenPayload(ticket.getPayload());
        },
    };
}

export function getGoogleAuthClientIds(): string[] {
    return (process.env.GOOGLE_AUTH_CLIENT_IDS ?? process.env.GOOGLE_AUTH_CLIENT_ID ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
}

let verifier: GoogleIdentityVerifier | null = null;

export function verifyGoogleIdentity(idToken: string): Promise<VerifiedGoogleIdentity> {
    verifier ??= createGoogleIdentityVerifier(getGoogleAuthClientIds());
    return verifier.verify(idToken);
}
