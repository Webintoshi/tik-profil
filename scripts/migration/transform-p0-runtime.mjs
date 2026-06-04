import { Client } from "pg";
import {
    ensureRequiredEnv,
    loadEnvironment,
    maskDatabaseTarget,
    parseArgs,
    resolveFromRepo,
    toRepoRelativePath,
} from "./_shared.mjs";
import { readReconciliationManifest } from "./_reconciliation.mjs";
import {
    buildExpectedRuntimeCounts,
    buildRuntimeBusinessRow,
    detectHashScheme,
    extractBusinessModules,
    extractPermissionIds,
    getRuntimeBusinessImportDecision,
} from "./_runtime-p0.mjs";

const DEFAULT_RECONCILIATION_MANIFEST = "config/migration/p0-reconciliation.json";
const SYSTEM_ROLE_DEFINITIONS = [
    { role_key: "owner", display_name: "Owner", description: "Legacy business owner membership" },
    { role_key: "manager", display_name: "Manager", description: "Legacy manager membership" },
    { role_key: "staff", display_name: "Staff", description: "Legacy staff membership" },
];

function normalizeRoleKey(value) {
    const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (["owner", "manager", "staff"].includes(normalized)) {
        return normalized;
    }

    return "staff";
}

function isActiveFlag(value) {
    return value !== false;
}

function toAppUserStatus(isActive) {
    return isActive ? "active" : "disabled";
}

function toMembershipStatus(isActive) {
    return isActive ? "active" : "suspended";
}

function makeCredentialKey(subjectType, legacySubjectId) {
    return `${subjectType}:${legacySubjectId}`;
}

function buildSlugKey(slug) {
    return typeof slug === "string" ? slug.trim().toLowerCase() : "";
}

function assertUniqueBusinessSlugs(businessRows) {
    const slugToBusinessId = new Map();

    for (const business of businessRows) {
        const runtimeRow = buildRuntimeBusinessRow(business);
        const slugKey = buildSlugKey(runtimeRow.slug);

        if (!slugKey) {
            throw new Error(`Runtime business ${business.legacy_business_id} is missing a slug.`);
        }

        const previousBusinessId = slugToBusinessId.get(slugKey);
        if (previousBusinessId && previousBusinessId !== business.legacy_business_id) {
            throw new Error(
                `Duplicate case-insensitive business slug detected for ${business.legacy_business_id} and ${previousBusinessId}.`,
            );
        }

        slugToBusinessId.set(slugKey, business.legacy_business_id);
    }
}

async function fetchRows(client, tableName, orderByClause) {
    const result = await client.query(`SELECT * FROM ${tableName} ${orderByClause}`);
    return result.rows;
}

async function fetchArchiveSummary(client) {
    const result = await client.query(`
        SELECT collection, count(*)::int AS count
        FROM legacy_app_documents_archive
        GROUP BY collection
        ORDER BY collection ASC
    `);

    return result.rows;
}

async function loadExistingAppUsers(client) {
    const result = await client.query(`
        SELECT id, email, status
        FROM app_users
        WHERE email IS NOT NULL
    `);

    const map = new Map();
    for (const row of result.rows) {
        map.set(row.email.toLowerCase(), {
            id: row.id,
            status: row.status,
        });
    }

    return map;
}

async function loadExistingCredentialLinks(client) {
    const result = await client.query(`
        SELECT subject_type, legacy_subject_id, app_user_id
        FROM legacy_auth_credentials
        WHERE app_user_id IS NOT NULL
    `);

    const map = new Map();
    for (const row of result.rows) {
        map.set(makeCredentialKey(row.subject_type, row.legacy_subject_id), row.app_user_id);
    }

    return map;
}

async function ensureAppUser(client, caches, {
    subjectType,
    legacySubjectId,
    email,
    displayName,
    phone,
    isActive,
}) {
    const credentialKey = makeCredentialKey(subjectType, legacySubjectId);
    const credentialLinkedUserId = caches.credentialAppUsers.get(credentialKey);
    if (credentialLinkedUserId) {
        return credentialLinkedUserId;
    }

    const nowIso = new Date().toISOString();
    const normalizedEmail = typeof email === "string" && email.trim()
        ? email.trim().toLowerCase()
        : null;
    const desiredStatus = toAppUserStatus(isActive);

    if (normalizedEmail && caches.appUsersByEmail.has(normalizedEmail)) {
        const existing = caches.appUsersByEmail.get(normalizedEmail);
        const mergedStatus = existing.status === "active" || desiredStatus === "active"
            ? "active"
            : desiredStatus;

        await client.query(
            `
                UPDATE app_users
                SET display_name = COALESCE(display_name, $2),
                    phone = COALESCE(phone, $3),
                    status = $4,
                    updated_at = $5
                WHERE id = $1
            `,
            [existing.id, displayName ?? null, phone ?? null, mergedStatus, nowIso],
        );

        caches.appUsersByEmail.set(normalizedEmail, {
            id: existing.id,
            status: mergedStatus,
        });

        return existing.id;
    }

    const result = await client.query(
        `
            INSERT INTO app_users (
                email,
                display_name,
                phone,
                status,
                created_at,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $5)
            RETURNING id
        `,
        [normalizedEmail, displayName ?? null, phone ?? null, desiredStatus, nowIso],
    );

    const appUserId = result.rows[0].id;

    if (normalizedEmail) {
        caches.appUsersByEmail.set(normalizedEmail, {
            id: appUserId,
            status: desiredStatus,
        });
    }

    return appUserId;
}

async function ensurePlatformAdmin(client, appUserId, adminRole, isActive) {
    const nowIso = new Date().toISOString();
    await client.query(
        `
            INSERT INTO platform_admins (
                app_user_id,
                admin_role,
                is_active,
                created_at,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $4)
            ON CONFLICT (app_user_id) DO UPDATE SET
                admin_role = EXCLUDED.admin_role,
                is_active = EXCLUDED.is_active,
                updated_at = EXCLUDED.updated_at
        `,
        [appUserId, adminRole || "admin", isActive, nowIso],
    );
}

async function ensureBusinessRoles(client, caches, businessId) {
    if (caches.roleIdsByBusiness.has(businessId)) {
        return caches.roleIdsByBusiness.get(businessId);
    }

    const roleIds = {};
    const nowIso = new Date().toISOString();

    for (const definition of SYSTEM_ROLE_DEFINITIONS) {
        const result = await client.query(
            `
                INSERT INTO business_roles (
                    business_id,
                    role_key,
                    display_name,
                    description,
                    is_system,
                    created_at,
                    updated_at
                )
                VALUES ($1, $2, $3, $4, true, $5, $5)
                ON CONFLICT (business_id, role_key) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    description = EXCLUDED.description,
                    is_system = EXCLUDED.is_system,
                    updated_at = EXCLUDED.updated_at
                RETURNING id
            `,
            [businessId, definition.role_key, definition.display_name, definition.description, nowIso],
        );

        roleIds[definition.role_key] = result.rows[0].id;
    }

    caches.roleIdsByBusiness.set(businessId, roleIds);
    return roleIds;
}

async function upsertBusiness(client, businessRow) {
    await client.query(
        `
            INSERT INTO businesses (
                id,
                slug,
                previous_slugs,
                name,
                email,
                phone,
                whatsapp,
                status,
                package,
                package_id,
                plan_id,
                owner,
                industry_id,
                industry_label,
                active_module,
                logo,
                cover,
                slogan,
                about,
                address,
                maps_url,
                social_links,
                show_hours,
                working_hours,
                city,
                district,
                lat,
                lng,
                rating,
                review_count,
                is_verified,
                source,
                legacy_source,
                created_at,
                updated_at,
                imported_at
            )
            VALUES (
                $1, $2, $3::text[], $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                $16, $17, $18, $19, $20, $21, $22::jsonb, $23, $24::jsonb, $25, $26, $27,
                $28, $29, $30, $31, $32, $33::jsonb, $34, $35, $36
            )
            ON CONFLICT (id) DO UPDATE SET
                slug = EXCLUDED.slug,
                previous_slugs = EXCLUDED.previous_slugs,
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                whatsapp = EXCLUDED.whatsapp,
                status = EXCLUDED.status,
                package = EXCLUDED.package,
                package_id = EXCLUDED.package_id,
                plan_id = EXCLUDED.plan_id,
                owner = EXCLUDED.owner,
                industry_id = EXCLUDED.industry_id,
                industry_label = EXCLUDED.industry_label,
                active_module = EXCLUDED.active_module,
                logo = EXCLUDED.logo,
                cover = EXCLUDED.cover,
                slogan = EXCLUDED.slogan,
                about = EXCLUDED.about,
                address = EXCLUDED.address,
                maps_url = EXCLUDED.maps_url,
                social_links = EXCLUDED.social_links,
                show_hours = EXCLUDED.show_hours,
                working_hours = EXCLUDED.working_hours,
                city = EXCLUDED.city,
                district = EXCLUDED.district,
                lat = EXCLUDED.lat,
                lng = EXCLUDED.lng,
                rating = EXCLUDED.rating,
                review_count = EXCLUDED.review_count,
                is_verified = EXCLUDED.is_verified,
                source = EXCLUDED.source,
                legacy_source = EXCLUDED.legacy_source,
                created_at = EXCLUDED.created_at,
                updated_at = EXCLUDED.updated_at,
                imported_at = EXCLUDED.imported_at
        `,
        [
            businessRow.id,
            businessRow.slug,
            businessRow.previous_slugs,
            businessRow.name,
            businessRow.email,
            businessRow.phone,
            businessRow.whatsapp,
            businessRow.status,
            businessRow.package,
            businessRow.package_id,
            businessRow.plan_id,
            businessRow.owner,
            businessRow.industry_id,
            businessRow.industry_label,
            businessRow.active_module,
            businessRow.logo,
            businessRow.cover,
            businessRow.slogan,
            businessRow.about,
            businessRow.address,
            businessRow.maps_url,
            JSON.stringify(businessRow.social_links ?? {}),
            businessRow.show_hours,
            JSON.stringify(businessRow.working_hours ?? {}),
            businessRow.city,
            businessRow.district,
            businessRow.lat,
            businessRow.lng,
            businessRow.rating,
            businessRow.review_count,
            businessRow.is_verified,
            businessRow.source,
            JSON.stringify(businessRow.legacy_source ?? null),
            businessRow.created_at,
            businessRow.updated_at,
            businessRow.imported_at || new Date().toISOString(),
        ],
    );
}

async function upsertBusinessModules(client, businessId, modules) {
    const nowIso = new Date().toISOString();

    for (const moduleKey of modules) {
        await client.query(
            `
                INSERT INTO business_modules (
                    business_id,
                    module_key,
                    is_enabled,
                    source,
                    created_at,
                    updated_at
                )
                VALUES ($1, $2, true, 'legacy_businesses', $3, $3)
                ON CONFLICT (business_id, module_key) DO UPDATE SET
                    is_enabled = EXCLUDED.is_enabled,
                    source = EXCLUDED.source,
                    updated_at = EXCLUDED.updated_at
            `,
            [businessId, moduleKey, nowIso],
        );
    }
}

async function upsertStaffMember(client, runtimeBusinessId, appUserId, legacyStaffRow) {
    const roleKey = normalizeRoleKey(legacyStaffRow.staff_role);
    const permissionIds = extractPermissionIds(legacyStaffRow);
    const nowIso = new Date().toISOString();

    await client.query(
        `
            INSERT INTO staff_members (
                id,
                business_id,
                app_user_id,
                email,
                phone,
                name,
                role_key,
                permission_ids,
                is_active,
                last_login_at,
                created_at,
                updated_at,
                source,
                legacy_source
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8::text[], $9, $10, $11, $12, $13, $14::jsonb
            )
            ON CONFLICT (id) DO UPDATE SET
                business_id = EXCLUDED.business_id,
                app_user_id = EXCLUDED.app_user_id,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                name = EXCLUDED.name,
                role_key = EXCLUDED.role_key,
                permission_ids = EXCLUDED.permission_ids,
                is_active = EXCLUDED.is_active,
                last_login_at = EXCLUDED.last_login_at,
                updated_at = EXCLUDED.updated_at,
                source = EXCLUDED.source,
                legacy_source = EXCLUDED.legacy_source
        `,
        [
            legacyStaffRow.legacy_staff_id,
            runtimeBusinessId,
            appUserId,
            legacyStaffRow.email ?? null,
            legacyStaffRow.phone ?? null,
            legacyStaffRow.name ?? null,
            roleKey,
            permissionIds,
            isActiveFlag(legacyStaffRow.is_active),
            legacyStaffRow.last_login_at ?? null,
            legacyStaffRow.created_at ?? nowIso,
            legacyStaffRow.updated_at ?? nowIso,
            legacyStaffRow.source ?? "legacy_business_staff_credentials",
            JSON.stringify(legacyStaffRow.source_row ?? null),
        ],
    );

    return {
        staffMemberId: legacyStaffRow.legacy_staff_id,
        roleKey,
    };
}

async function upsertLegacyAuthCredential(client, caches, {
    subjectType,
    businessId,
    appUserId,
    staffMemberId,
    legacySubjectId,
    loginIdentifier,
    passwordHash,
    isActive,
    lastLoginAt,
    source,
    legacySource,
}) {
    const nowIso = new Date().toISOString();
    const hashInfo = detectHashScheme(passwordHash);

    await client.query(
        `
            INSERT INTO legacy_auth_credentials (
                subject_type,
                business_id,
                app_user_id,
                staff_member_id,
                legacy_subject_id,
                login_identifier,
                password_hash,
                hash_scheme,
                is_active,
                rehash_required,
                last_login_at,
                created_at,
                updated_at,
                source,
                legacy_source
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, $13, $14::jsonb
            )
            ON CONFLICT (subject_type, legacy_subject_id) DO UPDATE SET
                business_id = EXCLUDED.business_id,
                app_user_id = EXCLUDED.app_user_id,
                staff_member_id = EXCLUDED.staff_member_id,
                login_identifier = EXCLUDED.login_identifier,
                password_hash = EXCLUDED.password_hash,
                hash_scheme = EXCLUDED.hash_scheme,
                is_active = EXCLUDED.is_active,
                rehash_required = EXCLUDED.rehash_required,
                last_login_at = EXCLUDED.last_login_at,
                updated_at = EXCLUDED.updated_at,
                source = EXCLUDED.source,
                legacy_source = EXCLUDED.legacy_source
        `,
        [
            subjectType,
            businessId,
            appUserId,
            staffMemberId,
            legacySubjectId,
            loginIdentifier,
            passwordHash,
            hashInfo.hash_scheme,
            isActive,
            hashInfo.rehash_required,
            lastLoginAt ?? null,
            nowIso,
            source,
            JSON.stringify(legacySource ?? null),
        ],
    );

    caches.credentialAppUsers.set(makeCredentialKey(subjectType, legacySubjectId), appUserId);
}

async function upsertBusinessMembership(client, businessId, appUserId, roleId, isActive) {
    const nowIso = new Date().toISOString();
    await client.query(
        `
            INSERT INTO business_memberships (
                business_id,
                app_user_id,
                role_id,
                membership_status,
                created_at,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $5)
            ON CONFLICT (business_id, app_user_id) DO UPDATE SET
                role_id = EXCLUDED.role_id,
                membership_status = EXCLUDED.membership_status,
                updated_at = EXCLUDED.updated_at
        `,
        [businessId, appUserId, roleId, toMembershipStatus(isActive), nowIso],
    );
}

async function upsertQrScanEvent(client, runtimeBusinessId, legacyQrRow) {
    await client.query(
        `
            INSERT INTO qr_scan_events (
                legacy_qr_scan_id,
                business_id,
                business_slug,
                ip_hash,
                user_agent,
                scanned_at,
                created_at,
                source,
                legacy_source
            )
            VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now()), $8, $9::jsonb)
            ON CONFLICT (legacy_qr_scan_id) DO UPDATE SET
                business_id = EXCLUDED.business_id,
                business_slug = EXCLUDED.business_slug,
                ip_hash = EXCLUDED.ip_hash,
                user_agent = EXCLUDED.user_agent,
                scanned_at = EXCLUDED.scanned_at,
                source = EXCLUDED.source,
                legacy_source = EXCLUDED.legacy_source
        `,
        [
            legacyQrRow.legacy_qr_scan_id,
            runtimeBusinessId,
            legacyQrRow.business_slug ?? null,
            legacyQrRow.ip_hash ?? null,
            legacyQrRow.user_agent ?? null,
            legacyQrRow.scanned_at ?? null,
            legacyQrRow.created_at ?? null,
            legacyQrRow.source ?? "legacy_qr_scans",
            JSON.stringify(legacyQrRow.source_row ?? null),
        ],
    );
}

loadEnvironment();

const args = parseArgs();
const dryRun = Boolean(args["dry-run"]);
const databaseUrl = ensureRequiredEnv("DATABASE_URL");
const reconciliationManifestPath = resolveFromRepo(args["reconciliation-manifest"]) || resolveFromRepo(DEFAULT_RECONCILIATION_MANIFEST);
const client = new Client({
    connectionString: databaseUrl,
});

try {
    const reconciliationManifest = await readReconciliationManifest(reconciliationManifestPath);

    console.log(`Database target: ${maskDatabaseTarget(databaseUrl)}`);
    console.log(`Transform mode: ${dryRun ? "dry-run" : "apply"}`);
    console.log(`Reconciliation manifest: ${toRepoRelativePath(reconciliationManifest.filePath)}`);

    await client.connect();
    await client.query("BEGIN");

    const [
        businesses,
        admins,
        owners,
        staff,
        qrScans,
        archiveSummary,
    ] = await Promise.all([
        fetchRows(client, "legacy_businesses", "ORDER BY legacy_business_id ASC"),
        fetchRows(client, "legacy_admin_credentials", "ORDER BY legacy_admin_id ASC"),
        fetchRows(client, "legacy_business_owner_credentials", "ORDER BY legacy_owner_id ASC"),
        fetchRows(client, "legacy_business_staff_credentials", "ORDER BY legacy_staff_id ASC"),
        fetchRows(client, "legacy_qr_scans", "ORDER BY legacy_qr_scan_id ASC"),
        fetchArchiveSummary(client),
    ]);

    assertUniqueBusinessSlugs(businesses);

    const expectedCounts = buildExpectedRuntimeCounts({
        businesses,
        owners,
        staff,
        qrScans,
        admins,
        manifest: reconciliationManifest,
    });

    const canonicalBusinessIds = new Set(
        businesses.map((business) => business.legacy_business_id),
    );
    const caches = {
        appUsersByEmail: await loadExistingAppUsers(client),
        credentialAppUsers: await loadExistingCredentialLinks(client),
        roleIdsByBusiness: new Map(),
    };
    const counters = {
        businesses: 0,
        business_modules: 0,
        app_users: 0,
        platform_admins: 0,
        business_memberships: 0,
        staff_members: 0,
        legacy_auth_credentials: 0,
        qr_scan_events: 0,
        excluded_staff_rows: 0,
        excluded_qr_rows: 0,
    };

    for (const business of businesses) {
        const runtimeBusiness = buildRuntimeBusinessRow(business);
        await upsertBusiness(client, runtimeBusiness);
        counters.businesses += 1;

        const modules = extractBusinessModules(business);
        await upsertBusinessModules(client, runtimeBusiness.id, modules);
        counters.business_modules += modules.length;

        await ensureBusinessRoles(client, caches, runtimeBusiness.id);
    }

    for (const admin of admins) {
        const isActive = isActiveFlag(admin.is_active);
        const appUserId = await ensureAppUser(client, caches, {
            subjectType: "platform_admin",
            legacySubjectId: admin.legacy_admin_id,
            email: admin.email,
            displayName: admin.display_name || admin.username,
            phone: null,
            isActive,
        });

        await ensurePlatformAdmin(client, appUserId, admin.admin_role, isActive);
        await upsertLegacyAuthCredential(client, caches, {
            subjectType: "platform_admin",
            businessId: null,
            appUserId,
            staffMemberId: null,
            legacySubjectId: admin.legacy_admin_id,
            loginIdentifier: admin.username,
            passwordHash: admin.password_hash,
            isActive,
            lastLoginAt: admin.last_login_at,
            source: admin.source ?? "legacy_admin_credentials",
            legacySource: admin.source_row ?? null,
        });

        counters.platform_admins += 1;
        counters.legacy_auth_credentials += 1;
    }

    for (const staffRow of staff) {
        const decision = getRuntimeBusinessImportDecision({
            manifest: reconciliationManifest,
            entity: "business_staff",
            business_id: staffRow.business_id,
            canonicalBusinessIds,
        });

        if (decision.status === "excluded") {
            counters.excluded_staff_rows += 1;
            continue;
        }

        if (decision.status === "unresolved" || !decision.business_id) {
            throw new Error(`Unresolved business_staff runtime transform reference for ${staffRow.legacy_staff_id}.`);
        }

        const isActive = isActiveFlag(staffRow.is_active);
        const appUserId = await ensureAppUser(client, caches, {
            subjectType: "business_staff",
            legacySubjectId: staffRow.legacy_staff_id,
            email: staffRow.email,
            displayName: staffRow.name,
            phone: staffRow.phone,
            isActive,
        });
        const roleIds = await ensureBusinessRoles(client, caches, decision.business_id);
        const staffMember = await upsertStaffMember(client, decision.business_id, appUserId, staffRow);

        await upsertBusinessMembership(
            client,
            decision.business_id,
            appUserId,
            roleIds[staffMember.roleKey],
            isActive,
        );
        await upsertLegacyAuthCredential(client, caches, {
            subjectType: "business_staff",
            businessId: decision.business_id,
            appUserId,
            staffMemberId: staffMember.staffMemberId,
            legacySubjectId: staffRow.legacy_staff_id,
            loginIdentifier: staffRow.email ?? staffRow.legacy_staff_id,
            passwordHash: staffRow.password_hash,
            isActive,
            lastLoginAt: staffRow.last_login_at,
            source: staffRow.source ?? "legacy_business_staff_credentials",
            legacySource: staffRow.source_row ?? null,
        });

        counters.staff_members += 1;
        counters.business_memberships += 1;
        counters.legacy_auth_credentials += 1;
    }

    for (const ownerRow of owners) {
        if (!canonicalBusinessIds.has(ownerRow.business_id)) {
            throw new Error(`Owner ${ownerRow.legacy_owner_id} references missing business ${ownerRow.business_id}.`);
        }

        const isActive = isActiveFlag(ownerRow.is_active);
        const appUserId = await ensureAppUser(client, caches, {
            subjectType: "business_owner",
            legacySubjectId: ownerRow.legacy_owner_id,
            email: ownerRow.email,
            displayName: ownerRow.full_name,
            phone: ownerRow.normalized?.phone ?? null,
            isActive,
        });
        const roleIds = await ensureBusinessRoles(client, caches, ownerRow.business_id);

        await upsertBusinessMembership(
            client,
            ownerRow.business_id,
            appUserId,
            roleIds.owner,
            isActive,
        );
        await upsertLegacyAuthCredential(client, caches, {
            subjectType: "business_owner",
            businessId: ownerRow.business_id,
            appUserId,
            staffMemberId: null,
            legacySubjectId: ownerRow.legacy_owner_id,
            loginIdentifier: ownerRow.email ?? ownerRow.legacy_owner_id,
            passwordHash: ownerRow.password_hash,
            isActive,
            lastLoginAt: ownerRow.last_login_at,
            source: ownerRow.source ?? "legacy_business_owner_credentials",
            legacySource: ownerRow.source_row ?? null,
        });

        counters.business_memberships += 1;
        counters.legacy_auth_credentials += 1;
    }

    for (const qrRow of qrScans) {
        const decision = getRuntimeBusinessImportDecision({
            manifest: reconciliationManifest,
            entity: "qr_scans",
            business_id: qrRow.business_id,
            canonicalBusinessIds,
        });

        if (decision.status === "excluded") {
            counters.excluded_qr_rows += 1;
            continue;
        }

        if (decision.status === "unresolved" || !decision.business_id) {
            throw new Error(`Unresolved qr_scans runtime transform reference for ${qrRow.legacy_qr_scan_id}.`);
        }

        await upsertQrScanEvent(client, decision.business_id, qrRow);
        counters.qr_scan_events += 1;
    }

    if (dryRun) {
        await client.query("ROLLBACK");
    } else {
        await client.query("COMMIT");
    }

    const archiveSummaryText = archiveSummary
        .map((row) => `${row.collection}=${row.count}`)
        .join(", ");

    console.log(`Archive shadow rows read: ${archiveSummaryText || "none"}`);
    console.log(
        `Runtime transform summary: businesses=${counters.businesses}, business_modules=${counters.business_modules}, ` +
        `staff_members=${counters.staff_members}, memberships=${counters.business_memberships}, ` +
        `platform_admins=${counters.platform_admins}, credentials=${counters.legacy_auth_credentials}, ` +
        `qr_scan_events=${counters.qr_scan_events}`,
    );
    console.log(
        `Manifest exclusions applied: staff=${counters.excluded_staff_rows}, qr_scans=${counters.excluded_qr_rows}`,
    );
    console.log(
        `Expected counts: businesses=${expectedCounts.businesses}, business_modules=${expectedCounts.business_modules}, ` +
        `staff_members=${expectedCounts.staff_members}, memberships=${expectedCounts.business_memberships}, ` +
        `platform_admins=${expectedCounts.platform_admins}, qr_scan_events=${expectedCounts.qr_scan_events}`,
    );
    console.log(`Runtime transform ${dryRun ? "dry-run completed and rolled back." : "completed."}`);
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    try {
        await client.query("ROLLBACK");
    } catch {
        // noop
    }

    console.error(`Runtime transform failed: ${message}`);
    process.exitCode = 1;
} finally {
    await client.end().catch(() => {});
}
