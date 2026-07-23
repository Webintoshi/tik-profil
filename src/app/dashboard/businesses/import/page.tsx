import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BusinessImportClient } from "@/components/admin/business-imports/BusinessImportClient";
import { ORDU_DISTRICTS } from "@/server/business-imports/contracts";
import {
    PlatformAdminAuthorizationError,
    requirePlatformAdmin,
} from "@/server/auth/platform-admin";

export const metadata: Metadata = {
    title: "İşletme İçe Aktar | Tık Profil Admin",
    description: "Ordu petshop adaylarını inceleme ve yayınlama çalışma alanı",
};

export default async function BusinessImportPage() {
    try {
        await requirePlatformAdmin();
    } catch (error) {
        if (error instanceof PlatformAdminAuthorizationError) {
            redirect("/webintoshi");
        }
        throw error;
    }

    return <BusinessImportClient districts={[...ORDU_DISTRICTS]} />;
}
