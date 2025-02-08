import UAParser from "ua-parser-js";
import geoip from "geoip-lite";

export interface DeviceInfo {
  deviceType: string;
  browser: string;
  os: string;
  deviceId: string;
}

export interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  ll?: [number, number]; // latitude, longitude
}

export function getDeviceInfo(userAgent: string): DeviceInfo {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    deviceType: result.device.type || "desktop",
    browser: `${result.browser.name} ${result.browser.version}`,
    os: `${result.os.name} ${result.os.version}`,
    // Create a unique device identifier based on available information
    deviceId: Buffer.from(
      `${result.ua}${result.os.name}${result.browser.name}`
    ).toString("base64"),
  };
}

export function getLocationInfo(ip: string): LocationInfo {
  // Skip for localhost
  if (ip === "127.0.0.1" || ip === "::1") {
    return {};
  }

  const geo = geoip.lookup(ip);
  if (!geo) return {};

  return {
    country: geo.country,
    region: geo.region,
    city: geo.city,
    ll: geo.ll,
  };
}

export function formatLocation(location: LocationInfo): string {
  if (!location.city) return "Unknown Location";
  
  const parts = [location.city];
  if (location.region) parts.push(location.region);
  if (location.country) parts.push(location.country);
  
  return parts.join(", ");
}

export function isSuspiciousLogin(
  currentLocation: LocationInfo,
  lastLocation: LocationInfo
): boolean {
  if (!currentLocation.ll || !lastLocation.ll) return false;

  // Calculate distance between current and last login locations
  const [lat1, lon1] = currentLocation.ll;
  const [lat2, lon2] = lastLocation.ll;
  
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  
  // If distance is more than 500km and login is within 1 hour, mark as suspicious
  return distance > 500;
}

// Calculate distance between two points in kilometers using the Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
