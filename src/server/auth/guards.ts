import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import {
    getSession as getAdminSession,
    type SessionPayload as AdminSessionPayload,
} from "@/lib/auth";
import {
    getSession as getBusinessSession,
    type SessionUser,
} from "@/lib/apiAuth";
import { getDocumentREST } from "@/lib/documentStore";
import { getSessionSecretBytes } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { hasPermission, meetsMinRole, type StaffRole } from "@/lib/permissions";

const CONSULTANT_COOKIE = "tikprofil_consultant_session";

export type PlatformAdminContext = AdminSessionPayload;

export type BusinessMemberContext = SessionUser;

export interface ConsultantContext {
    consultantId: string;
    businessId: string;
    name: string;
    role: "consultant";
}

interface RequireBusinessMemberOptions {
    roles?: StaffRole[];
    permissions?: string[];
    minRole?: StaffRole;
    allowOwner?: boolean;
    allowStaff?: boolean;
}

async function hasConsultantSessionCookie(): Promise<boolean> {
    const cookieStore = await cookies();
    return Boolean(cookieStore.get(CONSULTANT_COOKIE)?.value);
}

export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
    const adminSession = await getAdminSession();
    if (adminSession?.username) {
        return adminSession;
    }

    const businessSession = await getBusinessSession();
    if (businessSession?.businessId || await hasConsultantSessionCookie()) {
        throw AppError.forbidden("Bu islem icin platform yoneticisi yetkisi gerekli.");
    }

    throw AppError.unauthorized();
}

export const assertPlatformAdmin = requirePlatformAdmin;

export async function requireBusinessMember(
    options: RequireBusinessMemberOptions = {}
): Promise<BusinessMemberContext> {
    const session = await getBusinessSession();
    if (!session?.businessId) {
        const adminSession = await getAdminSession();
        if (adminSession?.username || await hasConsultantSessionCookie()) {
            throw AppError.forbidden("Bu islem icin isletme uyeligi gerekli.");
        }

        throw AppError.unauthorized();
    }

    if (options.roles && !options.roles.includes(session.role)) {
        throw AppError.forbidden("Bu islem icin gereken role sahip degilsiniz.");
    }

    if (session.role === "owner") {
        if (options.allowOwner === false) {
            throw AppError.forbidden("Bu islem sadece personel oturumu ile yapilabilir.");
        }

        return session;
    }

    if (options.allowStaff === false) {
        throw AppError.forbidden("Bu islem isletme sahibi yetkisi gerektirir.");
    }

    if (options.minRole && !meetsMinRole(session.role, options.minRole)) {
        throw AppError.forbidden("Bu islem icin yeterli yetki bulunmuyor.");
    }

    if (options.permissions?.length) {
        const hasAllPermissions = options.permissions.every((permission) =>
            hasPermission(session.permissions, session.role, permission)
        );

        if (!hasAllPermissions) {
            throw AppError.forbidden("Bu islem icin yetkiniz bulunmuyor.");
        }
    }

    return session;
}

export const assertBusinessMember = requireBusinessMember;

export async function requireBusinessOwner(): Promise<BusinessMemberContext> {
    return requireBusinessMember({ roles: ["owner"], allowStaff: false });
}

export const assertBusinessOwner = requireBusinessOwner;

export async function requireStaffPermission(
    permission: string
): Promise<BusinessMemberContext> {
    return requireBusinessMember({ permissions: [permission] });
}

export const assertStaffPermission = requireStaffPermission;

export async function requireConsultant(): Promise<ConsultantContext> {
    const cookieStore = await cookies();
    const token = cookieStore.get(CONSULTANT_COOKIE)?.value;

    if (!token) {
        const adminSession = await getAdminSession();
        const businessSession = await getBusinessSession();
        if (adminSession?.username || businessSession?.businessId) {
            throw AppError.forbidden("Bu islem icin danisman oturumu gerekli.");
        }

        throw AppError.unauthorized();
    }

    try {
        const { payload } = await jwtVerify(token, getSessionSecretBytes());
        const consultantId = payload.consultantId as string | undefined;
        const businessId = payload.businessId as string | undefined;

        if (!consultantId || !businessId || payload.role !== "consultant") {
            throw AppError.forbidden("Gecerli danisman oturumu bulunamadi.");
        }

        const consultant = await getDocumentREST("em_consultants", consultantId);
        if (!consultant || consultant.isActive === false) {
            throw AppError.unauthorized();
        }

        return {
            consultantId,
            businessId,
            name: (payload.name as string) || "",
            role: "consultant",
        };
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        throw AppError.unauthorized();
    }
}

export const assertConsultant = requireConsultant;

export function customerAuthNotReadyResponse(): NextResponse {
    return AppError.customerAuthNotReady().toResponse();
}

export async function requireCustomer(): Promise<never> {
    throw AppError.customerAuthNotReady();
}

export const assertCustomer = requireCustomer;

export function publicReadOnly() {
    return { access: "public-readonly" as const };
}

export function resolvePublicBusinessContext(input: {
    businessId?: string | null;
    businessSlug?: string | null;
    slug?: string | null;
}) {
    return {
        businessId: input.businessId?.trim() || null,
        businessSlug: input.businessSlug?.trim() || input.slug?.trim() || null,
    };
}
