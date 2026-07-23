"use client";

import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    LoaderCircle,
    MapPinned,
    Play,
    RefreshCw,
    RotateCcw,
    ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AdminCandidateProjection, ImportBatchSummary } from "@/server/business-imports/import-service";
import type { ReviewCandidateInput } from "@/server/business-imports/contracts";
import type { ImmediateBusinessCredential } from "@/server/business-imports/provisioning";

import { CandidateReviewRow } from "./CandidateReviewRow";
import { OneTimeCredentialsDialog } from "./OneTimeCredentialsDialog";

interface BusinessImportClientProps {
    districts: readonly string[];
}

interface StartResponse {
    batchId: string;
    status: string;
}

interface CandidateListResponse {
    candidates: AdminCandidateProjection[];
}

interface ProvisionResponse {
    batchId: string;
    credentials: ImmediateBusinessCredential[];
}

interface OperatorNotice {
    message: string;
    retryLabel: string;
    retry: () => void;
}

const OPERATOR_MESSAGES: Record<number, string> = {
    401: "Oturumunuz sona erdi. Yeniden giriş yapıp işlemi tekrarlayın.",
    403: "Bu işlem için platform yöneticisi yetkisi gerekiyor.",
    404: "İçe aktarma kaydı bulunamadı. Yeni bir kuru çalışma başlatın.",
    409: "İşlem mevcut durumla çakıştı. Güncel durumu yükleyip yeniden deneyin.",
    429: "Google Places istek sınırına ulaşıldı. Kısa süre sonra yeniden deneyin.",
    502: "Dış hizmet geçici olarak yanıt vermiyor. İşlem güvenle yeniden denenebilir.",
};

const STATUS_LABELS: Record<string, string> = {
    pending: "Sırada",
    running: "Google Places taranıyor",
    completed: "İncelemeye hazır",
    failed: "Kurtarma gerekli",
};

function operatorMessage(status: number): string {
    return OPERATOR_MESSAGES[status] ?? "İşlem tamamlanamadı. Bağlantıyı kontrol edip yeniden deneyin.";
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
    const response = await fetch(input, {
        ...init,
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...init?.headers },
    });
    if (!response.ok) throw new Error(operatorMessage(response.status));
    return response.json() as Promise<T>;
}

function SummaryValue({ label, value, priority = false }: { label: string; value: string | number; priority?: boolean }) {
    return (
        <div className="min-w-0 border-l border-white/10 px-3 first:border-l-0 sm:px-4">
            <dt className="text-[11px] font-medium uppercase text-zinc-500">{label}</dt>
            <dd className={`mt-1 truncate text-sm font-semibold ${priority ? "text-amber-300" : "text-zinc-100"}`}>{value}</dd>
        </div>
    );
}

export function BusinessImportClient({ districts }: BusinessImportClientProps) {
    const [selectedDistricts, setSelectedDistricts] = useState<string[]>(() => [...districts]);
    const [batchId, setBatchId] = useState<string | null>(null);
    const [batch, setBatch] = useState<ImportBatchSummary | null>(null);
    const [candidates, setCandidates] = useState<AdminCandidateProjection[]>([]);
    const [isStarting, setIsStarting] = useState(false);
    const [isProvisioning, setIsProvisioning] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pollVersion, setPollVersion] = useState(0);
    const [notice, setNotice] = useState<OperatorNotice | null>(null);
    const [credentials, setCredentials] = useState<ImmediateBusinessCredential[]>([]);
    const credentialsRef = useRef<ImmediateBusinessCredential[]>([]);
    const startRequestRef = useRef<{ districts: string[]; idempotencyKey: string } | null>(null);

    const replaceCredentials = useCallback((next: ImmediateBusinessCredential[]) => {
        credentialsRef.current = next;
        setCredentials(next);
    }, []);

    const clearCredentials = useCallback(() => {
        credentialsRef.current = [];
        setCredentials([]);
    }, []);

    useEffect(() => {
        const clearSensitiveMemory = () => clearCredentials();
        window.addEventListener("pagehide", clearSensitiveMemory);
        window.addEventListener("beforeunload", clearSensitiveMemory);
        return () => {
            window.removeEventListener("pagehide", clearSensitiveMemory);
            window.removeEventListener("beforeunload", clearSensitiveMemory);
            credentialsRef.current = [];
        };
    }, [clearCredentials]);

    const fetchCandidates = useCallback(async (currentBatchId: string, signal?: AbortSignal) => {
        const result = await requestJson<CandidateListResponse>(
            `/api/admin/business-imports/${currentBatchId}/candidates`,
            { signal },
        );
        setCandidates(result.candidates);
    }, []);

    useEffect(() => {
        if (!batchId) return;
        const controller = new AbortController();
        let timer: number | undefined;

        const poll = async () => {
            try {
                const summary = await requestJson<ImportBatchSummary>(
                    `/api/admin/business-imports/${batchId}`,
                    { signal: controller.signal },
                );
                setBatch(summary);
                setNotice(null);
                if (summary.status === "pending" || summary.status === "running") {
                    timer = window.setTimeout(() => void poll(), 2000);
                } else {
                    await fetchCandidates(batchId, controller.signal);
                }
            } catch (error) {
                if (controller.signal.aborted) return;
                setNotice({
                    message: error instanceof Error ? error.message : "İçe aktarma durumu alınamadı.",
                    retryLabel: "Yeniden dene",
                    retry: () => setPollVersion((current) => current + 1),
                });
            }
        };

        void poll();
        return () => {
            controller.abort();
            if (timer) window.clearTimeout(timer);
        };
    }, [batchId, fetchCandidates, pollVersion]);

    async function startBatch(newAttempt: boolean) {
        if (selectedDistricts.length === 0) {
            setNotice({
                message: "Kuru çalışma için en az bir Ordu ilçesi seçin.",
                retryLabel: "İlçelere dön",
                retry: () => document.getElementById("district-scope")?.focus(),
            });
            return;
        }

        if (newAttempt || !startRequestRef.current) {
            startRequestRef.current = {
                districts: [...selectedDistricts],
                idempotencyKey: globalThis.crypto.randomUUID(),
            };
        }
        const request = startRequestRef.current;
        setIsStarting(true);
        setNotice(null);
        try {
            const result = await requestJson<StartResponse>("/api/admin/business-imports/places/petshops", {
                method: "POST",
                body: JSON.stringify({
                    city: "Ordu",
                    districts: selectedDistricts,
                    idempotencyKey: request.idempotencyKey,
                }),
            });
            setBatchId(result.batchId);
            setBatch(null);
            setCandidates([]);
            setPollVersion((current) => current + 1);
        } catch (error) {
            setNotice({
                message: error instanceof Error ? error.message : "Kuru çalışma başlatılamadı.",
                retryLabel: "Yeniden dene",
                retry: () => void startBatch(false),
            });
        } finally {
            setIsStarting(false);
        }
    }

    const refreshCandidates = async () => {
        if (!batchId) return;
        setIsRefreshing(true);
        setNotice(null);
        try {
            await fetchCandidates(batchId);
        } catch (error) {
            setNotice({
                message: error instanceof Error ? error.message : "Aday listesi yenilenemedi.",
                retryLabel: "Yeniden dene",
                retry: () => void refreshCandidates(),
            });
        } finally {
            setIsRefreshing(false);
        }
    };

    const reviewCandidate = async (candidateId: string, input: ReviewCandidateInput) => {
        if (!batchId) throw new Error("Etkin içe aktarma kaydı bulunamadı.");
        await requestJson(`/api/admin/business-imports/${batchId}/candidates/${candidateId}`, {
            method: "PATCH",
            body: JSON.stringify(input),
        });
        await fetchCandidates(batchId);
    };

    async function provisionBatch() {
        if (!batchId) return;
        setIsProvisioning(true);
        setNotice(null);
        try {
            const result = await requestJson<ProvisionResponse>(`/api/admin/business-imports/${batchId}/provision`, {
                method: "POST",
            });
            replaceCredentials(result.credentials);
            await fetchCandidates(batchId);
        } catch (error) {
            setNotice({
                message: error instanceof Error ? error.message : "Onaylı işletmeler yayınlanamadı.",
                retryLabel: "Yeniden dene",
                retry: () => void provisionBatch(),
            });
        } finally {
            setIsProvisioning(false);
        }
    }

    const approvedCount = useMemo(
        () => candidates.filter((candidate) => candidate.candidateStatus === "approved" || candidate.candidateStatus === "failed").length,
        [candidates],
    );
    const reviewedCount = useMemo(
        () => candidates.filter((candidate) => ["approved", "rejected", "duplicate", "published", "failed"].includes(candidate.candidateStatus)).length,
        [candidates],
    );

    const toggleDistrict = (district: string) => {
        startRequestRef.current = null;
        setSelectedDistricts((current) => current.includes(district)
            ? current.filter((item) => item !== district)
            : [...current, district]);
    };

    return (
        <div className="mx-auto w-full max-w-[1500px] font-[Jost,'Trebuchet_MS',sans-serif] text-zinc-200">
            <header className="mb-6 border-b border-white/10 pb-5">
                <Link href="/dashboard/businesses" className="inline-flex items-center gap-1.5 rounded-sm text-xs font-semibold text-zinc-400 outline-none hover:text-zinc-100 focus:ring-2 focus:ring-amber-400">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" /> İşletmelere dön
                </Link>
                <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-amber-400">
                            <MapPinned className="h-4 w-4" aria-hidden="true" />
                            <p className="text-[11px] font-semibold uppercase">Ordu · Petshop · Yönetici çalışma alanı</p>
                        </div>
                        <h1 className="mt-1 text-2xl font-semibold text-zinc-50">İşletme İçe Aktar</h1>
                        <p className="mt-1 max-w-2xl text-sm text-zinc-400">Google Places adaylarını kuru çalışmada bulun, bağımsız kaynaklarla doğrulayın ve onaylı işletmeleri yayınlayın.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {batchId && (
                            <button type="button" onClick={() => void refreshCandidates()} disabled={isRefreshing} aria-label="Aday listesini yenile" className="inline-flex h-10 items-center gap-2 rounded-sm border border-white/10 px-3 text-sm font-semibold text-zinc-300 outline-none hover:bg-white/5 focus:ring-2 focus:ring-amber-400 disabled:opacity-50">
                                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" /> Yenile
                            </button>
                        )}
                        <button type="button" onClick={() => { startRequestRef.current = null; void startBatch(true); }} disabled={isStarting || selectedDistricts.length === 0} aria-label="Ordu petshop kuru çalışmasını başlat" className="inline-flex h-10 items-center gap-2 rounded-sm bg-amber-400 px-4 text-sm font-bold text-zinc-950 outline-none hover:bg-amber-300 focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400">
                            {isStarting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                            Kuru çalışmayı başlat
                        </button>
                    </div>
                </div>
            </header>

            <section className="border-b border-white/10 pb-5" aria-labelledby="district-scope-title">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 id="district-scope-title" className="text-sm font-semibold text-zinc-100">İlçe kapsamı</h2>
                        <p className="mt-0.5 text-xs text-zinc-500">{selectedDistricts.length} / {districts.length} ilçe seçili</p>
                    </div>
                    <button type="button" onClick={() => {
                        startRequestRef.current = null;
                        setSelectedDistricts(selectedDistricts.length === districts.length ? [] : [...districts]);
                    }} className="rounded-sm px-2 py-1 text-xs font-semibold text-amber-300 outline-none hover:bg-amber-400/10 focus:ring-2 focus:ring-amber-400">
                        {selectedDistricts.length === districts.length ? "Tümünü kaldır" : "Tümünü seç"}
                    </button>
                </div>
                <fieldset id="district-scope" tabIndex={-1} className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 outline-none sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
                    <legend className="sr-only">İçe aktarılacak Ordu ilçeleri</legend>
                    {districts.map((district) => (
                        <label key={district} className="flex min-w-0 cursor-pointer items-center gap-2 text-xs text-zinc-300">
                            <input type="checkbox" checked={selectedDistricts.includes(district)} onChange={() => toggleDistrict(district)} className="h-4 w-4 rounded-sm border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-2 focus:ring-amber-400 focus:ring-offset-zinc-950" />
                            <span className="truncate">{district}</span>
                        </label>
                    ))}
                </fieldset>
            </section>

            <div className="sr-only" aria-live="polite" aria-atomic="true">
                {batch ? `İçe aktarma durumu: ${STATUS_LABELS[batch.status] ?? batch.status}. ${batch.importedCount} yeni aday.` : isStarting ? "Kuru çalışma başlatılıyor." : ""}
            </div>

            {notice && (
                <div className="my-4 flex flex-col gap-3 border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 sm:flex-row sm:items-center sm:justify-between" role="alert">
                    <span className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{notice.message}</span>
                    <button type="button" onClick={notice.retry} className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-sm px-2 text-xs font-bold outline-none hover:bg-red-500/10 focus:ring-2 focus:ring-red-400">
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> {notice.retryLabel}
                    </button>
                </div>
            )}

            {batch && (
                <section className="border-b border-white/10 py-5" aria-labelledby="batch-summary-title">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0 flex-1 overflow-x-auto">
                            <h2 id="batch-summary-title" className="sr-only">Kuru çalışma özeti</h2>
                            <dl className="grid min-w-[650px] grid-cols-6">
                                <SummaryValue label="Durum" value={STATUS_LABELS[batch.status] ?? batch.status} priority={batch.status === "failed"} />
                                <SummaryValue label="Yeni aday" value={batch.importedCount} />
                                <SummaryValue label="Eşleşen" value={batch.matchedCount} />
                                <SummaryValue label="Atlanan" value={batch.skippedCount} />
                                <SummaryValue label="Başarısız" value={batch.failedCount} priority={batch.failedCount > 0} />
                                <SummaryValue label="İlçe kapsamı" value={batch.districts.length} />
                            </dl>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
                            {batch.status === "failed" && (
                                <button type="button" onClick={() => { startRequestRef.current = null; void startBatch(true); }} disabled={isStarting} className="inline-flex h-9 items-center gap-2 rounded-sm border border-amber-400/40 px-3 text-xs font-bold text-amber-300 outline-none hover:bg-amber-400/10 focus:ring-2 focus:ring-amber-400 disabled:opacity-50">
                                    <RotateCcw className="h-4 w-4" aria-hidden="true" /> Kurtarma denemesi başlat
                                </button>
                            )}
                            <button type="button" onClick={() => void provisionBatch()} disabled={!approvedCount || isProvisioning} aria-label={`${approvedCount} onaylı işletmeyi yayınla veya başarısız yayını yeniden dene`} className="inline-flex h-9 items-center gap-2 rounded-sm bg-amber-400 px-3 text-xs font-bold text-zinc-950 outline-none hover:bg-amber-300 focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400">
                                {isProvisioning ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                                Onaylıları yayınla / yeniden dene ({approvedCount})
                            </button>
                        </div>
                    </div>
                    {batch.failureCode && <p className="mt-3 text-xs text-amber-300">Sağlayıcı hata kodu: {batch.failureCode}</p>}
                </section>
            )}

            <section className="py-5" aria-labelledby="candidate-list-title">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 id="candidate-list-title" className="text-base font-semibold text-zinc-100">Aday inceleme kuyruğu</h2>
                        <p className="mt-0.5 text-xs text-zinc-500">{candidates.length} aday · {reviewedCount} sonuçlandırılmış</p>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                        Google verileri canlı önizlemedir; kalıcı bilgi değildir.
                    </p>
                </div>

                {batch && (batch.status === "pending" || batch.status === "running") ? (
                    <div className="flex min-h-40 items-center justify-center border-y border-white/10 text-sm text-zinc-400" role="status">
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin text-amber-400" aria-hidden="true" /> Google Places sonuçları bekleniyor
                    </div>
                ) : candidates.length > 0 ? (
                    <div className="overflow-hidden rounded-sm border border-white/10">
                        {candidates.map((candidate) => (
                            <CandidateReviewRow key={candidate.id} candidate={candidate} districts={districts} onReview={reviewCandidate} />
                        ))}
                    </div>
                ) : (
                    <div className="flex min-h-40 items-center justify-center border-y border-white/10 px-4 text-center text-sm text-zinc-500">
                        {batch ? "Bu kuru çalışmada incelenecek aday bulunamadı." : "İlçeleri seçip ilk kuru çalışmayı başlatın."}
                    </div>
                )}
            </section>

            {credentials.length > 0 && (
                <OneTimeCredentialsDialog
                    credentials={credentials}
                    onAcknowledged={(deliveryGeneration) => {
                        const next = credentialsRef.current.filter((credential) => credential.deliveryGeneration !== deliveryGeneration);
                        replaceCredentials(next);
                    }}
                    onClose={clearCredentials}
                />
            )}
        </div>
    );
}
