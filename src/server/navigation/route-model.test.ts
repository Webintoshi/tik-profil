import assert from 'node:assert/strict';
import test from 'node:test';
import { isCoordinate, parseMapboxRoute } from './route-model';

test('rejects invalid coordinates before reaching the paid routing provider', () => {
  assert.equal(isCoordinate({ lat: 91, lng: 37 }), false);
  assert.equal(isCoordinate({ lat: 40.9, lng: Infinity }), false);
  assert.equal(isCoordinate({ lat: 40.9, lng: 37.8 }), true);
});

test('accepts only a bounded, usable route response', () => {
  const route = { distance: 120, duration: 80,
    geometry: { type: 'LineString', coordinates: [[37.8, 40.9], [37.81, 40.91]] },
    legs: [{ steps: [{ distance: 120, duration: 80, maneuver: { type: 'arrive',
      instruction: 'Hedefe ulaştın', location: [37.81, 40.91] } }] }] };
  assert.equal(parseMapboxRoute(route)?.steps[0].instruction, 'Hedefe ulaştın');
  assert.equal(parseMapboxRoute({ ...route, geometry: { type: 'LineString', coordinates: [[Infinity, 40.9]] } }), null);
});
