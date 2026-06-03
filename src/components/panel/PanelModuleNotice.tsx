import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";

interface PanelModuleNoticeProps {
    title: string;
    description: string;
    primaryHref?: string;
    primaryLabel?: string;
}

export function PanelModuleNotice({
    title,
    description,
    primaryHref,
    primaryLabel,
}: PanelModuleNoticeProps) {
    return (
        <div className="max-w-3xl mx-auto px-4 py-12">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                    <Clock3 className="h-4 w-4" />
                    Yakinda
                </div>

                <h1 className="mt-6 text-3xl font-semibold tracking-tight text-gray-900">
                    {title}
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
                    {description}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                    {primaryHref && primaryLabel ? (
                        <Link
                            href={primaryHref}
                            className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                        >
                            {primaryLabel}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    ) : null}

                    <Link
                        href="/panel/profile"
                        className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                        Isletme profiline don
                    </Link>
                </div>
            </div>
        </div>
    );
}
