import path from 'node:path';
import dotenv from 'dotenv';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function assertEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

const accountId = assertEnv('CLOUDFLARE_R2_ACCOUNT_ID');
const bucket = assertEnv('CLOUDFLARE_R2_BUCKET_NAME');

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: assertEnv('CLOUDFLARE_R2_ACCESS_KEY_ID'),
    secretAccessKey: assertEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
  },
});

async function listAll(prefix?: string): Promise<{ total: number; commonPrefixes: string[] }> {
  let continuationToken: string | undefined;
  let total = 0;
  const commonPrefixSet = new Set<string>();

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        Delimiter: '/',
        MaxKeys: 1000,
      })
    );

    total += res.Contents?.length ?? 0;
    for (const p of res.CommonPrefixes ?? []) {
      if (p.Prefix) commonPrefixSet.add(p.Prefix);
    }
    continuationToken = res.NextContinuationToken;
  } while (continuationToken);

  return { total, commonPrefixes: Array.from(commonPrefixSet).sort() };
}

async function countRecursive(prefix?: string): Promise<number> {
  let continuationToken: string | undefined;
  let total = 0;

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    );

    total += res.Contents?.length ?? 0;
    continuationToken = res.NextContinuationToken;
  } while (continuationToken);

  return total;
}

async function main() {
  const root = await listAll();
  const totalObjects = await countRecursive();
  console.log('R2 Inventory');
  console.log('------------');
  console.log('Bucket:', bucket);
  console.log('Objects in bucket root (non-recursive):', root.total);
  console.log('Objects in bucket (recursive):', totalObjects);
  console.log('Top-level prefixes:');
  for (const p of root.commonPrefixes) console.log('-', p);

  for (const p of root.commonPrefixes) {
    const res = await listAll(p);
    const recursiveCount = await countRecursive(p);
    console.log('');
    console.log(`Prefix: ${p}`);
    console.log('Objects (non-recursive):', res.total);
    console.log('Objects (recursive):', recursiveCount);
    if (res.commonPrefixes.length) {
      console.log('Child prefixes:', res.commonPrefixes.slice(0, 30).join(', '));
      if (res.commonPrefixes.length > 30) console.log(`(and ${res.commonPrefixes.length - 30} more)`);
    }
  }
}

main().catch((err) => {
  console.error('Inventory failed:', err);
  process.exit(1);
});
