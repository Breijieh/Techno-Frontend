/**
 * GPS Location Service
 * Handles GPS location detection, distance calculation, and radius validation
 */

export interface Location {
  latitude: number;
  longitude: number;
}

export interface ProjectLocation extends Location {
  projectCode: number;
  radius: number; // in meters
}

/**
 * Get current GPS location from browser
 */
export async function getCurrentLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if location is within project radius
 */
export function isWithinRadius(
  location: Location,
  projectLocation: ProjectLocation
): boolean {
  const distance = calculateDistance(
    location.latitude,
    location.longitude,
    projectLocation.latitude,
    projectLocation.longitude
  );

  return distance <= projectLocation.radius;
}

/**
 * Request location permission from browser
 */
export async function requestLocationPermission(): Promise<boolean> {
  if (!navigator.permissions) {
    // Fallback for browsers that don't support permissions API
    return true;
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state === 'granted' || result.state === 'prompt';
  } catch {
    // Permissions API might not be supported
    return true;
  }
}

/**
 * Get formatted distance string
 */
export function formatDistance(distanceInMeters: number): string {
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)}m`;
  }
  return `${(distanceInMeters / 1000).toFixed(2)}km`;
}

