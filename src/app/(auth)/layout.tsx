import { Metadata } from "next";
import ClientAuthLayout from "./ClientAuthLayout";

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
    },
};

export default function AuthLayoutWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    return <ClientAuthLayout>{children}</ClientAuthLayout>;
}
