/**
 * Deterministic geo helpers.
 *
 * Map pins used to be placed with Math.random() offsets, so they jumped to
 * a new spot on every render. These helpers derive a stable offset from an
 * id hash instead, so a pin stays put.
 */

function hashString(s: string): number {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

/** Stable pseudo-random offset in degrees, within +/- spread of a point. */
export function offsetFor(id: string, spread = 0.01): { dLat: number; dLng: number } {
  const h = hashString(id)
  const dLat = (((h % 1000) / 1000) - 0.5) * 2 * spread
  const dLng = (((Math.floor(h / 1000) % 1000) / 1000) - 0.5) * 2 * spread
  return { dLat, dLng }
}

/** Haversine distance in miles between two coordinates. */
export function distanceMiles(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 3958.8 // Earth radius in miles
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLng * sinLng
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function formatDistance(
  from: { latitude: number; longitude: number } | null,
  to: { latitude: number; longitude: number } | null,
): string | null {
  if (!from || !to) return null
  const miles = distanceMiles(from, to)
  if (miles < 0.1) return 'Here'
  if (miles < 10) return `${miles.toFixed(1)} mi away`
  return `${Math.round(miles)} mi away`
}
