import { randomUUID } from "crypto";
import { headers } from "next/headers";

import { checkRateLimit } from "@/lib/rateLimit";
import { uploadBytesToR2WithKey } from "@/lib/r2Storage";
import { isAllowedMimeType } from "@/lib/uploadConfig";
import { requireCustomer } from "@/server/auth/guards";
import { createAvatarUploadHandler } from "./avatar-handler";

export const runtime = "nodejs";

const handleAvatarUpload = createAvatarUploadHandler({
  checkRateLimit: (ip) => checkRateLimit(ip, "account-avatar-upload"),
  isAllowedMimeType,
  now: () => new Date(),
  randomUuid: randomUUID,
  requireCustomer,
  upload: uploadBytesToR2WithKey
});

export async function POST(request: Request) {
  return handleAvatarUpload(request, await headers());
}
