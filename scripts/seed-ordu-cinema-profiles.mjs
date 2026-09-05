import pg from 'pg';
import { seedCinemaProfiles } from './lib/ordu-cinema-profiles.mjs';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--apply')) throw new Error('Only --apply is supported; no argument means dry-run.');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  const plan = await seedCinemaProfiles(client, { apply: args.includes('--apply') });
  console.log(JSON.stringify({ mode: args.includes('--apply') ? 'apply' : 'dry-run',
    profiles: plan.map(({ slug, name, phone, address, action }) => ({ slug, name, phone, address, action })) }, null, 2));
} finally { await client.end(); }
