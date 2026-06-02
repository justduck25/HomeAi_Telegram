export function formatUserLocationName(location: {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}): string {
  if (location.city && location.country) {
    return `${location.city}, ${location.country}`;
  }

  if (location.city) {
    return location.city;
  }

  if (location.country) {
    return location.country;
  }

  return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
}
