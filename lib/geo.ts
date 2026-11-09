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

/** Centroid of the items that carry explicit coordinates, or null when none do.
 *  Used as the map's default center so the markers are on screen on load,
 *  instead of a hardcoded city center that can be miles from every pin. */
export function activityCentroid(
  activities: { latitude?: number | null; longitude?: number | null }[],
): { latitude: number; longitude: number } | null {
  const pinned = activities.filter(
    (a) => a.latitude != null && a.longitude != null,
  );
  if (pinned.length === 0) return null;
  const latitude =
    pinned.reduce((s, a) => s + (a.latitude as number), 0) / pinned.length;
  const longitude =
    pinned.reduce((s, a) => s + (a.longitude as number), 0) / pinned.length;
  return { latitude, longitude };
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

/** Meters per pixel at a Leaflet/Google-maps zoom level and latitude. */
export function metersPerPixel(zoom: number, latitude: number): number {
  return (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom)
}

/**
 * Spread marker positions apart so no two markers sit on top of each other.
 *
 * Two venues can be a few hundred metres apart (Pizzeria Delfina and Alamo
 * Drafthouse are ~0.35 mi apart in the Mission). At the zoom the map fits
 * to, that is ~24 screen pixels — less than the 38px marker — so one pin
 * hides completely behind the other. This pushes close pairs apart (in
 * metres, around their midpoint, so the shift is symmetric and small)
 * until every pair is at least `minDistanceMeters` apart.
 *
 * Pure and deterministic: same input, same output. Positions that are
 * already far enough apart are returned untouched, so this is a no-op for
 * well-separated pins. Display positions only — the activities keep their
 * true coordinates; only the rendered pins move, by ~0.1-0.2 mi at most.
 */
export function spreadPositions(
  positions: [number, number][],
  minDistanceMeters: number,
): [number, number][] {
  if (positions.length < 2 || minDistanceMeters <= 0) return positions
  const lat0 = positions.reduce((s, p) => s + p[0], 0) / positions.length
  const cosLat = Math.cos((lat0 * Math.PI) / 180)
  const toXY = (p: [number, number]): [number, number] => [
    p[1] * 111320 * cosLat,
    p[0] * 111320,
  ]
  const fromXY = (x: number, y: number): [number, number] => [
    y / 111320,
    x / (111320 * cosLat),
  ]
  const pts = positions.map(toXY)
  // A few passes settle chains (A pushes B into C, then B-C separate).
  for (let pass = 0; pass < 4; pass++) {
    let moved = false
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j][0] - pts[i][0]
        const dy = pts[j][1] - pts[i][1]
        const dist = Math.hypot(dx, dy)
        if (dist >= minDistanceMeters) continue
        // Identical points have no direction; split them east-west.
        const ux = dist === 0 ? 1 : dx / dist
        const uy = dist === 0 ? 0 : dy / dist
        const push = (minDistanceMeters - dist) / 2
        pts[i][0] -= ux * push
        pts[i][1] -= uy * push
        pts[j][0] += ux * push
        pts[j][1] += uy * push
        moved = true
      }
    }
    if (!moved) break
  }
  return pts.map(([x, y]) => fromXY(x, y))
}
