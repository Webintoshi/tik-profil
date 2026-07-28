import { redirect } from "next/navigation";

export default function LegacyAccountActivationPage() {
    redirect("/panel/profile");
}
