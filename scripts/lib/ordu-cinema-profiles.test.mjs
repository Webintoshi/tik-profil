import assert from 'node:assert/strict';
import test from 'node:test';
import { CINEMA_PROFILES, planCinemaProfiles } from './ordu-cinema-profiles.mjs';

test('plans only the two approved Ordu cinemas with usable landlines and honest ownership', () => {
  const plan = planCinemaProfiles([]);
  assert.deepEqual(plan.map(item => item.slug), ['fatsa-cinemas', 'unye-knk-cinemas']);
  assert.deepEqual(plan.map(item => item.phone), ['+904524241920', '+904523249393']);
  for (const item of plan) {
    assert.equal(item.action, 'create');
    assert.equal(item.city, 'Ordu');
    assert.equal(item.industryId, 'cinema');
    assert.equal(item.verified, false);
    assert.equal(item.whatsapp, null);
    assert.ok(item.sources.length >= 2);
  }
});

test('repeat invocation recognizes exact profiles and never proposes an update', () => {
  const existing = CINEMA_PROFILES.map(profile => ({
    ...profile, status: 'active', source: 'public_cinema_listing', name: 'Owner edited title',
  }));
  assert.deepEqual(planCinemaProfiles(existing).map(item => item.action), ['existing', 'existing']);
  assert.equal(existing[0].name, 'Owner edited title');
});

test('refuses a slug collision instead of overwriting another business', () => {
  assert.throws(() => planCinemaProfiles([{ id: 'unrelated', slug: 'fatsa-cinemas' }]), /collision/i);
});

test('refuses to duplicate the same phone under another slug', () => {
  assert.throws(() => planCinemaProfiles([{ id: 'claimed', slug: 'my-cinema', phone: '0452 324 93 93' }]), /duplicate/i);
});

test('refuses a normalized venue alias even when the phone is missing', () => {
  assert.throws(() => planCinemaProfiles([{ id: 'old-import', slug: 'old-fatsa', name: ' FATSA PREMIER SİNEMALARI ' }]), /duplicate/i);
});

test('does not mistake Sinema Hotel or similar unrelated names for these cinemas', () => {
  assert.equal(planCinemaProfiles([{ id: 'hotel', slug: 'sinema-hotel', name: 'Sinema Hotel Ordu Otel' }]).length, 2);
});

test('refuses to reactivate an inactive approved record', () => {
  assert.throws(() => planCinemaProfiles([{ ...CINEMA_PROFILES[0], status: 'hidden' }]), /inactive/i);
});
