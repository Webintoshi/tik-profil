"use client";

import {
    AlertTriangle,
    BadgeCheck,
    Ban,
    ExternalLink,
    Link2,
    LoaderCircle,
    RotateCcw,
    Save,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { AdminCandidateProjection } from "@/server/business-imports/import-service";
import type { ReviewCandidateInput, SourceFactInput } from "@/server/business-imports/contracts";

import {
    buildCandidateApproval,
    toSourceFacts,
    type CandidateFactDraft,
    type CandidateFactFieldKey,
} from "./business-import-ui-state";

type SourceType = SourceFactInput["sourceType"];
type FieldKey = CandidateFactFieldKey;

interface FactDraft extends CandidateFactDraft {
    label: string;
}

interface CandidateReviewRowProps {
    candidate: AdminCandidateProjection;
    districts: readonly string[];
    onReview: (candidateId: string, input: ReviewCandidateInput) => Promise<void>;
}

const SOURCE_OPTIONS: Array<{ value: SourceType; label: string }> = [
    { value: "business_website", label: "İşletme web sitesi" },
    { value: "business_submitted", label: "İşletme beyanı" },
    { value: "public_registry", label: "Kamu kaydı" },
    { value: "admin_verified", label: "Yönetici doğrulaması" },
];

const FIELD_DEFINITIONS: Array<{ fieldKey: FieldKey; label: string }> = [
    { fieldKey: "name", label: "İşletme adı" },
    { fieldKey: "city", label: "Şehir" },
    { fieldKey: "district", label: "İlçe" },
    { fieldKey: "category", label: "Kategori" },
    { fieldKey: "address", label: "Adres" },
    { fieldKey: "phone", label: "Telefon" },
    { fieldKey: "website", label: "Web sitesi" },
];

const STATUS_LABELS: Record<string, string> = {
    discovered: "Yeni aday",
    needs_data: "Bilgi bekliyor",
    ready: "İncelemeye hazır",
    approved: "Onaylandı",
    rejected: "Reddedildi",
    duplicate: "Mükerrer",
    provisioning: "Yayınlanıyor",
    published: "Yayınlandı",
    failed: "Kurtarma gerekli",
};

function initialDrafts(candidate: AdminCandidateProjection): FactDraft[] {
    const facts = new Map(candidate.sourceFacts.map((fact) => [fact.fieldKey, fact]));
    return FIELD_DEFINITIONS.map(({ fieldKey, label }) => {
        const fact = facts.get(fieldKey);
        const suggestedValue = fieldKey === "city"
            ? "Ordu"
            : fieldKey === "district"
                ? candidate.districtScope ?? ""
                : fieldKey === "category"
                    ? "Petshop"
                    : "";
        return {
            fieldKey,
            label,
            value: fact?.fieldValue ?? suggestedValue,
            sourceType: fact?.sourceType ?? "",
        };
    });
}

function PreviewValue({ label, value }: { label: string; value?: string }) {
    return (
        <div className="min-w-0">
            <dt className="text-[11px] font-medium uppercase text-zinc-500">{label}</dt>
            <dd className="mt-0.5 break-words text-sm text-zinc-300">{value?.trim() || "Sağlanmadı"}</dd>
        </div>
    );
}

export function CandidateReviewRow({ candidate, districts, onReview }: CandidateReviewRowProps) {
    const [drafts, setDrafts] = useState<FactDraft[]>(() => initialDrafts(candidate));
    const [duplicateBusinessId, setDuplicateBusinessId] = useState("");
    const [dedupeReason, setDedupeReason] = useState("");
    const [pendingDecision, setPendingDecision] = useState<string | null>(null);
    const [rowError, setRowError] = useState<string | null>(null);
    const [retryInput, setRetryInput] = useState<ReviewCandidateInput | null>(null);

    useEffect(() => {
        setDrafts(initialDrafts(candidate));
    }, [candidate]);

    const approval = useMemo(() => buildCandidateApproval(drafts, districts), [drafts, districts]);
    const sourceFacts = useMemo(() => toSourceFacts(drafts), [drafts]);
    const reviewable = !["approved", "rejected", "duplicate", "published", "provisioning"].includes(candidate.candidateStatus);

    const updateDraft = (fieldKey: FieldKey, change: Partial<Pick<FactDraft, "value" | "sourceType">>) => {
        setDrafts((current) => current.map((draft) => draft.fieldKey === fieldKey ? { ...draft, ...change } : draft));
    };

    const submit = async (input: ReviewCandidateInput) => {
        setPendingDecision(input.decision);
        setRowError(null);
        setRetryInput(null);
        try {
            await onReview(candidate.id, input);
        } catch (error) {
            setRowError(error instanceof Error ? error.message : "Aday işlemi tamamlanamadı.");
            setRetryInput(input);
        } finally {
            setPendingDecision(null);
        }
    };

    const providerPlace = candidate.provider.available ? candidate.provider.place : null;

    return (
        <article className="border-b border-white/10 bg-zinc-950/30 last:border-b-0" aria-labelledby={`candidate-${candidate.id}`}>
            <div className="grid min-w-0 lg:grid-cols-[minmax(240px,0.78fr)_minmax(0,1.55fr)]">
                <section className="border-b border-white/10 bg-black/20 p-4 lg:border-b-0 lg:border-r">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase text-amber-400">Google canlı önizleme</p>
                            <h2 id={`candidate-${candidate.id}`} className="mt-1 break-words text-base font-semibold text-zinc-100">
                                {providerPlace?.displayName || "Canlı veri kullanılamıyor"}
                            </h2>
                        </div>
                        <span className="shrink-0 rounded-sm border border-white/10 px-2 py-1 text-[11px] text-zinc-400">
                            {STATUS_LABELS[candidate.candidateStatus] ?? candidate.candidateStatus}
                        </span>
                    </div>

                    <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
                        <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Salt okunur, kalıcı profile kopyalanmaz
                    </p>

                    {providerPlace ? (
                        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                            <PreviewValue label="Adres" value={providerPlace.formattedAddress} />
                            <PreviewValue label="Telefon" value={providerPlace.nationalPhoneNumber || providerPlace.internationalPhoneNumber} />
                            <div className="min-w-0">
                                <dt className="text-[11px] font-medium uppercase text-zinc-500">Web sitesi</dt>
                                <dd className="mt-0.5 break-all text-sm text-zinc-300">
                                    {providerPlace.websiteUri ? (
                                        <a className="inline-flex items-center gap-1 text-amber-300 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-amber-400" href={providerPlace.websiteUri} target="_blank" rel="noreferrer">
                                            Bağlantıyı aç <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                        </a>
                                    ) : "Sağlanmadı"}
                                </dd>
                            </div>
                        </dl>
                    ) : (
                        <div className="mt-4 flex gap-2 border-l-2 border-amber-500 pl-3 text-sm text-zinc-400">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                            Google önizlemesi geçici olarak alınamadı. Kalıcı bilgiler yine incelenebilir.
                        </div>
                    )}

                    <p className="mt-5 border-t border-white/10 pt-3 text-xs font-medium text-zinc-400">
                        Google tarafından sağlanmıştır
                    </p>
                </section>

                <section className="min-w-0 p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[11px] font-semibold uppercase text-zinc-500">Tık Profil kalıcı bilgileri</p>
                            <p className="mt-1 text-xs text-zinc-400">Her değer bağımsız ve izin verilen bir kaynağa dayanmalıdır.</p>
                        </div>
                        <span className="mt-2 text-xs text-zinc-500 sm:mt-0">Aday: {candidate.id.slice(0, 8)}</span>
                    </div>

                    <div className="mt-4 grid gap-x-3 gap-y-4 md:grid-cols-2">
                        {drafts.map((draft) => (
                            <div key={draft.fieldKey} className={draft.fieldKey === "address" ? "md:col-span-2" : ""}>
                                <label htmlFor={`${candidate.id}-${draft.fieldKey}`} className="block text-xs font-medium text-zinc-300">
                                    {draft.label}
                                </label>
                                {draft.fieldKey === "district" ? (
                                    <select
                                        id={`${candidate.id}-${draft.fieldKey}`}
                                        value={draft.value}
                                        disabled={!reviewable}
                                        onChange={(event) => updateDraft(draft.fieldKey, { value: event.target.value })}
                                        className="mt-1.5 h-10 w-full rounded-sm border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 disabled:opacity-60"
                                    >
                                        <option value="">İlçe seçin</option>
                                        {districts.map((district) => <option key={district} value={district}>{district}</option>)}
                                    </select>
                                ) : (
                                    <input
                                        id={`${candidate.id}-${draft.fieldKey}`}
                                        type={draft.fieldKey === "phone" ? "tel" : draft.fieldKey === "website" ? "url" : "text"}
                                        value={draft.value}
                                        disabled={!reviewable}
                                        onChange={(event) => updateDraft(draft.fieldKey, { value: event.target.value })}
                                        className="mt-1.5 h-10 w-full rounded-sm border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 disabled:opacity-60"
                                        placeholder={draft.fieldKey === "website" ? "https://..." : `${draft.label} girin`}
                                    />
                                )}
                                <label htmlFor={`${candidate.id}-${draft.fieldKey}-source`} className="sr-only">{draft.label} kaynak türü</label>
                                <select
                                    id={`${candidate.id}-${draft.fieldKey}-source`}
                                    value={draft.sourceType}
                                    disabled={!reviewable || !draft.value.trim()}
                                    onChange={(event) => updateDraft(draft.fieldKey, { sourceType: event.target.value as SourceType | "" })}
                                    className="mt-1.5 h-9 w-full rounded-sm border border-white/10 bg-black/30 px-3 text-xs text-zinc-300 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 disabled:opacity-50"
                                >
                                    <option value="">Kaynak seçin</option>
                                    {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label} ({option.value})</option>)}
                                </select>
                            </div>
                        ))}
                    </div>

                    {reviewable && !approval.complete && (
                        <p className="mt-4 border-l-2 border-amber-500 pl-3 text-xs leading-5 text-amber-200" role="status">
                            <strong>Onay için eksik:</strong> {approval.reason}.
                        </p>
                    )}

                    <div className="mt-5 border-t border-white/10 pt-4">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <label className="text-xs text-zinc-400">
                                Mükerrer işletme kimliği
                                <input
                                    value={duplicateBusinessId}
                                    disabled={!reviewable}
                                    onChange={(event) => setDuplicateBusinessId(event.target.value)}
                                    className="mt-1.5 h-9 w-full rounded-sm border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 disabled:opacity-60"
                                />
                            </label>
                            <label className="text-xs text-zinc-400">
                                Mükerrer gerekçesi
                                <input
                                    value={dedupeReason}
                                    disabled={!reviewable}
                                    onChange={(event) => setDedupeReason(event.target.value)}
                                    className="mt-1.5 h-9 w-full rounded-sm border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 disabled:opacity-60"
                                />
                            </label>
                        </div>

                        {rowError && (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200" role="alert">
                                <span>{rowError}</span>
                                {retryInput && (
                                    <button type="button" onClick={() => void submit(retryInput)} className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-semibold text-red-100 outline-none hover:bg-red-500/15 focus:ring-2 focus:ring-red-400">
                                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> İşlemi tekrar dene
                                    </button>
                                )}
                            </div>
                        )}

                        {reviewable && (
                            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                                <button
                                    type="button"
                                    disabled={Boolean(pendingDecision)}
                                    onClick={() => void submit({ decision: "needs_data", sourceFacts })}
                                    className="inline-flex h-9 items-center gap-2 rounded-sm px-3 text-xs font-semibold text-zinc-300 outline-none hover:bg-white/5 focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                                >
                                    <Save className="h-4 w-4" aria-hidden="true" /> Taslağı kaydet
                                </button>
                                <button
                                    type="button"
                                    disabled={Boolean(pendingDecision)}
                                    onClick={() => void submit({ decision: "rejected" })}
                                    className="inline-flex h-9 items-center gap-2 rounded-sm border border-red-500/30 px-3 text-xs font-semibold text-red-300 outline-none hover:bg-red-500/10 focus:ring-2 focus:ring-red-400 disabled:opacity-50"
                                >
                                    <Ban className="h-4 w-4" aria-hidden="true" /> Reddet
                                </button>
                                <button
                                    type="button"
                                    disabled={Boolean(pendingDecision) || !duplicateBusinessId.trim() || !dedupeReason.trim()}
                                    onClick={() => void submit({ decision: "duplicate", duplicateBusinessId: duplicateBusinessId.trim(), dedupeReason: dedupeReason.trim() })}
                                    className="inline-flex h-9 items-center gap-2 rounded-sm border border-white/10 px-3 text-xs font-semibold text-zinc-300 outline-none hover:bg-white/5 focus:ring-2 focus:ring-amber-400 disabled:opacity-40"
                                >
                                    <Link2 className="h-4 w-4" aria-hidden="true" /> Mükerrer
                                </button>
                                <button
                                    type="button"
                                    disabled={!approval.complete || Boolean(pendingDecision)}
                                    aria-describedby={!approval.complete ? `approval-reason-${candidate.id}` : undefined}
                                    onClick={() => void submit({ decision: "approved", sourceFacts })}
                                    className="inline-flex h-9 items-center gap-2 rounded-sm bg-amber-400 px-3 text-xs font-bold text-zinc-950 outline-none hover:bg-amber-300 focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                                >
                                    {pendingDecision === "approved" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <BadgeCheck className="h-4 w-4" aria-hidden="true" />}
                                    Onayla
                                </button>
                                {!approval.complete && <span id={`approval-reason-${candidate.id}`} className="sr-only">Onay için eksik: {approval.reason}</span>}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </article>
    );
}
