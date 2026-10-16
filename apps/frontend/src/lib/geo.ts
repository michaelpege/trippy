/**
 * Geolocation & Routing Utilities
 *
 * Calculates real-time distance and estimated travel durations (car & motorcycle)
 * from the user's location to a destination, and generates 1-click Google Maps directions.
 */

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface TravelEstimate {
  distanceKm: number;
  carMinutes: number;
  motorcycleMinutes: number;
}

/**
 * Calculates Haversine distance in kilometers between two coordinates
 */
export function calculateHaversineDistance(
  coord1: GeoCoordinates,
  coord2: GeoCoordinates
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.latitude * Math.PI) / 180) *
      Math.cos((coord2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Estimates driving duration by Car and Motorcycle
 * Uses traffic-calibrated speed curves:
 * - Urban short range (<10km): Car avg 28 km/h, Motorcycle avg 36 km/h (lane filtering)
 * - Mid range (10-30km): Car avg 45 km/h, Motorcycle avg 48 km/h
 * - Long range (>30km): Car avg 65 km/h, Motorcycle avg 58 km/h
 */
export function estimateTravelTimes(distanceKm: number): TravelEstimate {
  if (distanceKm <= 0) {
    return { distanceKm: 0, carMinutes: 0, motorcycleMinutes: 0 };
  }

  let carSpeedKmh = 30;
  let motoSpeedKmh = 38;

  if (distanceKm > 30) {
    carSpeedKmh = 65;
    motoSpeedKmh = 58;
  } else if (distanceKm > 10) {
    carSpeedKmh = 45;
    motoSpeedKmh = 48;
  }

  // Add 3 minutes buffer for traffic lights/parking
  const carMinutes = Math.max(1, Math.round((distanceKm / carSpeedKmh) * 60) + 3);
  const motorcycleMinutes = Math.max(1, Math.round((distanceKm / motoSpeedKmh) * 60) + 2);

  return {
    distanceKm,
    carMinutes,
    motorcycleMinutes,
  };
}

/**
 * Get user's current geolocation via browser API
 */
export function getUserLocation(): Promise<GeoCoordinates | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        console.warn('Geolocation access failed or denied:', err.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * Generates Google Maps Directions link from user's current location to destination
 */
export function buildGoogleMapsRouteUrl(destination: {
  address?: string;
  name?: string;
  latitude?: number | null;
  longitude?: number | null;
  gmaps_url?: string;
}, userLocation?: GeoCoordinates | null): string {
  // If destination has explicit coordinates
  if (destination.latitude && destination.longitude) {
    const dest = `${destination.latitude},${destination.longitude}`;
    if (userLocation) {
      return `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${dest}&travelmode=driving`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
  }

  // If destination has a custom gmaps_url already provided
  if (destination.gmaps_url && destination.gmaps_url.startsWith('http')) {
    return destination.gmaps_url;
  }

  // Fallback to address or place name
  const query = encodeURIComponent(destination.address || destination.name || 'destination');
  if (userLocation) {
    return `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${query}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=driving`;
}
