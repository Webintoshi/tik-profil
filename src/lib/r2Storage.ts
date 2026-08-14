import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'node:crypto';
import { buildContentAddressedMediaKey } from '@/server/media/media-upload-policy';

let r2Client: S3Client | undefined;

function assertEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getR2Client(): S3Client {
  if (r2Client) return r2Client;

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
  const key = buildContentAddressedMediaKey({
    businessId: params.businessId,
    contentSha256: createHash('sha256').update(params.bytes).digest('hex'),
    contentType: params.contentType,
    fileName: params.fileName,
    moduleName: params.moduleName,
  });
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
  cacheControl?: string;
  expires?: Date;
  metadata?: Record<string, string>;
}): Promise<{ url: string; key: string }> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: params.key,
    Body: params.bytes,
    ContentType: params.contentType,
    CacheControl: params.cacheControl ?? 'public, max-age=31536000, immutable',
    ...(params.expires ? { Expires: params.expires } : {}),
    ...(params.metadata ? { Metadata: params.metadata } : {}),
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
  cacheControl?: string;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: params.key,
    ContentType: params.contentType,
    ...(params.cacheControl ? { CacheControl: params.cacheControl } : {}),
  });

  return await getSignedUrl(getR2Client(), command, { expiresIn: params.expiresIn ?? 900 });
}

export async function getObjectBytesFromR2(key: string): Promise<{
  bytes: Uint8Array;
  contentType: string | undefined;
}> {
  const result = await getR2Client().send(new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  }));
  if (!result.Body) throw new Error('r2_object_body_missing');
  return {
    bytes: await result.Body.transformToByteArray(),
    contentType: result.ContentType,
  };
}

export async function getObjectMetadataFromR2(key: string): Promise<{
  contentType: string | undefined;
  lastModified: Date | undefined;
  metadata: Record<string, string> | undefined;
  size: number;
}> {
  const result = await getR2Client().send(new HeadObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  }));
  return {
    contentType: result.ContentType,
    lastModified: result.LastModified,
    metadata: result.Metadata,
    size: result.ContentLength ?? -1,
  };
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
