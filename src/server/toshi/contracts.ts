import { z } from "zod";

export const toshiChatMessageSchema = z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(1_200),
});

export const toshiDiscoveryContextSchema = z.object({
    city: z.string().trim().min(1).max(80),
    radiusKm: z.number().finite().min(1).max(50),
    district: z.string().trim().max(100).optional(),
    screen: z.string().trim().max(160).optional(),
    businessSlug: z.string().trim().max(200).optional(),
    coordinates: z.object({
        lat: z.number().finite().min(-90).max(90),
        lng: z.number().finite().min(-180).max(180),
    }).optional(),
});

export const toshiChatRequestSchema = z.object({
    protocolVersion: z.literal(2).optional(),
    conversationId: z.string().uuid().optional(),
    messages: z.array(toshiChatMessageSchema).min(1).max(8),
    context: toshiDiscoveryContextSchema,
}).superRefine((value, context) => {
    if (value.messages.at(-1)?.role !== "user") {
        context.addIssue({
            code: "custom",
            message: "Sohbetin son mesajı kullanıcıya ait olmalıdır.",
            path: ["messages"],
        });
    }
});

export type ToshiChatMessage = z.infer<typeof toshiChatMessageSchema>;
export type ToshiDiscoveryContext = z.infer<typeof toshiDiscoveryContextSchema>;
export type ToshiChatRequest = z.infer<typeof toshiChatRequestSchema>;

export interface ToshiRecommendation {
    id: string;
    slug: string;
    name: string;
    categoryLabel: string;
    district: string | null;
    city: string | null;
    distance: number | null;
    rating: number | null;
    reviewCount: number | null;
    coverImage: string | null;
    logoUrl: string | null;
    reason: string;
}

export interface ToshiChatReply {
    message: string;
    source: "rules" | "ai" | "fallback";
    recommendations: ToshiRecommendation[];
    conversationId?: string;
    cards?: ToshiActionCard[];
    sources?: Array<{ title: string; url: string }>;
    capabilities?: { discovery: boolean; personal: boolean; transactions: boolean };
}

export interface ToshiActionCard {
    id: string;
    type: "navigation" | "confirmation";
    title: string;
    description?: string;
    imageUrl?: string;
    href?: string;
    actionId?: string;
}

export interface ToshiChatResponse {
    data: ToshiChatReply;
}

export function parseToshiChatRequest(value: unknown): ToshiChatRequest {
    return toshiChatRequestSchema.parse(value);
}
