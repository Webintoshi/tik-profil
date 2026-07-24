import type { SourceFactInput } from "@/server/business-imports/contracts";

export type CandidateFactFieldKey = "name" | "city" | "district" | "category" | "address" | "phone" | "website";

export interface CandidateFactDraft {
    fieldKey: CandidateFactFieldKey;
    value: string;
    sourceType: SourceFactInput["sourceType"] | "";
}

const PERMITTED_SOURCE_TYPES = new Set<SourceFactInput["sourceType"]>([
    "business_website",
    "business_submitted",
    "public_registry",
    "admin_verified",
]);

function isPermittedSource(sourceType: string): sourceType is SourceFactInput["sourceType"] {
    return PERMITTED_SOURCE_TYPES.has(sourceType as SourceFactInput["sourceType"]);
}

function isValidWebsite(value: string): boolean {
    try {
        const parsed = new URL(value);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
        return false;
    }
}

export function buildCandidateApproval(
    drafts: readonly CandidateFactDraft[],
    districts: readonly string[],
): { complete: boolean; reason: string } {
    const byKey = new Map(drafts.map((draft) => [draft.fieldKey, draft]));
    const missing: string[] = [];
    const value = (fieldKey: CandidateFactFieldKey) => byKey.get(fieldKey)?.value.trim() ?? "";
    const sourced = (fieldKey: CandidateFactFieldKey) => {
        const sourceType = byKey.get(fieldKey)?.sourceType ?? "";
        return isPermittedSource(sourceType);
    };

    if (value("name").length < 2 || !sourced("name")) missing.push("geçerli ve kaynaklı işletme adı");
    if (value("city") !== "Ordu" || !sourced("city")) missing.push("Ordu şehir bilgisi ve kaynağı");
    if (!districts.includes(value("district")) || !sourced("district")) missing.push("geçerli ilçe ve kaynağı");
    if (value("category").length < 2 || !sourced("category")) missing.push("kategori ve kaynağı");

    const address = value("address");
    const phone = value("phone");
    const website = value("website");
    const hasAddress = address.length >= 5 && sourced("address");
    const hasPhone = phone.replace(/\D/g, "").length >= 10 && sourced("phone");
    const hasWebsite = isValidWebsite(website) && sourced("website");
    if (!hasAddress && !hasPhone && !hasWebsite) {
        missing.push("kaynaklı geçerli adres, telefon veya web sitesi");
    }
    if (address && !hasAddress) missing.push("girilen adres için geçerli değer ve kaynak");
    if (phone && !hasPhone) missing.push("girilen telefon için geçerli değer ve kaynak");
    if (website && !hasWebsite) missing.push("girilen web sitesi için geçerli adres ve kaynak");

    return { complete: missing.length === 0, reason: missing.join("; ") };
}

export function toSourceFacts(drafts: readonly CandidateFactDraft[]): SourceFactInput[] {
    return drafts.flatMap((draft) => {
        const fieldValue = draft.value.trim();
        return fieldValue && isPermittedSource(draft.sourceType)
            ? [{ fieldKey: draft.fieldKey, fieldValue, sourceType: draft.sourceType }]
            : [];
    });
}

interface BatchPollerOptions<T extends { status: string }> {
    loadBatch: () => Promise<T>;
    loadCandidates: () => Promise<void>;
    onBatch: (batch: T) => void;
    onError: (error: unknown) => void;
    schedule: (callback: () => void) => () => void;
}

export function createBatchPoller<T extends { status: string }>(options: BatchPollerOptions<T>) {
    let stopped = false;
    let inFlight: Promise<void> | null = null;
    let cancelScheduled: (() => void) | null = null;

    const executePoll = async () => {
        try {
            const batch = await options.loadBatch();
            if (stopped) return;
            options.onBatch(batch);
            if (batch.status === "pending" || batch.status === "running") {
                cancelScheduled = options.schedule(() => {
                    cancelScheduled = null;
                    void pollNow();
                });
                return;
            }
            stopped = true;
            await options.loadCandidates();
        } catch (error) {
            if (!stopped) options.onError(error);
        }
    };

    function pollNow(): Promise<void> {
        if (stopped) return Promise.resolve();
        if (inFlight) return inFlight;
        inFlight = executePoll().finally(() => { inFlight = null; });
        return inFlight;
    }

    return {
        pollNow,
        stop() {
            stopped = true;
            cancelScheduled?.();
            cancelScheduled = null;
        },
    };
}

export const STALE_CREDENTIAL_NOTICE = "Bu giriş bilgileri artık geçerli değil ve güvenli biçimde kaldırıldı.";
export const DELIVERED_CREDENTIAL_NOTICE = "Teslimat onaylandı; giriş bilgileri güvenli biçimde kaldırıldı.";

export class CredentialDeliveryHttpError extends Error {
    readonly status: number;

    constructor(status: number) {
        super("credential_delivery_failed");
        this.name = "CredentialDeliveryHttpError";
        this.status = status;
    }
}

interface CredentialDeliveryActionOptions<T extends { deliveryGeneration: string }> {
    request: (credential: T) => Promise<number>;
    onRemove: (generation: string, notice: string) => void;
}

export function createCredentialDeliveryAction<T extends { deliveryGeneration: string }>(
    options: CredentialDeliveryActionOptions<T>,
) {
    return async function deliverCredential(credential: T): Promise<"delivered" | "stale"> {
        const status = await options.request(credential);
        if (status === 409) {
            options.onRemove(credential.deliveryGeneration, STALE_CREDENTIAL_NOTICE);
            return "stale";
        }
        if (status < 200 || status >= 300) throw new CredentialDeliveryHttpError(status);
        options.onRemove(credential.deliveryGeneration, DELIVERED_CREDENTIAL_NOTICE);
        return "delivered";
    };
}

export function removeCredentialGeneration<T extends { deliveryGeneration: string }>(
    credentials: readonly T[],
    generation: string,
): T[] {
    return credentials.filter((credential) => credential.deliveryGeneration !== generation);
}

export function selectPostRemovalFocusTarget(
    previous: readonly string[],
    current: readonly string[],
    removed: string,
): string | null {
    if (current.length === 0) return null;
    const removedIndex = previous.indexOf(removed);
    if (removedIndex < 0) return current[0] ?? null;
    for (let index = removedIndex + 1; index < previous.length; index += 1) {
        const generation = previous[index];
        if (generation && current.includes(generation)) return generation;
    }
    return current[Math.min(removedIndex, current.length - 1)] ?? current[0] ?? null;
}
