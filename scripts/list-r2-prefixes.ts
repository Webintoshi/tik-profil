import path from 'node:path';
import dotenv from 'dotenv';
import { ListObjectsV2Command, S3Client, type ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function assertEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

const accountId = assertEnv('CLOUDFLARE_R2_ACCOUNT_ID');
const accessKeyId = assertEnv('CLOUDFLARE_R2_ACCESS_KEY_ID');
const secretAccessKey = assertEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
const bucket = assertEnv('CLOUDFLARE_R2_BUCKET_NAME');

const prefixArg = process.argv.find((a) => a.startsWith('--prefix='));
const prefix = prefixArg ? prefixArg.split('=')[1] : '';

async function main() {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const delimiter = '/';
  const prefixes = new Set<string>();

  let continuationToken: string | undefined = undefined;
  for (let page = 0; page < 50; page++) {
    const res: ListObjectsV2CommandOutput = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix || undefined,
        Delimiter: delimiter,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    );

    for (const p of res.CommonPrefixes || []) {
      if (p.Prefix) prefixes.add(p.Prefix);
    }

    if (!res.IsTruncated) break;
    continuationToken = res.NextContinuationToken;
  }

  console.log('R2 Prefix List');
  console.log('-------------');
  console.log('Bucket:', bucket);
  console.log('Prefix filter:', prefix || '(root)');
  console.log('');

  const list = Array.from(prefixes).sort();
  if (!list.length) {
    console.log('No prefixes found (or bucket is empty for this prefix).');
    return;
  }

  for (const p of list) console.log('-', p);
}

main().catch((err) => {
  console.error('Failed:', err?.message || err);
  process.exit(1);
});
