import { getGoogleMapsApiKey } from "@/server/business-imports/env";
import { createGooglePlacePhotoHandler } from "@/server/google-places/photo-handler";
import {
  getCurrentGooglePlacePhotoMetadata,
  resolveGooglePlacePhotoMedia,
} from "@/server/google-places/photo-provider";
import { isPublishedGooglePlaceId } from "@/server/google-places/photo-repository";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ placeId: string }> },
) {
  const { placeId } = await params;
  return createGooglePlacePhotoHandler({
    apiKey: getGoogleMapsApiKey(),
    isPublishedPlaceId: isPublishedGooglePlaceId,
    getMetadata: getCurrentGooglePlacePhotoMetadata,
    resolveMedia: resolveGooglePlacePhotoMedia,
  }).media(placeId ?? "", Number(new URL(request.url).searchParams.get("width")) || 960);
}
