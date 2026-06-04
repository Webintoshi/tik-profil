import { resolveReconciliationDisposition } from "./_reconciliation.mjs";
import { normalizeStringArray, pickFirstString, toIsoOrNull } from "./_shared.mjs";

function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function asBoolean(value) {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "yes", "active"].includes(normalized)) {
            return true;
        }

        if (["false", "0", "no", "inactive", "disabled"].includes(normalized)) {
            return false;
        }
    }

    return null;
}

export function uniqueStrings(values, { lowerCase = false } = {}) {
    const unique = [];
    const seen = new Set();

    for (const value of values) {
        if (typeof value !== "string") {
            continue;
        }

        const trimmed = value.trim();
        if (!trimmed) {
            continue;
        }

        const normalized = lowerCase ? trimmed.toLowerCase() : trimmed;
        if (seen.has(normalized)) {
            continue;
        }

        seen.add(normalized);
        unique.push(normalized);
    }

    return unique;
}

export function detectHashScheme(hash) {
    const value = typeof hash === "string" ? hash.trim() : "";

    if (value.startsWith("$2")) {
        return {
            hash_scheme: "bcrypt",
            rehash_required: false,
        };
    }

    if (/^[0-9a-f]+:[0-9a-f]+$/i.test(value)) {
        return {
            hash_scheme: "pbkdf2_like",
            rehash_required: false,
        };
    }

    if (/^[A-Za-z0-9+/=]+$/.test(value)) {
        return {
            hash_scheme: "legacy_base64_family",
            rehash_required: true,
        };
    }

    return {
        hash_scheme: "unknown",
        rehash_required: true,
    };
}

export function extractBusinessModules(legacyBusinessRow) {
    const normalized = isRecord(legacyBusinessRow?.normalized) ? legacyBusinessRow.normalized : {};
    const sourceRow = isRecord(legacyBusinessRow?.source_row) ? legacyBusinessRow.source_row : {};
    const nestedData = isRecord(sourceRow.data) ? sourceRow.data : {};

    const normalizedModules = normalizeStringArray(normalized.modules);
    const sourceModules = normalizeStringArray(sourceRow.modules);
    const nestedModules = normalizeStringArray(nestedData.modules);
    const firstAvailable = normalizedModules.length > 0
        ? normalizedModules
        : sourceModules.length > 0
            ? sourceModules
            : nestedModules;

    return uniqueStrings(firstAvailable, { lowerCase: true });
}

export function extractPermissionIds(legacyStaffRow) {
    return uniqueStrings(normalizeStringArray(legacyStaffRow?.permissions), { lowerCase: false });
}

export function resolveRuntimeBusinessReference({
    manifest,
    entity,
    business_id,
    canonicalBusinessIds,
}) {
    const businessId = asString(business_id);
    if (!businessId) {
        return {
            business_id: null,
            excluded: true,
            mapping_applied: false,
            exclusion_reason: "missing_business_id",
        };
    }

    if (canonicalBusinessIds.has(businessId)) {
        return {
            business_id: businessId,
            excluded: false,
            mapping_applied: false,
            exclusion_reason: null,
        };
    }

    const disposition = resolveReconciliationDisposition(manifest, entity, businessId);

    if (disposition.status === "mapped" && disposition.mapping_target) {
        return {
            business_id: disposition.mapping_target,
            excluded: false,
            mapping_applied: true,
            exclusion_reason: null,
        };
    }

    if (disposition.status === "archive_only" && disposition.exclude_from_runtime_import) {
        return {
            business_id: null,
            excluded: true,
            mapping_applied: false,
            exclusion_reason: "archive_only",
        };
    }

    return {
        business_id: businessId,
        excluded: false,
        mapping_applied: false,
        exclusion_reason: null,
    };
}

export function getRuntimeBusinessImportDecision(input) {
    const reference = resolveRuntimeBusinessReference(input);
    const canonicalBusinessIds = input.canonicalBusinessIds;
    const originalBusinessId = asString(input.business_id);

    if (reference.excluded) {
        return {
            ...reference,
            status: "excluded",
        };
    }

    if (!originalBusinessId) {
        return {
            ...reference,
            status: "unresolved",
        };
    }

    if (reference.mapping_applied) {
        return {
            ...reference,
            status: "mapped",
        };
    }

    if (canonicalBusinessIds.has(originalBusinessId)) {
        return {
            ...reference,
            status: "canonical",
        };
    }

    return {
        ...reference,
        status: "unresolved",
    };
}

export function mergeLegacyBusinessFields(legacyBusinessRow) {
    const normalized = isRecord(legacyBusinessRow?.normalized) ? legacyBusinessRow.normalized : {};
    const sourceRow = isRecord(legacyBusinessRow?.source_row) ? legacyBusinessRow.source_row : {};
    const nestedData = isRecord(sourceRow.data) ? sourceRow.data : {};
    const deepData = isRecord(nestedData.data) ? nestedData.data : {};

    return {
        ...deepData,
        ...nestedData,
        ...normalized,
        ...sourceRow,
    };
}

export function extractPreviousSlugs(legacyBusinessRow) {
    const fields = mergeLegacyBusinessFields(legacyBusinessRow);
    return uniqueStrings([
        ...(Array.isArray(fields.previous_slugs) ? fields.previous_slugs : []),
        ...(Array.isArray(fields.previousSlugs) ? fields.previousSlugs : []),
    ], { lowerCase: true });
}

export function extractSocialLinks(legacyBusinessRow) {
    const fields = mergeLegacyBusinessFields(legacyBusinessRow);
    const socialLinks = isRecord(fields.socialLinks) ? fields.socialLinks : {};
    const social = isRecord(fields.social) ? fields.social : {};

    return {
        website: asString(socialLinks.website) || asString(social.website),
        instagram: asString(socialLinks.instagram) || asString(social.instagram),
        youtube: asString(socialLinks.youtube) || asString(social.youtube),
        google: asString(socialLinks.google) || asString(social.google),
        facebook: asString(socialLinks.facebook) || asString(social.facebook),
        twitter: asString(socialLinks.twitter) || asString(social.twitter),
        tiktok: asString(socialLinks.tiktok) || asString(social.tiktok),
        linkedin: asString(socialLinks.linkedin) || asString(social.linkedin),
        whatsapp: asString(socialLinks.whatsapp) || asString(social.whatsapp),
    };
}

export function extractBusinessCoordinates(legacyBusinessRow) {
    const fields = mergeLegacyBusinessFields(legacyBusinessRow);
    const location = isRecord(fields.location) ? fields.location : {};

    return {
        lat: asNumber(location.lat) ?? asNumber(fields.lat),
        lng: asNumber(location.lng) ?? asNumber(fields.lng),
    };
}

export function buildRuntimeBusinessRow(legacyBusinessRow) {
    const fields = mergeLegacyBusinessFields(legacyBusinessRow);
    const coordinates = extractBusinessCoordinates(legacyBusinessRow);
    const socialLinks = extractSocialLinks(legacyBusinessRow);
    const modules = extractBusinessModules(legacyBusinessRow);

    return {
        id: legacyBusinessRow.legacy_business_id,
        slug: pickFirstString(fields.slug, legacyBusinessRow.slug, legacyBusinessRow.legacy_business_id),
        previous_slugs: extractPreviousSlugs(legacyBusinessRow),
        name: pickFirstString(fields.name, legacyBusinessRow.name, legacyBusinessRow.legacy_business_id),
        email: pickFirstString(fields.email),
        phone: pickFirstString(fields.phone),
        whatsapp: pickFirstString(fields.whatsapp, socialLinks.whatsapp, fields.phone),
        status: pickFirstString(fields.status, legacyBusinessRow.status) || "active",
        package: pickFirstString(fields.package),
        package_id: pickFirstString(fields.package_id, fields.packageId),
        plan_id: pickFirstString(fields.plan_id, fields.planId),
        owner: pickFirstString(fields.owner),
        industry_id: pickFirstString(fields.industry_id, fields.industryId),
        industry_label: pickFirstString(fields.industry_label, fields.industryLabel),
        active_module: pickFirstString(fields.active_module, fields.activeModule, modules[0]),
        logo: pickFirstString(fields.logo),
        cover: pickFirstString(fields.cover),
        slogan: pickFirstString(fields.slogan),
        about: pickFirstString(fields.about),
        address: pickFirstString(fields.address),
        maps_url: pickFirstString(fields.maps_url, fields.mapsUrl),
        social_links: socialLinks,
        show_hours: asBoolean(fields.showHours) ?? false,
        working_hours: Array.isArray(fields.workingHours) ? fields.workingHours : (
            Array.isArray(fields.working_hours) ? fields.working_hours : {}
        ),
        city: pickFirstString(fields.city),
        district: pickFirstString(fields.district),
        lat: coordinates.lat,
        lng: coordinates.lng,
        rating: asNumber(fields.rating),
        review_count: asNumber(fields.reviewCount) ?? asNumber(fields.review_count) ?? 0,
        is_verified: asBoolean(fields.isVerified) ?? asBoolean(fields.is_verified) ?? false,
        source: "legacy_staging",
        legacy_source: legacyBusinessRow.source_row ?? null,
        created_at: toIsoOrNull(legacyBusinessRow.created_at ?? fields.created_at ?? fields.createdAt),
        updated_at: toIsoOrNull(legacyBusinessRow.updated_at ?? fields.updated_at ?? fields.updatedAt),
        imported_at: toIsoOrNull(legacyBusinessRow.imported_at),
    };
}

export function buildExpectedRuntimeCounts({
    businesses,
    owners,
    staff,
    qrScans,
    admins,
    manifest,
}) {
    const canonicalBusinessIds = new Set(
        businesses
            .map((row) => asString(row.legacy_business_id))
            .filter(Boolean),
    );

    const businessModules = businesses.reduce(
        (count, business) => count + extractBusinessModules(business).length,
        0,
    );

    const includedStaff = staff.filter((row) => {
        const decision = getRuntimeBusinessImportDecision({
            manifest,
            entity: "business_staff",
            business_id: row.business_id,
            canonicalBusinessIds,
        });
        return decision.status !== "excluded" && decision.status !== "unresolved";
    });

    const includedQrScans = qrScans.filter((row) => {
        const decision = getRuntimeBusinessImportDecision({
            manifest,
            entity: "qr_scans",
            business_id: row.business_id,
            canonicalBusinessIds,
        });
        return decision.status !== "excluded" && decision.status !== "unresolved";
    });

    const ownerMemberships = owners.filter((row) => canonicalBusinessIds.has(row.business_id)).length;
    const staffMemberships = includedStaff.length;
    const appUserKeys = new Set();

    for (const admin of admins) {
        const key = asString(admin.email)?.toLowerCase() || `admin:${String(admin.legacy_admin_id)}`;
        appUserKeys.add(key);
    }

    for (const owner of owners) {
        const email = asString(owner.email);
        if (email) {
            appUserKeys.add(email.toLowerCase());
        }
    }

    for (const staffMember of includedStaff) {
        const email = asString(staffMember.email);
        if (email) {
            appUserKeys.add(email.toLowerCase());
        }
    }

    return {
        businesses: businesses.length,
        business_modules: businessModules,
        app_users_minimum: appUserKeys.size,
        platform_admins: admins.length,
        business_memberships: ownerMemberships + staffMemberships,
        staff_members: includedStaff.length,
        qr_scan_events: includedQrScans.length,
        excluded_staff_rows: staff.length - includedStaff.length,
        excluded_qr_rows: qrScans.length - includedQrScans.length,
    };
}
