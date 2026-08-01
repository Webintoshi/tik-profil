"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Building2, Check, ChevronDown, Loader2, Phone, Store } from "lucide-react";

interface Industry {
    id?: string;
    label?: string;
    name?: string;
    slug?: string;
}

interface IndustryOption {
    id: string;
    label: string;
}

export default function BusinessOnboardingForm({
    displayName,
    email,
}: {
    displayName: string;
    email: string;
}) {
    const [businessName, setBusinessName] = useState("");
    const [phone, setPhone] = useState("");
    const [industries, setIndustries] = useState<IndustryOption[]>([]);
    const [industryId, setIndustryId] = useState("");
    const [isLoadingIndustries, setIsLoadingIndustries] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        void fetch("/api/industries", { cache: "no-store" })
            .then((response) => response.json())
            .then((payload: { industries?: Industry[] }) => {
                if (!active) return;
                const options = (payload.industries ?? [])
                    .map((industry) => ({
                        id: String(industry.slug ?? industry.id ?? "").trim(),
                        label: String(industry.label ?? industry.name ?? "").trim(),
                    }))
                    .filter((industry) => industry.id && industry.label);
                setIndustries(options);
                setIndustryId(options[0]?.id ?? "other");
            })
            .catch(() => {
                if (active) setIndustryId("other");
            })
            .finally(() => {
                if (active) setIsLoadingIndustries(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const selectedIndustry = useMemo(
        () => industries.find((industry) => industry.id === industryId)
            ?? { id: "other", label: "Diğer" },
        [industries, industryId],
    );
    const canSubmit = businessName.trim().length >= 2
        && phone.replace(/\D/g, "").length >= 10
        && Boolean(industryId)
        && !isSubmitting;

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSubmit) return;
        setError("");
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/auth/logto/business/onboarding", {
                body: JSON.stringify({
                    businessName,
                    industryId: selectedIndustry.id,
                    industryLabel: selectedIndustry.label,
                    phone,
                }),
                headers: { "content-type": "application/json" },
                method: "POST",
            });
            const payload = await response.json() as { error?: string; redirect?: string; success?: boolean };
            if (!response.ok || !payload.success) {
                setError(payload.error ?? "Kayıt tamamlanamadı.");
                return;
            }
            window.location.assign(payload.redirect ?? "/panel/profile");
        } catch {
            setError("Bağlantı kurulamadı. Lütfen tekrar deneyin.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="w-full py-4">
            <header className="mb-8 text-center">
                <img
                    alt="Tık Profil"
                    className="mx-auto mb-7 h-auto w-[112px]"
                    src="/brand/tik-business-wordmark.png"
                />
                <h1 className="text-[26px] font-bold leading-tight text-[#211A12]">İşletmeni oluştur</h1>
                <p className="mt-2 text-sm leading-6 text-[#6F665C]">
                    Profilini hazırlamak için işletme bilgilerini tamamla.
                </p>
            </header>

            <div className="mb-6 flex items-center gap-3 border-y border-[#E7DED3] py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFE8C2] text-[#8A4D00]">
                    <Check className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#211A12]">Kimlik doğrulandı</p>
                    <p className="truncate text-xs text-[#6F665C]">{email || displayName || "Logto hesabı"}</p>
                </div>
            </div>

            <form className="space-y-5" onSubmit={submit}>
                <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-[#3D3328]">İşletme adı</span>
                    <span className="relative block">
                        <Building2 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A7A68]" />
                        <input
                            autoComplete="organization"
                            className="h-[52px] w-full rounded-lg border border-[#DCCFC1] bg-white py-3 pl-12 pr-4 text-[15px] text-[#211A12] outline-none transition focus:border-[#FFB347] focus:ring-2 focus:ring-[#FFB347]/25"
                            maxLength={80}
                            onChange={(event) => setBusinessName(event.target.value)}
                            placeholder="İşletmenizin adı"
                            required
                            value={businessName}
                        />
                    </span>
                </label>

                <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-[#3D3328]">Telefon</span>
                    <span className="relative block">
                        <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A7A68]" />
                        <input
                            autoComplete="tel"
                            className="h-[52px] w-full rounded-lg border border-[#DCCFC1] bg-white py-3 pl-12 pr-4 text-[15px] text-[#211A12] outline-none transition focus:border-[#FFB347] focus:ring-2 focus:ring-[#FFB347]/25"
                            inputMode="tel"
                            maxLength={20}
                            onChange={(event) => setPhone(event.target.value)}
                            placeholder="0 (5XX) XXX XX XX"
                            required
                            type="tel"
                            value={phone}
                        />
                    </span>
                </label>

                <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-[#3D3328]">Sektör</span>
                    <span className="relative block">
                        <Store className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[#8A7A68]" />
                        <select
                            className="h-[52px] w-full appearance-none rounded-lg border border-[#DCCFC1] bg-white py-3 pl-12 pr-11 text-[15px] text-[#211A12] outline-none transition focus:border-[#FFB347] focus:ring-2 focus:ring-[#FFB347]/25"
                            disabled={isLoadingIndustries}
                            onChange={(event) => setIndustryId(event.target.value)}
                            value={industryId}
                        >
                            {isLoadingIndustries ? (
                                <option value="">Sektörler yükleniyor</option>
                            ) : industries.length > 0 ? (
                                industries.map((industry) => (
                                    <option key={industry.id} value={industry.id}>{industry.label}</option>
                                ))
                            ) : (
                                <option value="other">Diğer</option>
                            )}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A7A68]" />
                    </span>
                </label>

                {error ? (
                    <p className="rounded-lg border border-[#EAB7B2] bg-[#FFF3F1] px-4 py-3 text-sm text-[#A72F28]" role="alert">
                        {error}
                    </p>
                ) : null}

                <button
                    className="flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-[#FFB347] px-5 text-[15px] font-bold text-[#211A12] transition hover:bg-[#F6A52F] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canSubmit}
                    type="submit"
                >
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                    Profili oluştur ve panele geç
                </button>
            </form>
        </section>
    );
}
