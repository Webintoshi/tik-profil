import Link from "next/link";
import { redirect } from "next/navigation";

import { loadPanelSession } from "@/lib/panel/session";
import {
    canAccessStaffManagement,
    STAFF_MANAGEMENT_ACCESS_DENIED_DESCRIPTION,
    STAFF_MANAGEMENT_ACCESS_DENIED_TITLE,
} from "@/lib/panel/staffManagementAccess";

export default async function StaffManagementLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await loadPanelSession();

    if (!session) {
        redirect("/giris-yap");
    }

    if (canAccessStaffManagement(session)) {
        return <>{children}</>;
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-12">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
                <div className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                    Erisim sinirli
                </div>

                <h1 className="mt-6 text-3xl font-semibold tracking-tight text-gray-900">
                    {STAFF_MANAGEMENT_ACCESS_DENIED_TITLE}
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
                    {STAFF_MANAGEMENT_ACCESS_DENIED_DESCRIPTION}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                        href="/panel/profile"
                        className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                    >
                        Isletme profiline don
                    </Link>
                </div>
            </div>
        </div>
    );
}
