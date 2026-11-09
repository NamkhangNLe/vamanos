/**
 * Local-mode store tests.
 *
 * These run with Supabase UNCONFIGURED (no env vars), proving the app works
 * out of the box in local-first demo mode: seed data loads, creates persist,
 * RSVPs move the real counts, and crews/stats are computed, not hardcoded.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

describe('vamanos local store', () => {
  let store: typeof import('./store')

  beforeEach(async () => {
    jest.resetModules()
    delete process.env.EXPO_PUBLIC_SUPABASE_URL
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    const AsyncStorage = require('@react-native-async-storage/async-storage')
    await AsyncStorage.clear()
    store = require('./store')
  })

  it('seeds demo activities with real participant counts', async () => {
    const activities = await store.fetchActivities()
    expect(activities).toHaveLength(4)

    const byId = new Map(activities.map((a) => [a.id, a]))
    // Counts come from the seeded participants, not hardcoded fields.
    expect(byId.get('local-act-vb')?.committed).toBe(4)
    expect(byId.get('local-act-vb')?.threshold).toBe(6)
    expect(byId.get('local-act-pizza')?.committed).toBe(3)
    expect(byId.get('local-act-hoops')?.committed).toBe(7)
    expect(byId.get('local-act-movie')?.interested).toBe(1)
  })

  it('creates an activity and auto-commits the creator', async () => {
    const created = await store.createActivity({
      title: 'Sunset Run',
      category: 'fitness',
      scheduled_at: new Date(Date.now() + 3600000).toISOString(),
      threshold: 3,
      latitude: 37.76025,
      longitude: -122.50826,
    })
    expect(created).not.toBeNull()
    expect(created?.title).toBe('Sunset Run')
    expect(created?.emoji).toBe('💪')
    expect(created?.committed).toBe(1)
    expect(created?.myStatus).toBe('committed')

    const all = await store.fetchActivities()
    expect(all).toHaveLength(5)
    expect(all.find((a) => a.id === created?.id)).toBeDefined()
  })

  it('RSVP moves the counts', async () => {
    await store.setRSVP('local-act-pizza', 'committed')
    const activity = await store.fetchActivity('local-act-pizza')
    expect(activity?.committed).toBe(4)
    expect(activity?.myStatus).toBe('committed')

    await store.setRSVP('local-act-pizza', 'declined')
    const after = await store.fetchActivity('local-act-pizza')
    expect(after?.committed).toBe(3)
    expect(after?.myStatus).toBe('declined')
  })

  it('participants are real rows, not padded fakes', async () => {
    const parts = await store.fetchParticipants('local-act-vb')
    expect(parts).toHaveLength(5)
    expect(parts.filter((p) => p.status === 'committed')).toHaveLength(4)
    expect(parts.every((p) => p.username)).toBe(true)
  })

  it('crews seed and create', async () => {
    const crews = await store.fetchCrews()
    expect(crews).toHaveLength(3)
    expect(crews[0]?.members.length).toBeGreaterThan(0)

    const created = await store.createCrew('Sunset Club')
    expect(created?.name).toBe('Sunset Club')
    const after = await store.fetchCrews()
    expect(after).toHaveLength(4)
  })

  it('stats are computed from real data', async () => {
    const stats = await store.fetchStats()
    expect(stats.crews).toBe(3)
    expect(stats.amigos).toBeGreaterThan(0)
    expect(stats.activities).toBe(0) // local user hasn't created any yet
    expect(stats.joined).toBe(0)
  })

  it('live subscription is a safe no-op in local mode', () => {
    const unsubscribe = store.subscribeToActivityChanges(() => {})
    expect(typeof unsubscribe).toBe('function')
    expect(() => unsubscribe()).not.toThrow()
  })
})
