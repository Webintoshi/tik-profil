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
import { buildExpectedRuntimeCounts } from "./_runtime-p0.mjs";

const DEFAULT_RECONCILIATION_MANIFEST = "config/migration/p0-reconciliation.json";

function makeResult({ check, status, expected = null, actual = null, details = {} }) {
    return { check, status, expected, actual, details };
}

async function fetchRows(client, tableName, orderByClause = "") {
    const result = await client.query(`SELECT * FROM ${tableName} ${orderByClause}`);
    return result.rows;
}

async function fetchCount(client, queryText, params = []) {
    const result = await client.query(queryText, params);
    return Number(result.rows[0]?.count ?? 0);
}

loadEnvironment();

const args = parseArgs();
const databaseUrl = ensureRequiredEnv("DATABASE_URL");
const reconciliationManifestPath = resolveFromRepo(args["reconciliation-manifest"]) || resolveFromRepo(DEFAULT_RECONCILIATION_MANIFEST);
const client = new Client({
    connectionString: databaseUrl,
});

try {
    const reconciliationManifest = await readReconciliationManifest(reconciliationManifestPath);

    console.log(`Database target: ${maskDatabaseTarget(databaseUrl)}`);
    console.log(`Reconciliation manifest: ${toRepoRelativePath(reconciliationManifest.filePath)}`);

    await client.connect();

    const [businesses, admins, owners, staff, qrScans] = await Promise.all([
        fetchRows(client, "legacy_businesses"),
        fetchRows(client, "legacy_admin_credentials"),
        fetchRows(client, "legacy_business_owner_credentials"),
        fetchRows(client, "legacy_business_staff_credentials"),
        fetchRows(client, "legacy_qr_scans"),
    ]);

    const expectedCounts = buildExpectedRuntimeCounts({
        businesses,
        owners,
        staff,
        qrScans,
        admins,
        manifest: reconciliationManifest,
    });
    const results = [];

    const businessesCount = await fetchCount(client, "SELECT count(*)::int AS count FROM businesses");
    results.push(makeResult({
        check: "business_count",
        status: businessesCount === expectedCounts.businesses ? "pass" : "fail",
        expected: expectedCounts.businesses,
        actual: businessesCount,
    }));

    const businessModulesCount = await fetchCount(client, "SELECT count(*)::int AS count FROM business_modules");
    results.push(makeResult({
        check: "business_modules_count",
        status: businessModulesCount === expectedCounts.business_modules ? "pass" : "fail",
        expected: expectedCounts.business_modules,
        actual: businessModulesCount,
    }));

    const appUsersCount = await fetchCount(client, "SELECT count(*)::int AS count FROM app_users");
    results.push(makeResult({
        check: "app_users_count_sane",
        status: appUsersCount < expectedCounts.app_users_minimum
            ? "fail"
            : appUsersCount === expectedCounts.app_users_minimum
                ? "pass"
                : "warn",
        expected: expectedCounts.app_users_minimum,
        actual: appUsersCount,
        details: {
            interpretation: "minimum distinct auth identities expected from admins, owners, and included staff",
        },
    }));

    const platformAdminsCount = await fetchCount(client, "SELECT count(*)::int AS count FROM platform_admins");
    results.push(makeResult({
        check: "platform_admins_count",
        status: platformAdminsCount === expectedCounts.platform_admins ? "pass" : "fail",
        expected: expectedCounts.platform_admins,
        actual: platformAdminsCount,
    }));

    const membershipsCount = await fetchCount(client, "SELECT count(*)::int AS count FROM business_memberships");
    results.push(makeResult({
        check: "business_memberships_count",
        status: membershipsCount === expectedCounts.business_memberships ? "pass" : "fail",
        expected: expectedCounts.business_memberships,
        actual: membershipsCount,
    }));

    const staffMembersCount = await fetchCount(client, "SELECT count(*)::int AS count FROM staff_members");
    results.push(makeResult({
        check: "staff_members_count",
        status: staffMembersCount === expectedCounts.staff_members ? "pass" : "fail",
        expected: expectedCounts.staff_members,
        actual: staffMembersCount,
    }));

    const qrScanEventsCount = await fetchCount(client, "SELECT count(*)::int AS count FROM qr_scan_events");
    results.push(makeResult({
        check: "qr_scan_events_count",
        status: qrScanEventsCount === expectedCounts.qr_scan_events ? "pass" : "fail",
        expected: expectedCounts.qr_scan_events,
        actual: qrScanEventsCount,
    }));

    const duplicateSlugCount = await fetchCount(
        client,
        `
            SELECT count(*)::int AS count
            FROM (
                SELECT lower(slug) AS slug_key
                FROM businesses
                GROUP BY lower(slug)
                HAVING count(*) > 1
            ) duplicates
        `,
    );
    results.push(makeResult({
        check: "slug_uniqueness_case_insensitive",
        status: duplicateSlugCount === 0 ? "pass" : "fail",
        expected: 0,
        actual: duplicateSlugCount,
    }));

    const modulesWithoutBusiness = await fetchCount(
        client,
        `
            SELECT count(*)::int AS count
            FROM business_modules module
            LEFT JOIN businesses business ON business.id = module.business_id
            WHERE business.id IS NULL
        `,
    );
    results.push(makeResult({
        check: "business_modules_without_business",
        status: modulesWithoutBusiness === 0 ? "pass" : "fail",
        expected: 0,
        actual: modulesWithoutBusiness,
    }));

    const staffWithoutBusiness = await fetchCount(
        client,
        `
            SELECT count(*)::int AS count
            FROM staff_members staff_member
            LEFT JOIN businesses business ON business.id = staff_member.business_id
            WHERE business.id IS NULL
        `,
    );
    results.push(makeResult({
        check: "staff_members_without_business",
        status: staffWithoutBusiness === 0 ? "pass" : "fail",
        expected: 0,
        actual: staffWithoutBusiness,
    }));

    const qrWithoutBusiness = await fetchCount(
        client,
        `
            SELECT count(*)::int AS count
            FROM qr_scan_events event
            LEFT JOIN businesses business ON business.id = event.business_id
            WHERE business.id IS NULL
        `,
    );
    results.push(makeResult({
        check: "qr_scan_events_without_business",
        status: qrWithoutBusiness === 0 ? "pass" : "fail",
        expected: 0,
        actual: qrWithoutBusiness,
    }));

    const invalidCredentials = await fetchCount(
        client,
        `
            SELECT count(*)::int AS count
            FROM legacy_auth_credentials credential
            LEFT JOIN app_users app_user ON app_user.id = credential.app_user_id
            LEFT JOIN businesses business ON business.id = credential.business_id
            LEFT JOIN staff_members staff_member ON staff_member.id = credential.staff_member_id
            WHERE app_user.id IS NULL
               OR (
                    credential.subject_type IN ('business_owner', 'business_staff')
                    AND business.id IS NULL
               )
               OR (
                    credential.subject_type = 'business_staff'
                    AND staff_member.id IS NULL
               )
        `,
    );
    results.push(makeResult({
        check: "legacy_auth_credentials_subject_links",
        status: invalidCredentials === 0 ? "pass" : "fail",
        expected: 0,
        actual: invalidCredentials,
    }));

    const duplicateBusinessModuleKeys = await fetchCount(
        client,
        `
            SELECT count(*)::int AS count
            FROM (
                SELECT business_id, module_key
                FROM business_modules
                GROUP BY business_id, module_key
                HAVING count(*) > 1
            ) duplicates
        `,
    );
    const duplicateCredentialKeys = await fetchCount(
        client,
        `
            SELECT count(*)::int AS count
            FROM (
                SELECT subject_type, legacy_subject_id
                FROM legacy_auth_credentials
                GROUP BY subject_type, legacy_subject_id
                HAVING count(*) > 1
            ) duplicates
        `,
    );
    const duplicateQrKeys = await fetchCount(
        client,
        `
            SELECT count(*)::int AS count
            FROM (
                SELECT legacy_qr_scan_id
                FROM qr_scan_events
                WHERE legacy_qr_scan_id IS NOT NULL
                GROUP BY legacy_qr_scan_id
                HAVING count(*) > 1
            ) duplicates
        `,
    );
    const duplicateStaffKeys = await fetchCount(
        client,
        `
            SELECT count(*)::int AS count
            FROM (
                SELECT id
                FROM staff_members
                GROUP BY id
                HAVING count(*) > 1
            ) duplicates
        `,
    );
    const idempotencyDuplicateCount = duplicateBusinessModuleKeys + duplicateCredentialKeys + duplicateQrKeys + duplicateStaffKeys;
    results.push(makeResult({
        check: "idempotency_unique_keys",
        status: idempotencyDuplicateCount === 0 ? "pass" : "fail",
        expected: 0,
        actual: idempotencyDuplicateCount,
        details: {
            duplicate_business_modules: duplicateBusinessModuleKeys,
            duplicate_credentials: duplicateCredentialKeys,
            duplicate_qr_events: duplicateQrKeys,
            duplicate_staff_members: duplicateStaffKeys,
        },
    }));

    results.push(makeResult({
        check: "manifest_excluded_rows",
        status: "pass",
        expected: expectedCounts.excluded_staff_rows + expectedCounts.excluded_qr_rows,
        actual: expectedCounts.excluded_staff_rows + expectedCounts.excluded_qr_rows,
        details: {
            excluded_staff_rows: expectedCounts.excluded_staff_rows,
            excluded_qr_rows: expectedCounts.excluded_qr_rows,
        },
    }));

    for (const result of results) {
        console.log(
            `${result.status.toUpperCase()} ${result.check}` +
            (result.expected !== null || result.actual !== null
                ? ` expected=${result.expected ?? "n/a"} actual=${result.actual ?? "n/a"}`
                : ""),
        );
    }

    const failCount = results.filter((result) => result.status === "fail").length;
    const warnCount = results.filter((result) => result.status === "warn").length;
    console.log(`Runtime validation summary: fail=${failCount} warn=${warnCount}`);

    if (failCount > 0) {
        process.exitCode = 1;
    }
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Runtime validation failed: ${message}`);
    process.exitCode = 1;
} finally {
    await client.end().catch(() => {});
}
