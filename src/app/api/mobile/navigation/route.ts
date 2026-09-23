import { NextResponse } from 'next/server';

import { isCoordinate, isNavigationMode, parseMapboxRoute } from '@/server/navigation/route-model';
import { reserveNavigationRequest } from '@/server/navigation/route-budget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (Number(request.headers.get('content-length')) > 2048) return reply(413, 'Rota isteği çok büyük');
  const rawBody = await request.text().catch(() => '');
  if (rawBody.length > 2048) return reply(413, 'Rota isteği çok büyük');
  const body = (() => { try { return JSON.parse(rawBody); } catch { return null; } })();
  const origin = body?.origin;
  const destination = body?.destination;
  const mode = body?.mode;
  if (!isCoordinate(origin) || !isCoordinate(destination) || !isNavigationMode(mode)) {
    return reply(400, 'Geçersiz rota isteği');
  }
  const straightDistanceKm = greatCircleKm(origin.lat, origin.lng, destination.lat, destination.lng);
  if (straightDistanceKm < 0.015 || straightDistanceKm > (mode === 'walking' ? 30 : 300)) {
    return reply(400, 'Rota mesafesi desteklenmiyor');
  }
  const token = process.env.MAPBOX_ACCESS_TOKEN?.trim();
  if (!token) return reply(503, 'Rota servisi henüz hazır değil');
  const owner = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip') || 'unknown';
  if (!await reserveNavigationRequest(owner)) return reply(429, 'Rota servisi şu anda kullanılamıyor');

  const profile = mode === 'walking' ? 'walking' : 'driving-traffic';
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`);
  url.searchParams.set('access_token', token);
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('overview', 'full');
  url.searchParams.set('steps', 'true');
  url.searchParams.set('language', 'tr');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);
  try {
    const response = await fetch(url, { cache: 'no-store', redirect: 'error', signal: controller.signal });
    if (!response.ok) return reply(502, 'Rota alınamadı');
    const payload = await response.json().catch(() => null);
    const route = parseMapboxRoute(payload?.routes?.[0]);
    if (!route) return reply(502, 'Uygun rota bulunamadı');
    return NextResponse.json({ success: true, mode, route }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return reply(502, 'Rota alınamadı');
  } finally {
    clearTimeout(timeout);
  }
}

function reply(status: number, message: string) {
  return NextResponse.json({ success: false, message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function greatCircleKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const radians = Math.PI / 180;
  const deltaLat = (bLat - aLat) * radians;
  const deltaLng = (bLng - aLng) * radians;
  const term = Math.sin(deltaLat / 2) ** 2
    + Math.cos(aLat * radians) * Math.cos(bLat * radians) * Math.sin(deltaLng / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.min(1, Math.sqrt(term)));
}
