import { redirect } from "next/navigation";

export default function PanelPage() {
    // Redirect to profile page
    redirect("/panel/profile");
}
