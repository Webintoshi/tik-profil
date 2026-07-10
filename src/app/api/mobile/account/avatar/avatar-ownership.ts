interface AvatarFileIdentity {
  name: string;
  type: string;
}

interface AvatarKeyDependencies {
  now: Date;
  uuid: string;
}

function getExtension(fileName: string, contentType: string): string {
  const currentExtension = fileName.split(".").pop()?.toLowerCase();
  if (currentExtension && /^[a-z0-9]{2,5}$/.test(currentExtension)) return currentExtension;
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  if (contentType === "image/avif") return "avif";
  return "jpg";
}

export function buildCustomerAvatarKey(
  appUserId: string,
  file: AvatarFileIdentity,
  dependencies: AvatarKeyDependencies
): string {
  const customerSegment = appUserId.replace(/[^a-zA-Z0-9-]/g, "");
  if (!customerSegment) throw new Error("Invalid customer identifier");
  const extension = getExtension(file.name, file.type);
  const baseName = file.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 48) || "avatar";
  const dateSegment = dependencies.now.toISOString().slice(0, 7);
  return `account-avatars/customers/${customerSegment}/${dateSegment}/${dependencies.uuid}_${baseName}.${extension}`;
}
