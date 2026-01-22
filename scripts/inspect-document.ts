import path from 'node:path';
import dotenv from 'dotenv';
import { getDocumentREST } from '../src/lib/documentStore';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function getArgValue(flag: string): string | undefined {
  const arg = process.argv.find((a) => a === flag || a.startsWith(`${flag}=`));
  if (!arg) return undefined;
  if (arg === flag) {
    const idx = process.argv.indexOf(arg);
    const next = process.argv[idx + 1];
    return next && !next.startsWith('--') ? next : undefined;
  }
  return arg.split('=')[1];
}

const collection = getArgValue('--collection');
const id = getArgValue('--id');

async function main() {
  if (!collection || !id) {
    console.log('Usage: npx tsx scripts/inspect-document.ts --collection=<name> --id=<docId>');
    process.exit(1);
  }
  const doc = await getDocumentREST(collection, id);
  if (!doc) {
    console.log('Not found');
    return;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (typeof v === 'string' && v.startsWith('data:image/')) {
      out[k] = `${v.slice(0, 40)}...(${v.length} chars)`;
    } else {
      out[k] = v;
    }
  }
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error('Failed:', err?.message || err);
  process.exit(1);
});

