import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";

import { query } from "../../db/query";
import { withTransaction, type TransactionQuery } from "../../db/transaction";
import type {
    BusinessSelfRegistrationRepository,
    BusinessSelfRegistrationResult,
    NormalizedBusinessSelfRegistrationInput,
} from "./businessSelfRegistration";
import { BusinessSelfRegistrationError } from "./businessSelfRegistration";

interface OwnerMembershipRow extends QueryResultRow {
    app_user_id: string;
    business_id: string;
    business_name: string;
    business_slug: string;
    email: null | string;
}

async function findOwnerWith(
    execute: TransactionQuery | typeof query,
    appUserId: string,
): Promise<BusinessSelfRegistrationResult | null> {
    const result = await execute<OwnerMembershipRow>(
        `SELECT membership.app_user_id,
                business.id AS business_id,
                business.name AS business_name,
                business.slug AS business_slug,
                app_user.email
         FROM business_memberships membership
         INNER JOIN businesses business ON business.id = membership.business_id
         INNER JOIN app_users app_user ON app_user.id = membership.app_user_id
         INNER JOIN business_roles role
           ON role.id = membership.role_id
          AND role.business_id = membership.business_id
          AND role.role_key = 'owner'
         WHERE membership.app_user_id = $1
           AND membership.membership_status = 'active'
         ORDER BY membership.created_at ASC
         LIMIT 1`,
        [appUserId],
    );
    const row = result.rows[0];
    if (!row) return null;

    return {
        appUserId: row.app_user_id,
        businessId: row.business_id,
        businessName: row.business_name,
        businessSlug: row.business_slug,
        email: row.email,
        enabledModules: [],
        logtoSub: "",
    };
}

async function allocateSlug(execute: TransactionQuery, baseSlug: string, businessId: string): Promise<string> {
    const existing = await execute(
        `SELECT 1 FROM businesses WHERE lower(slug) = lower($1) LIMIT 1`,
        [baseSlug],
    );
    if (existing.rows.length === 0) return baseSlug;
    return `${baseSlug.slice(0, 54).replace(/-+$/g, "")}-${businessId.replaceAll("-", "").slice(0, 8)}`;
}

async function createBusiness(
    input: NormalizedBusinessSelfRegistrationInput,
): Promise<BusinessSelfRegistrationResult> {
    return withTransaction(async ({ query: execute }) => {
        const identity = await execute(
            `SELECT app_user.id
             FROM app_users app_user
             INNER JOIN auth_provider_links provider_link
               ON provider_link.app_user_id = app_user.id
              AND provider_link.provider = 'logto'
              AND (provider_link.provider_user_id = $2 OR provider_link.logto_user_id = $2)
             WHERE app_user.id = $1
               AND app_user.status = 'active'
             LIMIT 2
             FOR UPDATE OF app_user, provider_link`,
            [input.appUserId, input.logtoSub],
        );
        if (identity.rows.length !== 1) {
            throw new BusinessSelfRegistrationError("identity_conflict");
        }

        const existing = await findOwnerWith(execute, input.appUserId);
        if (existing) return { ...existing, logtoSub: input.logtoSub };

        const businessId = randomUUID();
        const businessSlug = await allocateSlug(execute, input.baseSlug, businessId);
        await execute(
            `INSERT INTO businesses (
                id, slug, name, email, phone, whatsapp, status, package,
                owner, industry_id, industry_label, social_links, is_verified,
                source, created_at, updated_at
             ) VALUES (
                $1, $2, $3, $4, $5, $5, 'active', 'starter',
                $6, $7, $8, '{}'::jsonb, false,
                'self_registration', now(), now()
             )`,
            [
                businessId,
                businessSlug,
                input.businessName,
                input.email,
                input.phone,
                input.displayName,
                input.industryId,
                input.industryLabel,
            ],
        );
        const ownerRole = await execute<{ id: string }>(
            `INSERT INTO business_roles (
                business_id, role_key, display_name, description, is_system, created_at, updated_at
             ) VALUES ($1, 'owner', 'İşletme Sahibi', 'İşletmenin tam yetkili sahibi', true, now(), now())
             RETURNING id`,
            [businessId],
        );
        const roleId = ownerRole.rows[0]?.id;
        if (!roleId) throw new BusinessSelfRegistrationError("registration_failed");

        await execute(
            `INSERT INTO business_memberships (
                business_id, app_user_id, role_id, membership_status, created_at, updated_at
             ) VALUES ($1, $2, $3, 'active', now(), now())`,
            [businessId, input.appUserId, roleId],
        );

        return {
            appUserId: input.appUserId,
            businessId,
            businessName: input.businessName,
            businessSlug,
            email: input.email,
            enabledModules: [],
            logtoSub: input.logtoSub,
        };
    });
}

export function createQueryBackedBusinessSelfRegistrationRepository(): BusinessSelfRegistrationRepository {
    return {
        create: createBusiness,
        async findExistingOwner(appUserId) {
            return findOwnerWith(query, appUserId);
        },
    };
}
