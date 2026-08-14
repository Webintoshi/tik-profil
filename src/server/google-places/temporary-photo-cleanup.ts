const GOOGLE_PHOTO_PREFIX = "temporary/google-places/";
const MAX_STORAGE_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface TemporaryPhotoObject {
  key: string;
  lastModified: Date | null | undefined;
}

export async function cleanupExpiredGooglePhotoObjects(input: {
  deleteObjects(keys: string[]): Promise<void>;
  listObjects(): Promise<TemporaryPhotoObject[]>;
  now?: Date;
}): Promise<{ deleted: number; scanned: number }> {
  const now = input.now ?? new Date();
  const objects = await input.listObjects();
  const expiredKeys = objects
    .filter((object) => object.key.startsWith(GOOGLE_PHOTO_PREFIX))
    .filter((object) => {
      if (!object.lastModified) return false;
      return now.getTime() - object.lastModified.getTime() >= MAX_STORAGE_AGE_MS;
    })
    .map((object) => object.key);

  for (let index = 0; index < expiredKeys.length; index += 1000) {
    await input.deleteObjects(expiredKeys.slice(index, index + 1000));
  }

  return { deleted: expiredKeys.length, scanned: objects.length };
}
