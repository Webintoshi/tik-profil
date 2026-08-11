import { createHmac } from "node:crypto";

export interface ImgproxyConfig {
    baseUrl: string;
    keyHex: string;
    saltHex: string;
    sourceBaseUrl: string;
}

export interface ImageResizeOptions {
    fit?: "fill" | "fit";
    height?: number;
    width: number;
}

function boundedDimension(value: number | undefined): number {
    if (!value || !Number.isFinite(value)) return 0;
    return Math.min(1600, Math.max(96, Math.round(value)));
}

function isHex(value: string): boolean {
    return value.length > 0 && value.length % 2 === 0 && /^[a-f0-9]+$/i.test(value);
}

function isOwnedSource(source: URL, allowedBase: URL): boolean {
    const allowedPath = allowedBase.pathname.endsWith("/")
        ? allowedBase.pathname
        : `${allowedBase.pathname}/`;
    return source.protocol === "https:"
        && source.origin === allowedBase.origin
        && source.pathname.startsWith(allowedPath);
}

export function buildOptimizedOwnedImageUrl(
    sourceUrl: string,
    options: ImageResizeOptions,
    config: ImgproxyConfig | null,
): string {
    if (!config || !isHex(config.keyHex) || !isHex(config.saltHex)) return sourceUrl;

    try {
        const source = new URL(sourceUrl);
        const allowedBase = new URL(config.sourceBaseUrl);
        if (!isOwnedSource(source, allowedBase)) return sourceUrl;

        const width = boundedDimension(options.width);
        const height = boundedDimension(options.height);
        const fit = options.fit === "fill" ? "fill" : "fit";
        const encodedSource = Buffer.from(source.toString()).toString("base64url");
        const unsignedPath = `/rs:${fit}:${width}:${height}:0/g:sm/q:82/${encodedSource}.webp`;
        const signature = createHmac("sha256", Buffer.from(config.keyHex, "hex"))
            .update(Buffer.from(config.saltHex, "hex"))
            .update(unsignedPath)
            .digest("base64url");

        return new URL(`/${signature}${unsignedPath}`, config.baseUrl).toString();
    } catch {
        return sourceUrl;
    }
}

export function getImgproxyConfig(): ImgproxyConfig | null {
    const baseUrl = process.env.IMAGE_PROXY_URL?.trim();
    const keyHex = process.env.IMAGE_PROXY_KEY?.trim();
    const saltHex = process.env.IMAGE_PROXY_SALT?.trim();
    const sourceBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim();
    return baseUrl && keyHex && saltHex && sourceBaseUrl
        ? { baseUrl, keyHex, saltHex, sourceBaseUrl }
        : null;
}

export function optimizeOwnedImageUrl(
    sourceUrl: string | null | undefined,
    options: ImageResizeOptions,
): string | null {
    if (!sourceUrl) return null;
    return buildOptimizedOwnedImageUrl(sourceUrl, options, getImgproxyConfig());
}
