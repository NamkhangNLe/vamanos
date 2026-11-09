/**
 * Tests for the geo helpers that place map pins: the spread that keeps
 * close venues from stacking on top of each other.
 */
import { metersPerPixel, spreadPositions } from './geo'

// The four SF demo pins, in seed order: volleyball, pizza, movie, hoops.
const SF: [number, number][] = [
  [37.76025, -122.50826], // Ocean Beach volleyball
  [37.76136, -122.42419], // Pizzeria Delfina
  [37.75622, -122.419], // Alamo Drafthouse
  [37.77606, -122.42769], // Hayes Valley basketball
]

function distMeters(a: [number, number], b: [number, number]): number {
  const lat0 = ((a[0] + b[0]) / 2) * (Math.PI / 180)
  const dx = (b[1] - a[1]) * 111320 * Math.cos(lat0)
  const dy = (b[0] - a[0]) * 111320
  return Math.hypot(dx, dy)
}

describe('spreadPositions', () => {
  it('separates the two Mission pins to the required distance', () => {
    // At the phone fit (zoom 12.5, ~21 m/px) a 46px gap needs ~980 m.
    const spread = spreadPositions(SF, 46 * metersPerPixel(12.5, 37.76))
    const pizza = spread[1]
    const movie = spread[2]
    expect(distMeters(pizza, movie)).toBeGreaterThanOrEqual(980)
    // And neither pin moved far from its venue (~0.15 mi at most).
    expect(distMeters(SF[1], pizza)).toBeLessThan(300)
    expect(distMeters(SF[2], movie)).toBeLessThan(300)
  })

  it('leaves well-separated pins untouched', () => {
    const spread = spreadPositions(SF, 46 * metersPerPixel(14, 37.76))
    // At zoom 14 the 46px rule needs ~350 m; only the Mission pair is
    // closer than that, so the other two pins must not move (within float
    // round-trip noise of the lat/lng <-> metres conversion).
    expect(distMeters(spread[0], SF[0])).toBeLessThan(0.01)
    expect(distMeters(spread[3], SF[3])).toBeLessThan(0.01)
  })

  it('is deterministic', () => {
    const a = spreadPositions(SF, 1000)
    const b = spreadPositions(SF, 1000)
    expect(a).toEqual(b)
  })

  it('splits identical points instead of leaving them stacked', () => {
    const spread = spreadPositions(
      [
        [37.76, -122.42],
        [37.76, -122.42],
      ],
      500,
    )
    expect(distMeters(spread[0], spread[1])).toBeGreaterThanOrEqual(499)
  })

  it('handles empty and single inputs', () => {
    expect(spreadPositions([], 500)).toEqual([])
    expect(spreadPositions([[37.76, -122.42]], 500)).toEqual([[37.76, -122.42]])
  })
})
