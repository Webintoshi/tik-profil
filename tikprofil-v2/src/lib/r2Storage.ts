import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let r2Client: S3Client | undefined;

function assertEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Please check your .env.local file.`);
  }
  return value;
}

function getR2Client(): S3Client {
  if (r2Client) return r2Client;

  try {
    const accountId = assertEnv('CLOUDFLARE_R2_ACCOUNT_ID');
    const accessKeyId = assertEnv('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = assertEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY');

    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    return r2Client;
  } catch (error) {
    console.error('[R2Storage] Failed to initialize R2 client:', error);
    throw error;
  }
}

function getBucketName(): string {
  return assertEnv('CLOUDFLARE_R2_BUCKET_NAME');
}

function getPublicBaseUrl(): string {
  return assertEnv('CLOUDFLARE_R2_PUBLIC_URL');
}

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export function buildObjectKey(moduleName: string, businessId: string, fileName: string): string {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${moduleName}/${businessId}/${timestamp}_${safeName}`;
}

export async function uploadBytesToR2(params: {
  bytes: Uint8Array;
  contentType: string;
  fileName: string;
  moduleName: string;
  businessId: string;
}): Promise<{ url: string; key: string }> {
  const key = buildObjectKey(params.moduleName, params.businessId, params.fileName);
  return await uploadBytesToR2WithKey({
    key,
    bytes: params.bytes,
    contentType: params.contentType,
  });
}

export async function uploadBytesToR2WithKey(params: {
  key: string;
  bytes: Uint8Array;
  contentType: string;
}): Promise<{ url: string; key: string }> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: params.key,
    Body: params.bytes,
    ContentType: params.contentType,
  });

  await getR2Client().send(command);

  const publicUrl = `${getPublicBaseUrl()}/${params.key}`;
  return { url: publicUrl, key: params.key };
}

export async function uploadToR2(
  fileBlob: Blob,
  fileName: string,
  moduleName: string,
  businessId: string
): Promise<string> {
  const { url } = await uploadBytesToR2({
    bytes: new Uint8Array(await fileBlob.arrayBuffer()),
    contentType: fileBlob.type,
    fileName,
    moduleName,
    businessId,
  });

  return url;
}

export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  await getR2Client().send(command);
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  return await getSignedUrl(getR2Client(), command, { expiresIn });
}

export async function getPresignedUploadUrl(params: {
  key: string;
  contentType: string;
  expiresIn?: number;
}): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: getBucketName(),
      Key: params.key,
      ContentType: params.contentType,
    });

    return await getSignedUrl(getR2Client(), command, { expiresIn: params.expiresIn ?? 900 });
  } catch (error) {
    console.error('[R2Storage] getPresignedUploadUrl error:', error);
    throw error;
  }
}

export function getPublicUrlForKey(key: string): string {
  return `${getPublicBaseUrl()}/${key}`;
}

export async function existsInR2(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    });
    await getR2Client().send(command);
    return true;
  } catch {
    return false;
  }
}
