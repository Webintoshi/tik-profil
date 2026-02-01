import {
  getUploadLimit,
  isAllowedMimeType,
  type UploadModule,
} from "./uploadConfig";

export interface DirectUploadResult {
  url: string;
  key: string;
}

export function validateUploadFile(file: File, moduleName: UploadModule): string | null {
  if (!isAllowedMimeType(file.type)) {
    return "Geçersiz dosya türü";
  }
  const maxSize = getUploadLimit(moduleName);
  if (maxSize > 0 && file.size > maxSize) {
    const sizeMB = Math.round(maxSize / (1024 * 1024));
    return `Dosya boyutu en fazla ${sizeMB}MB olabilir`;
  }
  return null;
}

async function uploadDirect(file: File, moduleName: UploadModule): Promise<DirectUploadResult> {
  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      module: moduleName,
      fileName: file.name,
      contentType: file.type,
      size: file.size,
    }),
  });

  const signData = await signRes.json().catch(() => null);
  if (!signRes.ok || !signData?.uploadUrl || !signData?.publicUrl || !signData?.key) {
    const errorMessage = signData?.error || "Upload sign failed";
    throw new Error(errorMessage);
  }

  const putRes = await fetch(signData.uploadUrl as string, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error("Direct upload failed");
  }

  return { url: signData.publicUrl as string, key: signData.key as string };
}

async function uploadLegacy(
  file: File,
  endpoint: string,
  extraFields?: Record<string, string>
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  if (extraFields) {
    Object.entries(extraFields).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const res = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });
  const data = await res.json().catch(() => null);
  const url = data?.url || data?.imageUrl;

  if (!res.ok || !data?.success || !url) {
    const errorMessage = data?.error || "Upload failed";
    throw new Error(errorMessage);
  }

  return url as string;
}

export async function uploadImageWithFallback(params: {
  file: File;
  moduleName: UploadModule;
  fallbackEndpoint?: string;
  fallbackFields?: Record<string, string>;
}): Promise<DirectUploadResult> {
  const validationError = validateUploadFile(params.file, params.moduleName);
  if (validationError) {
    throw new Error(validationError);
  }

  try {
    return await uploadDirect(params.file, params.moduleName);
  } catch (error) {
    if (!params.fallbackEndpoint) {
      throw error;
    }
    const url = await uploadLegacy(
      params.file,
      params.fallbackEndpoint,
      params.fallbackFields
    );
    return { url, key: "" };
  }
}
