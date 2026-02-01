import { NextResponse } from "next/server";

type Candidate = {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
};

function norm(s: string) {
    return (s || "")
        .toLowerCase()
        .replaceAll("ı", "i")
        .replaceAll("ğ", "g")
        .replaceAll("ü", "u")
        .replaceAll("ş", "s")
        .replaceAll("ö", "o")
        .replaceAll("ç", "c")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizePhone(phone: string): string {
    // Remove all non-digits
    return (phone || "").replace(/\D/g, "");
}

function phoneMatch(bizPhone: string, googlePhone: string): boolean {
    const p1 = normalizePhone(bizPhone);
    const p2 = normalizePhone(googlePhone);
    if (!p1 || !p2) return false;
    // Check if last 10 digits match (ignore country code)
    const last10_1 = p1.slice(-10);
    const last10_2 = p2.slice(-10);
    return last10_1 === last10_2;
}

function scoreMatch(name: string, address: string, phone: string, c: Candidate): number {
    const n1 = norm(name);
    const a1 = norm(address);
    const n2 = norm(c.displayName?.text || "");
    const a2 = norm(c.formattedAddress || "");

    let score = 0;

    // Phone match is strongest signal (+100)
    const googlePhone = c.nationalPhoneNumber || c.internationalPhoneNumber || "";
    if (phone && phoneMatch(phone, googlePhone)) {
        score += 100;
    }

    // Name match (+70)
    if (n2 && (n2.includes(n1) || n1.includes(n2))) {
        score += 70;
    }

    // Address overlap: count shared tokens (+max 30)
    const a1t = new Set(a1.split(" ").filter(Boolean));
    const a2t = new Set(a2.split(" ").filter(Boolean));
    let shared = 0;
    for (const t of a1t) if (a2t.has(t)) shared++;
    score += Math.min(30, shared * 4);

    return score;
}

export async function POST(req: Request) {
    try {
        const { businessName, address, phone, pageSize = 5 } = await req.json();

        if (!process.env.GOOGLE_MAPS_API_KEY) {
            return NextResponse.json({ error: "Missing GOOGLE_MAPS_API_KEY" }, { status: 500 });
        }
        if (!businessName) {
            return NextResponse.json({ error: "businessName is required" }, { status: 400 });
        }

        // Build search query
        const textQuery = [businessName, address].filter(Boolean).join(" ");

        // Places API Text Search (New)
        const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
                "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber",
            },
            body: JSON.stringify({
                textQuery,
                pageSize: Math.max(1, Math.min(20, pageSize)),
                languageCode: "tr",
            }),
        });

        if (!resp.ok) {
            const txt = await resp.text();
            console.error("Places API error:", txt);
            return NextResponse.json({ error: "Places API error", details: txt }, { status: 502 });
        }

        const data = await resp.json();
        const places: Candidate[] = data.places || [];

        if (!places.length) {
            return NextResponse.json({
                ok: false,
                reason: "no_results",
                message: "Google'da işletme bulunamadı",
                candidates: [],
            });
        }

        // Rank by score
        const ranked = places
            .map((p) => ({
                place: p,
                score: scoreMatch(businessName, address || "", phone || "", p),
            }))
            .sort((a, b) => b.score - a.score);

        const best = ranked[0];
        const placeId = best?.place?.id;

        if (!placeId) {
            return NextResponse.json({
                ok: false,
                reason: "no_place_id",
                message: "Place ID bulunamadı",
                candidates: [],
            });
        }

        // Google review URLs
        const writeReviewUrl = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
        const reviewsUrl = `https://search.google.com/local/reviews?placeid=${encodeURIComponent(placeId)}`;

        // Only return if confidence is high enough
        const isConfident = best.score >= 70; // At least name match

        return NextResponse.json({
            ok: true,
            placeId,
            confidenceScore: best.score,
            isConfident,
            writeReviewUrl,
            reviewsUrl,
            bestMatch: {
                name: best.place.displayName?.text,
                formattedAddress: best.place.formattedAddress,
                phone: best.place.nationalPhoneNumber || best.place.internationalPhoneNumber,
            },
            // Top 3 candidates for verification
            candidates: ranked.slice(0, 3).map((r) => ({
                score: r.score,
                placeId: r.place.id,
                name: r.place.displayName?.text,
                formattedAddress: r.place.formattedAddress,
                writeReviewUrl: r.place.id
                    ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(r.place.id)}`
                    : null,
                reviewsUrl: r.place.id
                    ? `https://search.google.com/local/reviews?placeid=${encodeURIComponent(r.place.id)}`
                    : null,
            })),
        });
    } catch (error) {
        console.error("Google Places API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
