import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import { seedCinemaProfiles } from './ordu-cinema-profiles.mjs';

// Only connection-private TEMP tables are mutated. Real public rows are never copied or changed.
async function withTempTables(run) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('CREATE TEMP TABLE businesses (LIKE public.businesses INCLUDING ALL)');
    await client.query('CREATE TEMP TABLE business_discovery_profiles (LIKE public.business_discovery_profiles INCLUDING ALL)');
    await run(client);
  } finally { await client.end(); }
}

test('dry run leaves PostgreSQL rows untouched; apply creates two unclaimed profiles and repeat preserves owner edits',
  { skip: !process.env.DATABASE_URL }, async () => withTempTables(async client => {
    const dryRun = await seedCinemaProfiles(client);
    assert.equal(dryRun.length, 2);
    assert.equal((await client.query('SELECT count(*)::int AS count FROM pg_temp.businesses')).rows[0].count, 0);
    await seedCinemaProfiles(client, { apply: true });
    const rows = (await client.query('SELECT slug, phone, whatsapp, is_verified, industry_id FROM pg_temp.businesses ORDER BY slug')).rows;
    assert.deepEqual(rows, [
      { slug: 'fatsa-cinemas', phone: '+904524241920', whatsapp: null, is_verified: false, industry_id: 'cinema' },
      { slug: 'unye-knk-cinemas', phone: '+904523249393', whatsapp: null, is_verified: false, industry_id: 'cinema' },
    ]);
    const discovery = (await client.query('SELECT claim_state, discover_status FROM pg_temp.business_discovery_profiles')).rows;
    assert.equal(discovery.length, 2);
    assert.ok(discovery.every(row => row.claim_state === 'unclaimed' && row.discover_status === 'published'));
    const policies = (await client.query('SELECT legacy_source FROM pg_temp.businesses')).rows;
    assert.ok(policies.every(row => row.legacy_source.isVerified === false && row.legacy_source.whatsappEnabled === false));
    await client.query("UPDATE pg_temp.businesses SET name='Owner edited title' WHERE slug='fatsa-cinemas'");
    assert.deepEqual((await seedCinemaProfiles(client, { apply: true })).map(item => item.action), ['existing', 'existing']);
    assert.equal((await client.query("SELECT name FROM pg_temp.businesses WHERE slug='fatsa-cinemas'")).rows[0].name, 'Owner edited title');
  }));

test('a collision leaves no partially created profile in PostgreSQL',
  { skip: !process.env.DATABASE_URL }, async () => withTempTables(async client => {
    await client.query("INSERT INTO pg_temp.businesses (id, slug, name) VALUES ('unrelated', 'unye-knk-cinemas', 'Unrelated owner')");
    await assert.rejects(seedCinemaProfiles(client, { apply: true }), /collision/i);
    assert.deepEqual((await client.query('SELECT slug, name FROM pg_temp.businesses')).rows,
      [{ slug: 'unye-knk-cinemas', name: 'Unrelated owner' }]);
    assert.equal((await client.query('SELECT count(*)::int AS count FROM pg_temp.business_discovery_profiles')).rows[0].count, 0);
  }));
