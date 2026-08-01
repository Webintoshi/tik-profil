import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import BusinessOnboardingForm from "./BusinessOnboardingForm";
import {
    BUSINESS_ONBOARDING_COOKIE,
    verifyLogtoBusinessOnboardingToken,
} from "@/server/auth/logto/session";

export default async function BusinessOnboardingPage() {
    const cookieStore = await cookies();
    const identity = await verifyLogtoBusinessOnboardingToken(
        cookieStore.get(BUSINESS_ONBOARDING_COOKIE)?.value,
    );

    if (!identity) redirect("/giris-yap");

    return (
        <BusinessOnboardingForm
            displayName={identity.displayName ?? ""}
            email={identity.email ?? ""}
        />
    );
}
