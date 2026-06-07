export const STAFF_MANAGEMENT_ACCESS_DENIED_TITLE = "Bu alan icin yetkiniz yok";
export const STAFF_MANAGEMENT_ACCESS_DENIED_DESCRIPTION =
    "Ekip yonetimi yalnizca yetkili sahip ve yoneticiler icin aciktir.";

const STAFF_MANAGEMENT_PERMISSION = "general.staff";
const STAFF_MANAGEMENT_ROLE_ORDER = {
    owner: 3,
    manager: 2,
    staff: 1,
} as const;

type StaffManagementRole = keyof typeof STAFF_MANAGEMENT_ROLE_ORDER;

export function canAccessStaffManagement({
    permissions,
    role,
}: {
    permissions: string[];
    role: StaffManagementRole;
}): boolean {
    if (role === "owner") {
        return true;
    }

    if (STAFF_MANAGEMENT_ROLE_ORDER[role] < STAFF_MANAGEMENT_ROLE_ORDER.manager) {
        return false;
    }

    return permissions.includes(STAFF_MANAGEMENT_PERMISSION);
}
