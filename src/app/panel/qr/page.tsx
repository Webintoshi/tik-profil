import { getAppUrl } from "@/lib/env";
import QRManagementClient from "./QRManagementClient";

function getCanonicalAppUrl() {
    const configuredUrl = getAppUrl();

    if (!configuredUrl) {
        return "https://tikprofil.com";
    }

    return configuredUrl.replace(/\/+$/, "");
}

export default function QRManagementPage() {
    return <QRManagementClient appUrl={getCanonicalAppUrl()} />;
}
