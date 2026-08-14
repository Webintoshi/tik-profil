import "dotenv/config";

import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

import { cleanupExpiredGooglePhotoObjects } from "../src/server/google-places/temporary-photo-cleanup.ts";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_required`);
  return value;
}

const bucket = required("CLOUDFLARE_R2_BUCKET_NAME");
const client = new S3Client({
  region: "auto",
  endpoint: `https://${required("CLOUDFLARE_R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: required("CLOUDFLARE_R2_ACCESS_KEY_ID"),
    secretAccessKey: required("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
  },
});

async function listObjects() {
  const objects = [];
  let continuationToken;
  do {
    const page = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: "temporary/google-places/",
      ContinuationToken: continuationToken,
    }));
    objects.push(...(page.Contents || []).flatMap((object) => object.Key
      ? [{ key: object.Key, lastModified: object.LastModified }]
      : []));
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return objects;
}

const result = await cleanupExpiredGooglePhotoObjects({
  listObjects,
  async deleteObjects(keys) {
    if (!keys.length) return;
    await client.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
    }));
  },
});

console.log(JSON.stringify(result));
