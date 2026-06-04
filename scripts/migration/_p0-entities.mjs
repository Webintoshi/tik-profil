import {
    normalizeBoolean,
    normalizeStringArray,
    pickFirstString,
    toIsoOrNull,
} from "./_shared.mjs";

export const entityTableMap = {
    businesses: "legacy_businesses",
    admins: "legacy_admin_credentials",
    business_owners: "legacy_business_owner_credentials",
    business_staff: "legacy_business_staff_credentials",
    qr_scans: "legacy_qr_scans",
    app_documents_archive: "legacy_app_documents_archive",
};

export function getEntityPrimaryId(entity, row) {
    switch (entity) {
        case "businesses":
            return pickFirstString(row.id, row.business_id);
        case "admins":
            return pickFirstString(row.id, row.username);
        case "business_owners":
            return pickFirstString(row.id, row.owner_id, row.email);
        case "business_staff":
            return pickFirstString(row.id, row.staff_id, row.email);
        case "qr_scans":
            return pickFirstString(row.id);
        case "app_documents_archive":
            return pickFirstString(row.document_id);
        default:
            return null;
    }
}

export function getBusinessReference(entity, row) {
    switch (entity) {
        case "businesses":
            return pickFirstString(row.id, row.business_id);
        case "business_owners":
            return pickFirstString(row.business_id, row.businessId);
        case "business_staff":
            return pickFirstString(row.business_id, row.businessId);
        case "qr_scans":
            return pickFirstString(row.business_id, row.businessId);
        default:
            return null;
    }
}

export function toStageRecord(entity, row) {
    switch (entity) {
        case "businesses":
            return {
                legacy_business_id: pickFirstString(row.id, row.business_id),
                slug: pickFirstString(row.slug),
                name: pickFirstString(row.name),
                status: pickFirstString(row.status),
                source: "public.businesses",
                source_row: row,
                normalized: {
                    email: pickFirstString(row.email),
                    phone: pickFirstString(row.phone),
                    whatsapp: pickFirstString(row.whatsapp),
                    owner: pickFirstString(row.owner),
                    modules: normalizeStringArray(row.modules),
                    industry_id: pickFirstString(row.industry_id, row.industryId),
                    industry_label: pickFirstString(row.industry_label, row.industryLabel),
                    city: pickFirstString(row.city),
                    district: pickFirstString(row.district),
                    data: row.data ?? null,
                },
                created_at: toIsoOrNull(row.created_at ?? row.createdAt),
                updated_at: toIsoOrNull(row.updated_at ?? row.updatedAt),
            };
        case "admins":
            return {
                legacy_admin_id: pickFirstString(row.id, row.username),
                username: pickFirstString(row.username),
                email: pickFirstString(row.email),
                display_name: pickFirstString(row.displayName, row.display_name, row.name),
                admin_role: pickFirstString(row.role),
                is_active: normalizeBoolean(row.isActive ?? row.is_active),
                password_hash: pickFirstString(row.passwordHash, row.password_hash),
                source: "public.admins",
                source_row: row,
                normalized: {
                    permissions: normalizeStringArray(row.permissions),
                    created_by: pickFirstString(row.createdBy, row.created_by),
                },
                created_at: toIsoOrNull(row.createdAt ?? row.created_at),
                updated_at: toIsoOrNull(row.updatedAt ?? row.updated_at),
                last_login_at: toIsoOrNull(row.lastLogin ?? row.last_login),
            };
        case "business_owners":
            return {
                legacy_owner_id: pickFirstString(row.id, row.owner_id, row.email),
                business_id: pickFirstString(row.business_id, row.businessId),
                email: pickFirstString(row.email),
                full_name: pickFirstString(row.full_name, row.fullName, row.name),
                owner_status: pickFirstString(row.status),
                is_active: normalizeBoolean(row.is_active ?? row.isActive ?? row.status),
                password_hash: pickFirstString(row.password_hash, row.passwordHash),
                source: "app_documents/business_owners",
                source_row: row,
                normalized: {
                    phone: pickFirstString(row.phone),
                    business_slug: pickFirstString(row.business_slug, row.businessSlug),
                },
                created_at: toIsoOrNull(row.created_at ?? row.createdAt),
                updated_at: toIsoOrNull(row.updated_at ?? row.updatedAt),
                last_login_at: toIsoOrNull(row.last_login ?? row.lastLogin),
            };
        case "business_staff":
            return {
                legacy_staff_id: pickFirstString(row.id, row.staff_id, row.email),
                business_id: pickFirstString(row.business_id, row.businessId),
                email: pickFirstString(row.email),
                phone: pickFirstString(row.phone),
                name: pickFirstString(row.name),
                staff_role: pickFirstString(row.role),
                permissions: normalizeStringArray(row.permissions),
                staff_status: pickFirstString(row.status),
                is_active: normalizeBoolean(row.is_active ?? row.isActive ?? row.status),
                password_hash: pickFirstString(row.password_hash, row.passwordHash),
                source: "app_documents/business_staff",
                source_row: row,
                normalized: {
                    title: pickFirstString(row.title),
                },
                created_at: toIsoOrNull(row.created_at ?? row.createdAt),
                updated_at: toIsoOrNull(row.updated_at ?? row.updatedAt),
                last_login_at: toIsoOrNull(row.last_login ?? row.lastLogin),
            };
        case "qr_scans":
            return {
                legacy_qr_scan_id: pickFirstString(row.id),
                business_id: pickFirstString(row.business_id, row.businessId),
                business_slug: pickFirstString(row.business_slug, row.businessSlug),
                ip_hash: pickFirstString(row.ip_hash, row.ipHash),
                user_agent: pickFirstString(row.user_agent, row.userAgent),
                source: "app_documents/qr_scans",
                source_row: row,
                normalized: {},
                scanned_at: toIsoOrNull(row.created_at ?? row.createdAt),
                created_at: toIsoOrNull(row.created_at ?? row.createdAt),
                updated_at: toIsoOrNull(row.updated_at ?? row.updatedAt),
            };
        case "app_documents_archive":
            return {
                collection: pickFirstString(row.collection),
                document_id: pickFirstString(row.document_id, row.id),
                data: row.data ?? {},
                source_row: row,
                created_at: toIsoOrNull(row.created_at ?? row.createdAt),
                updated_at: toIsoOrNull(row.updated_at ?? row.updatedAt),
            };
        default:
            throw new Error(`Unsupported entity: ${entity}`);
    }
}

export function getShadowPlaceholderChecks() {
    return [
        {
            entity: "industry_definitions",
            check_name: "shadow_divergence_pending",
            status: "pending",
            details: {
                reason: "industry_definitions reconciliation is outside this P0 staging pass.",
            },
        },
        {
            entity: "ff_public_vs_documents",
            check_name: "shadow_divergence_pending",
            status: "pending",
            details: {
                reason: "ff_* and fb_* shadow comparison is deferred to the later restaurant phase.",
            },
        },
    ];
}
