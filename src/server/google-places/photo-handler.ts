import { isValidGooglePlaceId } from "./business-photo.ts";
import type { GooglePlacePhotoMetadata } from "./photo-provider.ts";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
} as const;

interface GooglePlacePhotoHandlerDependencies {
  apiKey: string | undefined;
  isPublishedPlaceId(placeId: string): Promise<boolean>;
  getMetadata(
    placeId: string,
    apiKey: string,
  ): Promise<GooglePlacePhotoMetadata | null>;
  resolveMedia(resourceName: string, apiKey: string): Promise<string | null>;
}

function emptyResponse(status: number): Response {
  return new Response(null, { status, headers: NO_STORE_HEADERS });
}

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE_HEADERS });
}

export function createGooglePlacePhotoHandler(
  dependencies: GooglePlacePhotoHandlerDependencies,
) {
  async function authorize(placeId: string): Promise<string | null> {
    const normalized = placeId.trim();
    if (!dependencies.apiKey || !isValidGooglePlaceId(normalized)) return null;
    return (await dependencies.isPublishedPlaceId(normalized))
      ? normalized
      : null;
  }

  return {
    async media(placeId: string): Promise<Response> {
      if (!dependencies.apiKey) return emptyResponse(503);
      try {
        const authorizedPlaceId = await authorize(placeId);
        if (!authorizedPlaceId) return emptyResponse(404);
        const metadata = await dependencies.getMetadata(
          authorizedPlaceId,
          dependencies.apiKey,
        );
        if (!metadata) return emptyResponse(404);
        const mediaUrl = await dependencies.resolveMedia(
          metadata.resourceName,
          dependencies.apiKey,
        );
        if (!mediaUrl) return emptyResponse(404);
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
