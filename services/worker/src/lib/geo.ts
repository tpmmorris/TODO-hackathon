export interface LatLng {
  latitude: number;
  longitude: number;
}

const mockPostcodes: Record<string, LatLng> = {
  'CB1 1AA': { latitude: 52.2053, longitude: 0.1218 },
  'CB1 2AB': { latitude: 52.2001, longitude: 0.1265 },
  'CB2 1DP': { latitude: 52.1975, longitude: 0.1282 },
  'CB2 3QA': { latitude: 52.193, longitude: 0.131 },
  'CB3 0FA': { latitude: 52.2105, longitude: 0.116 },
  'CB3 9LN': { latitude: 52.215, longitude: 0.109 },
  'CB4 1LL': { latitude: 52.222, longitude: 0.141 },
  'CB4 2QA': { latitude: 52.228, longitude: 0.145 },
  'CB5 8JJ': { latitude: 52.208, longitude: 0.135 },
  'CB5 9AB': { latitude: 52.212, longitude: 0.138 },
  // Normalised versions (no spaces)
  CB11AA: { latitude: 52.2053, longitude: 0.1218 },
  CB12AB: { latitude: 52.2001, longitude: 0.1265 },
  CB21DP: { latitude: 52.1975, longitude: 0.1282 },
  CB23QA: { latitude: 52.193, longitude: 0.131 },
  CB30FA: { latitude: 52.2105, longitude: 0.116 },
  CB39LN: { latitude: 52.215, longitude: 0.109 },
  CB41LL: { latitude: 52.222, longitude: 0.141 },
  CB42QA: { latitude: 52.228, longitude: 0.145 },
  CB58JJ: { latitude: 52.208, longitude: 0.135 },
  CB59AB: { latitude: 52.212, longitude: 0.138 }
};

function normalisePostcode(postcode: string): string {
  return postcode.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Geocode a UK postcode using postcodes.io with a deterministic mock fallback.
 */
export async function geocodePostcode(postcode: string): Promise<LatLng> {
  const normalised = normalisePostcode(postcode);

  // Try the real API first
  try {
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`, {
      headers: { accept: 'application/json' }
    });
    if (response.ok) {
      const data = (await response.json()) as { result?: { latitude: number; longitude: number } };
      if (data.result?.latitude != null && data.result?.longitude != null) {
        return {
          latitude: data.result.latitude,
          longitude: data.result.longitude
        };
      }
    }
  } catch {
    // Network failure — fall through to mock data
  }

  // Deterministic fallback for hackathon stability
  const fallback = mockPostcodes[normalised];
  if (fallback) return fallback;

  // Ultimate fallback: return Cambridge city centre so the map still works
  return { latitude: 52.2053, longitude: 0.1218 };
}

/**
 * Haversine distance in kilometres between two lat/lng points.
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}
