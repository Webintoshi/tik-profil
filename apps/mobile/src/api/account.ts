import { CustomerApiError } from "./customer";

const API_BASE_URL = process.env.EXPO_PUBLIC_TIKPROFIL_API_URL ?? "https://tikprofil.com";
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

export interface AccountAvatarAsset {
  uri: string;
  file?: File;
  fileName?: string | null;
  fileSize?: number;
  mimeType?: string | null;
}

function resolveEndpoint(path: string): string {
  return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
}

function inferFileName(asset: AccountAvatarAsset): string {
  if (asset.fileName) return asset.fileName;
  if (asset.file?.name) return asset.file.name;

  const extension = asset.mimeType?.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  return `profil-fotografi.${extension}`;
}

function inferMimeType(asset: AccountAvatarAsset): string {
  return asset.mimeType || asset.file?.type || "image/jpeg";
}

function validateAvatar(asset: AccountAvatarAsset): void {
  const size = asset.fileSize ?? asset.file?.size;
  if (size && size > MAX_AVATAR_SIZE) {
    throw new Error("Profil fotoğrafı en fazla 2MB olabilir.");
  }
}

export async function uploadAccountAvatar(asset: AccountAvatarAsset, accessToken: string): Promise<string> {
  validateAvatar(asset);

  const formData = new FormData();
  const fileName = inferFileName(asset);
  const mimeType = inferMimeType(asset);

  if (asset.file) {
    formData.append("file", asset.file, fileName);
  } else {
    formData.append("file", {
      uri: asset.uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
  }

  const response = await fetch(resolveEndpoint("/api/mobile/account/avatar"), {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success || !data?.imageUrl) {
    throw new CustomerApiError(response.status, data);
  }

  return data.imageUrl as string;
}
