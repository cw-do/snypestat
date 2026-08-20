import * as Location from 'expo-location';

type OverpassElement = {
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: { name?: string };
};

type OverpassResponse = { elements?: OverpassElement[]; remark?: string };

export type RinkSuggestionResult =
  | { status: 'suggested'; name: string }
  | { status: 'denied' }
  | { status: 'unavailable' };

export async function suggestNearestIceRink(): Promise<RinkSuggestionResult> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return { status: 'denied' };

  const cached = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000, requiredAccuracy: 5000 });
  const position = cached ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude } = position.coords;
  const radiusMeters = 5 * 1609.344;
  const latitudeDelta = radiusMeters / 111320;
  const longitudeDelta = radiusMeters / (111320 * Math.cos(latitude * Math.PI / 180));
  const bounds = `${latitude - latitudeDelta},${longitude - longitudeDelta},${latitude + latitudeDelta},${longitude + longitudeDelta}`;
  const query = `[out:json][timeout:15];(
    nwr["leisure"="ice_rink"]["name"](${bounds});
    nwr["leisure"="sports_centre"]["sport"~"ice_hockey|ice_skating"]["name"](${bounds});
  );out center tags;`;

  const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 17000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'StatCamHockey/2.0'
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal
      });
      if (!response.ok) continue;
      const data = await response.json() as OverpassResponse;
      if (data.remark && !(data.elements?.length)) continue;
      const candidates = (data.elements ?? []).flatMap((element) => {
        const name = element.tags?.name?.trim();
        const lat = element.lat ?? element.center?.lat;
        const lon = element.lon ?? element.center?.lon;
        if (!name || lat == null || lon == null) return [];
        const distance = distanceMeters(latitude, longitude, lat, lon);
        return distance <= radiusMeters ? [{ name, distance }] : [];
      });
      candidates.sort((a, b) => a.distance - b.distance);
      return candidates[0] ? { status: 'suggested', name: candidates[0].name } : { status: 'unavailable' };
    } catch {
      // Try the next public endpoint. Manual entry remains available if all fail.
    } finally {
      clearTimeout(timer);
    }
  }
  return { status: 'unavailable' };
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
