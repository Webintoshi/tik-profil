import { query } from '../db/query';

type PilotAccount = { email: string; verified: boolean };
async function loadAccount(ownerId: string): Promise<PilotAccount | null> {
    const result = await query<{email: string; verified: boolean}>(
        "SELECT email, (email_verified_at IS NOT NULL) AS verified FROM app_users WHERE id = $1 AND status = 'active' LIMIT 1",
        [ownerId],
    );
    return result.rows[0] ?? null;
}
export async function isPilotAccount(
    verifiedOwnerId: string | null,
    env: Record<string, string | undefined> = process.env,
    readAccount = loadAccount,
): Promise<boolean> {
    if (!verifiedOwnerId) return false;
    const ids = (env.TOSHI_360_TEST_ACCOUNT_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean);
    if (ids.includes(verifiedOwnerId)) return true;
    const emails = (env.TOSHI_360_TEST_ACCOUNT_EMAILS ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (!emails.length) return false;
    const account = await readAccount(verifiedOwnerId);
    return !!account?.verified && emails.includes(account.email.trim().toLowerCase());
}
