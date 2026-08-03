'use client';

import { useEffect, useState } from 'react';

export type LocationStatus = 'checking' | 'allowed' | 'denied' | 'far' | 'unavailable';

const LOCATION_CHECK_ENABLED = process.env.NEXT_PUBLIC_LOCATION_CHECK === 'true';
const CAFE_LAT = parseFloat(process.env.NEXT_PUBLIC_CAFE_LAT ?? '');
const CAFE_LNG = parseFloat(process.env.NEXT_PUBLIC_CAFE_LNG ?? '');
const RADIUS_M = parseInt(process.env.NEXT_PUBLIC_CAFE_RADIUS_METERS ?? '200', 10);

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Gate aktif hanya kalau fitur dinyalakan DAN koordinat kafe terisi.
// Konstanta build-time, jadi nilainya sama di server maupun client.
const GATE_ACTIVE = LOCATION_CHECK_ENABLED && !isNaN(CAFE_LAT) && !isNaN(CAFE_LNG);

export function useLocationCheck() {
  // Mulai dari 'allowed' saat gate mati supaya layar "Memeriksa lokasi..." tidak
  // sempat berkedip sebelum effect jalan — dulu ini kelihatan tiap kali halaman
  // remount/reload.
  const [status, setStatus] = useState<LocationStatus>(GATE_ACTIVE ? 'checking' : 'allowed');
  const [distance, setDistance] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!GATE_ACTIVE) return;

    if (!navigator.geolocation) {
      setStatus('unavailable');
      return;
    }

    setStatus('checking');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const d = haversineMeters(pos.coords.latitude, pos.coords.longitude, CAFE_LAT, CAFE_LNG);
        setDistance(Math.round(d));
        setStatus(d <= RADIUS_M ? 'allowed' : 'far');
      },
      (err) => {
        // 1 = PERMISSION_DENIED; 2 = UNAVAILABLE; 3 = TIMEOUT
        if (err.code === 1) {
          setStatus('denied');
        } else {
          // Timeout or unavailable — allow with benefit of the doubt
          setStatus('allowed');
        }
      },
      { timeout: 10000, maximumAge: attempt === 0 ? 60000 : 0 },
    );
  }, [attempt]);

  const retry = () => setAttempt((a) => a + 1);

  return { status, distance, radiusM: RADIUS_M, retry };
}
