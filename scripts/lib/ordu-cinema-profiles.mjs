// A bounded, create-only list. Never infer owner verification, WhatsApp, reviews or opening hours.
export const CINEMA_PROFILES = [
  {
    id: 'cinema_ordu_fatsa_cinemas', slug: 'fatsa-cinemas', name: 'Fatsa Cinemas',
    aliases: ['Fatsa Cinemas', 'Fatsa Premier Sinemaları', 'Fatsa City Premier'],
    phone: '+904524241920', city: 'Ordu', district: 'Fatsa', industryId: 'cinema',
    address: 'Mustafakemalpaşa Mahallesi, Yeni Kumru Cd. No:4, 52400 Fatsa/Ordu',
    sources: [
      'https://biletinial.com/tr-tr/mekan/fatsa-premier-sinemalari',
      'https://boxofficeturkiye.com/sinema/fatsa-cinemas--494',
    ],
    contactEvidence: 'Venue phone published by Biletinial; address corroborated by public cinema listings.',
    verified: false, whatsapp: null,
  },
  {
    id: 'cinema_ordu_unye_knk_cinemas', slug: 'unye-knk-cinemas', name: 'Ünye KNK Cinemas',
    aliases: ['Ünye KNK Cinemas', 'Ünye KNK Sinemaları', 'Ünye TME Cinemas', 'TME Sinema Ünye'],
    phone: '+904523249393', city: 'Ordu', district: 'Ünye', industryId: 'cinema',
    address: 'Kaledere Mah. Belediye Cad. No:37/301 Üniport AVM, Ünye/Ordu',
    sources: [
      'https://biletinial.com/tr-tr/mekan/unye-knk-cinemas',
      'https://unyebul.com/unye-knk-cinemas-sinema-salonu/',
      'https://yandex.com/maps/org/tme_sinema_nye/170240359558/',
    ],
    contactEvidence: 'Phone cross-checked in UnyeBul and the same-address Yandex listing; not owner-confirmed. Biletinial placeholder rejected.',
    verified: false, whatsapp: null,
  },
];

function normalizeName(value = '') {
  return value.toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizePhone(value = '') {
  return (value ?? '').replace(/\D/g, '').slice(-10);
}

export function planCinemaProfiles(existing) {
  return CINEMA_PROFILES.map(profile => {
    const aliases = new Set(profile.aliases.map(normalizeName));
    const own = existing.find(row => row.id === profile.id || row.slug === profile.slug);
    if (own && (own.id !== profile.id || own.slug !== profile.slug)) {
      throw new Error(`Cinema profile collision: ${profile.slug}`);
    }
    const duplicate = existing.find(row => row.id !== profile.id && (
      aliases.has(normalizeName(row.name)) || normalizePhone(row.phone) === normalizePhone(profile.phone)
    ));
    if (duplicate) throw new Error(`Cinema duplicate requires review: ${profile.slug} / ${duplicate.slug}`);
    if (own && own.status !== 'active') throw new Error(`Cinema profile is inactive: ${profile.slug}`);
    return { ...profile, action: own ? 'existing' : 'create' };
  });
}

export async function seedCinemaProfiles(client, { apply = false } = {}) {
  await client.query(apply ? 'BEGIN' : 'BEGIN READ ONLY');
  try {
    if (apply) await client.query("SELECT pg_advisory_xact_lock(hashtext('ordu-cinema-profiles-20260905'))");
    const existing = await client.query('SELECT id, slug, name, phone, status FROM businesses');
    const plan = planCinemaProfiles(existing.rows);
    if (apply) {
      for (const profile of plan.filter(item => item.action === 'create')) {
        const evidence = {
          sources: profile.sources, contactEvidence: profile.contactEvidence,
          checkedAt: new Date().toISOString(), ownerVerified: false,
          isVerified: false, whatsappEnabled: false,
        };
        await client.query(`
          INSERT INTO businesses (
            id, slug, name, phone, whatsapp, status, industry_id, industry_label,
            address, city, district, maps_url, is_verified, source, legacy_source, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, NULL, 'active', $5, 'Sinema', $6, 'Ordu', $7, $8,
            false, 'public_cinema_listing', $9::jsonb, now(), now())
        `, [profile.id, profile.slug, profile.name, profile.phone, profile.industryId, profile.address,
          profile.district, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${profile.name} ${profile.address}`)}`,
          JSON.stringify(evidence)]);
        await client.query(`
          INSERT INTO business_discovery_profiles (
            business_id, source_type, source_ref, city, district, address,
            claim_state, discover_status, metadata, created_at, updated_at
          ) VALUES ($1, 'public_cinema_listing', $2, 'Ordu', $3, $4,
            'unclaimed', 'published', $5::jsonb, now(), now())
        `, [profile.id, profile.sources[0], profile.district, profile.address,
          JSON.stringify({ ...evidence, sectorKey: 'cinema', categoryLabel: 'Sinema' })]);
      }
    }
    await client.query('COMMIT');
    return plan;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
