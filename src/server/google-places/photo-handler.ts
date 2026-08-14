import { isValidGooglePlaceId } from "./business-photo.ts";
import type { GooglePlacePhotoMetadata } from "./photo-provider.ts";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
} as const;

interface GooglePlacePhotoHandlerDependencies {
  apiKey: string | undefined;
  isPublishedPlaceId(placeId: string): Promise<boolean>;
  getCachedMedia?(placeId: string, requestedWidth: number): Promise<{
    maxAgeSeconds: number;
    url: string;
  } | null>;
  getMetadata(
    placeId: string,
    apiKey: string,
  ): Promise<GooglePlacePhotoMetadata | null>;
  resolveMedia(
    resourceName: string,
    apiKey: string,
    width: number,
  ): Promise<string | null>;
  storeCachedMedia?(input: {
    mediaUrl: string;
    metadata: GooglePlacePhotoMetadata;
    placeId: string;
    requestedWidth: number;
  }): Promise<{
    maxAgeSeconds: number;
    url: string;
  }>;
}

function emptyResponse(status: number): Response {
  return new Response(null, { status, headers: NO_STORE_HEADERS });
}

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE_HEADERS });
}

function cachedRedirect(url: string, maxAgeSeconds: number): Response {
  const maxAge = Math.max(60, Math.min(86_400, Math.floor(maxAgeSeconds)));
  return new Response(null, {
    status: 302,
    headers: {
      "Cache-Control": `public, max-age=${maxAge}`,
      Location: url,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function createGooglePlacePhotoHandler(
  dependencies: GooglePlacePhotoHandlerDependencies,
) {
  async function authorize(placeId: string): Promise<string | null> {
    const normalized = placeId.trim();
    if (!isValidGooglePlaceId(normalized)) return null;
    return (await dependencies.isPublishedPlaceId(normalized))
      ? normalized
      : null;
  }

  return {
    async media(placeId: string, requestedWidth = 960): Promise<Response> {
      try {
        const authorizedPlaceId = await authorize(placeId);
        if (!authorizedPlaceId) return emptyResponse(404);
        const cached = await dependencies.getCachedMedia?.(
          authorizedPlaceId,
          requestedWidth,
        ).catch(() => null);
        if (cached) return cachedRedirect(cached.url, cached.maxAgeSeconds);
        if (!dependencies.apiKey) return emptyResponse(503);
        const metadata = await dependencies.getMetadata(
          authorizedPlaceId,
          dependencies.apiKey,
        );
        if (!metadata) return emptyResponse(404);
        const mediaUrl = await dependencies.resolveMedia(
          metadata.resourceName,
          dependencies.apiKey,
          requestedWidth,
        );
        if (!mediaUrl) return emptyResponse(404);
        const stored = await dependencies.storeCachedMedia?.({
          mediaUrl,
          metadata,
          placeId: authorizedPlaceId,
          requestedWidth,
        }).catch(() => null);
        if (stored) return cachedRedirect(stored.url, stored.maxAgeSeconds);
        return new Response(null, {
          status: 302,
          headers: { ...NO_STORE_HEADERS, Location: mediaUrl },
        });
      } catch {
        return emptyResponse(502);
      }
    },

    async metadata(placeId: string): Promise<Response> {
      if (!dependencies.apiKey) return emptyResponse(503);
      try {
        const authorizedPlaceId = await authorize(placeId);
        if (!authorizedPlaceId) return emptyResponse(404);
        const metadata = await dependencies.getMetadata(
          authorizedPlaceId,
          dependencies.apiKey,
        );
        if (!metadata) return emptyResponse(404);
        return jsonResponse({
          success: true,
          sourceUrl: metadata.sourceUrl,
          authorAttributions: metadata.authorAttributions,
        });
      } catch {
        return emptyResponse(502);
      }
    },
  };
}
