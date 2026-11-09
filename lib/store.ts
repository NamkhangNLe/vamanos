/**
 * Vámonos data layer.
 *
 * One interface, two backends:
 *  - Supabase (when EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY
 *    are set): activities, participants, crews and profiles live in Postgres,
 *    and RSVP changes stream in live via postgres_changes realtime.
 *  - Local-first (when Supabase is NOT configured): the same shapes live in
 *    AsyncStorage, seeded with demo data, so the app is fully usable with
 *    zero setup. Nothing is faked on top of real data: in local mode the
 *    seed is the data, and it is labelled as demo in the UI.
 *
 * Screens only talk to this module. They never touch `supabase` directly,
 * so the Supabase/local switch is invisible to the UI.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { isSupabaseConfigured, supabase } from './supabase'

export type RSVPStatus = 'committed' | 'interested' | 'declined'

export interface Profile {
  id: string
  username: string | null
  avatar_url: string | null
}

export interface CrewMember {
  user_id: string
  username: string | null
}

export interface Crew {
  id: string
  name: string
  created_at: string
  members: CrewMember[]
}

export interface Participant {
  id: string
  activity_id: string
  user_id: string
  status: RSVPStatus
  username: string | null
}

export interface Activity {
  id: string
  title: string
  emoji: string
  category: string | null
  description: string | null
  location_name: string | null
  latitude: number | null
  longitude: number | null
  scheduled_at: string
  threshold: number
  status: string
  crew_id: string | null
  crew_name: string | null
  creator_id: string
  creator_name: string | null
  /** Live counts, computed from real participants (never hardcoded). */
  committed: number
  interested: number
  myStatus: RSVPStatus | null
}

export interface CurrentUser {
  id: string
  username: string
  email: string | null
}

export interface CreateActivityInput {
  title: string
  category: string | null
  scheduled_at: string
  threshold: number
  latitude: number | null
  longitude: number | null
  location_name?: string | null
}

export const CATEGORY_EMOJI: Record<string, string> = {
  sports: '🏀',
  food: '🍕',
  movies: '🎬',
  beach: '🏖️',
  gaming: '🎮',
  music: '🎵',
  fitness: '💪',
  hangout: '🛋️',
}

export function emojiForCategory(category: string | null | undefined): string {
  if (category && CATEGORY_EMOJI[category]) return CATEGORY_EMOJI[category]
  return '✨'
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export const LOCAL_USER: CurrentUser = {
  id: 'local-user',
  username: 'You',
  email: null,
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured || !supabase) return LOCAL_USER
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()
  return {
    id: user.id,
    username: profile?.username || user.email?.split('@')[0] || 'You',
    email: user.email ?? null,
  }
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut()
}

export async function joinWaitlist(email: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return // local mode: nothing to store
  await supabase.from('waitlist').insert({ email })
}

// ---------------------------------------------------------------------------
// Supabase backend
// ---------------------------------------------------------------------------

function toActivity(row: any, parts: Participant[], userId: string | null): Activity {
  const committed = parts.filter((p) => p.status === 'committed').length
  const interested = parts.filter((p) => p.status === 'interested').length
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji || emojiForCategory(row.category),
    category: row.category ?? null,
    description: row.description ?? null,
    location_name: row.location_name ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    scheduled_at: row.scheduled_at,
    threshold: row.threshold ?? 1,
    status: row.status ?? 'pending',
    crew_id: row.crew_id ?? null,
    crew_name: row.crew?.name ?? null,
    creator_id: row.creator_id,
    creator_name: row.creator?.username ?? null,
    committed,
    interested,
    myStatus: userId ? parts.find((p) => p.user_id === userId)?.status ?? null : null,
  }
}

async function fetchParticipantsFor(client: NonNullable<typeof supabase>, activityIds: string[]) {
  if (activityIds.length === 0) return []
  const { data } = await client
    .from('activity_participants')
    .select('id, activity_id, user_id, status, profiles(username)')
    .in('activity_id', activityIds)
  return (data ?? []).map((p: any) => ({
    id: p.id,
    activity_id: p.activity_id,
    user_id: p.user_id,
    status: p.status as RSVPStatus,
    username: p.profiles?.username ?? null,
  })) as Participant[]
}

async function supabaseFetchActivities(userId: string | null): Promise<Activity[]> {
  const client = supabase!
  const { data, error } = await client
    .from('activities')
    .select('*, creator:profiles!creator_id(username), crew:crews(name)')
    .order('scheduled_at', { ascending: true })
  if (error || !data) return []
  const parts = await fetchParticipantsFor(client, data.map((a: any) => a.id))
  return data.map((row: any) =>
    toActivity(
      row,
      parts.filter((p) => p.activity_id === row.id),
      userId,
    ),
  )
}

async function supabaseFetchActivity(
  id: string,
  userId: string | null,
): Promise<Activity | null> {
  const client = supabase!
  const { data, error } = await client
    .from('activities')
    .select('*, creator:profiles!creator_id(username), crew:crews(name)')
    .eq('id', id)
    .single()
  if (error || !data) return null
  const parts = await fetchParticipantsFor(client, [id])
  return toActivity(data, parts, userId)
}

async function supabaseFetchParticipants(activityId: string): Promise<Participant[]> {
  return fetchParticipantsFor(supabase!, [activityId])
}

async function supabaseSetRSVP(
  activityId: string,
  userId: string,
  status: RSVPStatus,
): Promise<void> {
  await supabase!.from('activity_participants').upsert({
    activity_id: activityId,
    user_id: userId,
    status,
    updated_at: new Date().toISOString(),
  })
}

async function supabaseEnsureCrew(userId: string): Promise<string | null> {
  const client = supabase!
  const { data } = await client
    .from('crew_members')
    .select('crew_id')
    .eq('user_id', userId)
    .limit(1)
    .single()
  if (data?.crew_id) return data.crew_id as string
  // No crew yet: spin up a personal squad so the first activity can be created.
  const { data: crew, error } = await client
    .from('crews')
    .insert({ name: 'My Squad', created_by: userId })
    .select()
    .single()
  if (error || !crew) return null
  await client.from('crew_members').insert({ crew_id: crew.id, user_id: userId })
  return crew.id as string
}

async function supabaseCreateActivity(
  input: CreateActivityInput,
  user: CurrentUser,
): Promise<Activity | null> {
  const client = supabase!
  const crewId = await supabaseEnsureCrew(user.id)
  const { data, error } = await client
    .from('activities')
    .insert({
      title: input.title,
      emoji: emojiForCategory(input.category),
      category: input.category,
      creator_id: user.id,
      crew_id: crewId,
      scheduled_at: input.scheduled_at,
      threshold: input.threshold,
      latitude: input.latitude,
      longitude: input.longitude,
      location_name: input.location_name ?? null,
    })
    .select()
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Could not create activity')
  // The creator is in by default.
  await client.from('activity_participants').upsert({
    activity_id: data.id,
    user_id: user.id,
    status: 'committed',
    updated_at: new Date().toISOString(),
  })
  return supabaseFetchActivity(data.id, user.id)
}

async function supabaseFetchCrews(): Promise<Crew[]> {
  const { data, error } = await supabase!
    .from('crews')
    .select('id, name, created_at, members:crew_members(user_id, profiles(username))')
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data.map((c: any) => ({
    id: c.id,
    name: c.name,
    created_at: c.created_at,
    members: (c.members ?? []).map((m: any) => ({
      user_id: m.user_id,
      username: m.profiles?.username ?? null,
    })),
  }))
}

async function supabaseCreateCrew(name: string, user: CurrentUser): Promise<Crew | null> {
  const client = supabase!
  const { data: crew, error } = await client
    .from('crews')
    .insert({ name, created_by: user.id })
    .select()
    .single()
  if (error || !crew) throw new Error(error?.message ?? 'Could not create crew')
  await client.from('crew_members').insert({ crew_id: crew.id, user_id: user.id })
  return { id: crew.id, name: crew.name, created_at: crew.created_at, members: [{ user_id: user.id, username: user.username }] }
}

async function supabaseFetchStats(userId: string) {
  const client = supabase!
  const [{ count: created }, { count: joined }, { data: crews }] = await Promise.all([
    client.from('activities').select('*', { count: 'exact', head: true }).eq('creator_id', userId),
    client.from('activity_participants').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'committed'),
    client.from('crew_members').select('crew_id').eq('user_id', userId),
  ])
  const memberIds = new Set<string>()
  if (crews) {
    const { data: members } = await client
      .from('crew_members')
      .select('user_id')
      .in('crew_id', crews.map((c: any) => c.crew_id))
    members?.forEach((m: any) => memberIds.add(m.user_id))
  }
  return {
    activities: created ?? 0,
    joined: joined ?? 0,
    crews: crews?.length ?? 0,
    amigos: Math.max(0, memberIds.size - 1),
  }
}

// ---------------------------------------------------------------------------
// Local backend (AsyncStorage) — used when Supabase is not configured
// ---------------------------------------------------------------------------

const LOCAL_KEYS = {
  seeded: 'vamanos_local_seeded_v1',
  activities: 'vamanos_local_activities_v1',
  participants: 'vamanos_local_participants_v1',
  crews: 'vamanos_local_crews_v1',
}

interface LocalActivityRow {
  id: string
  title: string
  emoji: string
  category: string | null
  description: string | null
  location_name: string | null
  latitude: number | null
  longitude: number | null
  scheduled_at: string
  threshold: number
  status: string
  crew_id: string | null
  creator_id: string
  creator_name: string | null
}

const SEED_CREWS: Crew[] = [
  {
    id: 'local-crew-la',
    name: 'LA Squad',
    created_at: new Date().toISOString(),
    members: [
      { user_id: 'local-user', username: 'You' },
      { user_id: 'seed-alex', username: 'Alex' },
      { user_id: 'seed-sam', username: 'Sam' },
      { user_id: 'seed-jordan', username: 'Jordan' },
    ],
  },
  {
    id: 'local-crew-foodies',
    name: 'Foodies',
    created_at: new Date().toISOString(),
    members: [
      { user_id: 'local-user', username: 'You' },
      { user_id: 'seed-maya', username: 'Maya' },
      { user_id: 'seed-chris', username: 'Chris' },
    ],
  },
  {
    id: 'local-crew-ballers',
    name: 'Ballers',
    created_at: new Date().toISOString(),
    members: [
      { user_id: 'local-user', username: 'You' },
      { user_id: 'seed-taylor', username: 'Taylor' },
      { user_id: 'seed-morgan', username: 'Morgan' },
      { user_id: 'seed-casey', username: 'Casey' },
    ],
  },
]

function seedActivities(): LocalActivityRow[] {
  const now = Date.now()
  const inMin = (m: number) => new Date(now + m * 60000).toISOString()
  return [
    {
      id: 'local-act-vb', title: 'Beach Volleyball', emoji: '🏐', category: 'sports',
      description: null, location_name: 'Santa Monica Beach',
      latitude: 34.0091, longitude: -118.4973, scheduled_at: inMin(120),
      threshold: 6, status: 'pending', crew_id: 'local-crew-la',
      creator_id: 'seed-nam', creator_name: 'Nam',
    },
    {
      id: 'local-act-pizza', title: 'Pizza Run', emoji: '🍕', category: 'food',
      description: null, location_name: 'Downtown',
      latitude: 34.0195, longitude: -118.491, scheduled_at: inMin(60),
      threshold: 4, status: 'pending', crew_id: 'local-crew-foodies',
      creator_id: 'seed-alex', creator_name: 'Alex',
    },
    {
      id: 'local-act-movie', title: 'Late Night Movie', emoji: '🎬', category: 'movies',
      description: null, location_name: 'AMC Century City',
      latitude: 34.023, longitude: -118.485, scheduled_at: inMin(240),
      threshold: 5, status: 'pending', crew_id: 'local-crew-la',
      creator_id: 'seed-jordan', creator_name: 'Jordan',
    },
    {
      id: 'local-act-hoops', title: 'Pickup Basketball', emoji: '🏀', category: 'sports',
      description: null, location_name: 'Stoner Park',
      latitude: 34.016, longitude: -118.502, scheduled_at: inMin(30),
      threshold: 10, status: 'pending', crew_id: 'local-crew-ballers',
      creator_id: 'seed-sam', creator_name: 'Sam',
    },
  ]
}

function seedParticipants(): Participant[] {
  const committed = (activity_id: string, names: string[]): Participant[] =>
    names.map((name, i) => ({
      id: `seed-part-${activity_id}-${i}`,
      activity_id,
      user_id: `seed-${name.toLowerCase()}`,
      status: 'committed' as RSVPStatus,
      username: name,
    }))
  const interested = (activity_id: string, names: string[]): Participant[] =>
    names.map((name, i) => ({
      id: `seed-part-${activity_id}-maybe-${i}`,
      activity_id,
      user_id: `seed-${name.toLowerCase()}-maybe`,
      status: 'interested' as RSVPStatus,
      username: name,
    }))
  return [
    ...committed('local-act-vb', ['Alex', 'Sam', 'Jordan', 'Taylor']),
    ...interested('local-act-vb', ['Casey']),
    ...committed('local-act-pizza', ['Maya', 'Chris', 'Alex']),
    ...committed('local-act-movie', ['Jordan', 'Riley']),
    ...interested('local-act-movie', ['Morgan']),
    ...committed('local-act-hoops', ['Sam', 'Taylor', 'Morgan', 'Casey', 'Alex', 'Jordan', 'Riley']),
  ]
}

async function ensureLocalSeeded(): Promise<void> {
  const seeded = await AsyncStorage.getItem(LOCAL_KEYS.seeded)
  if (seeded) return
  await AsyncStorage.multiSet([
    [LOCAL_KEYS.activities, JSON.stringify(seedActivities())],
    [LOCAL_KEYS.participants, JSON.stringify(seedParticipants())],
    [LOCAL_KEYS.crews, JSON.stringify(SEED_CREWS)],
    [LOCAL_KEYS.seeded, 'true'],
  ])
}

async function localRead<T>(key: string, fallback: T): Promise<T> {
  await ensureLocalSeeded()
  const raw = await AsyncStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function localFetchActivities(userId: string | null): Promise<Activity[]> {
  const [rows, parts, crews] = await Promise.all([
    localRead<LocalActivityRow[]>(LOCAL_KEYS.activities, []),
    localRead<Participant[]>(LOCAL_KEYS.participants, []),
    localRead<Crew[]>(LOCAL_KEYS.crews, []),
  ])
  const crewNames = new Map(crews.map((c) => [c.id, c.name]))
  return rows
    .slice()
    .sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at))
    .map((row) => {
      const rowParts = parts.filter((p) => p.activity_id === row.id)
      return {
        ...toActivity(
          { ...row, crew: { name: row.crew_id ? crewNames.get(row.crew_id) ?? null : null }, creator: { username: row.creator_name } },
          rowParts,
          userId,
        ),
      }
    })
}

async function localFetchActivity(id: string, userId: string | null): Promise<Activity | null> {
  const all = await localFetchActivities(userId)
  return all.find((a) => a.id === id) ?? null
}

async function localFetchParticipants(activityId: string): Promise<Participant[]> {
  const parts = await localRead<Participant[]>(LOCAL_KEYS.participants, [])
  return parts.filter((p) => p.activity_id === activityId)
}

async function localSetRSVP(activityId: string, userId: string, username: string, status: RSVPStatus): Promise<void> {
  const parts = await localRead<Participant[]>(LOCAL_KEYS.participants, [])
  const idx = parts.findIndex((p) => p.activity_id === activityId && p.user_id === userId)
  if (idx >= 0) parts[idx] = { ...parts[idx], status }
  else parts.push({ id: `local-part-${Date.now()}`, activity_id: activityId, user_id: userId, status, username })
  await AsyncStorage.setItem(LOCAL_KEYS.participants, JSON.stringify(parts))
}

async function localCreateActivity(input: CreateActivityInput, user: CurrentUser): Promise<Activity | null> {
  const [rows, crews] = await Promise.all([
    localRead<LocalActivityRow[]>(LOCAL_KEYS.activities, []),
    localRead<Crew[]>(LOCAL_KEYS.crews, []),
  ])
  let crewId = crews[0]?.id ?? null
  if (!crewId) {
    const crew: Crew = { id: `local-crew-${Date.now()}`, name: 'My Squad', created_at: new Date().toISOString(), members: [{ user_id: user.id, username: user.username }] }
    crews.push(crew)
    crewId = crew.id
    await AsyncStorage.setItem(LOCAL_KEYS.crews, JSON.stringify(crews))
  }
  const row: LocalActivityRow = {
    id: `local-act-${Date.now()}`,
    title: input.title,
    emoji: emojiForCategory(input.category),
    category: input.category,
    description: null,
    location_name: input.location_name ?? null,
    latitude: input.latitude,
    longitude: input.longitude,
    scheduled_at: input.scheduled_at,
    threshold: input.threshold,
    status: 'pending',
    crew_id: crewId,
    creator_id: user.id,
    creator_name: user.username,
  }
  rows.push(row)
  await AsyncStorage.setItem(LOCAL_KEYS.activities, JSON.stringify(rows))
  await localSetRSVP(row.id, user.id, user.username, 'committed')
  return localFetchActivity(row.id, user.id)
}

async function localFetchCrews(): Promise<Crew[]> {
  return localRead<Crew[]>(LOCAL_KEYS.crews, [])
}

async function localCreateCrew(name: string, user: CurrentUser): Promise<Crew> {
  const crews = await localRead<Crew[]>(LOCAL_KEYS.crews, [])
  const crew: Crew = {
    id: `local-crew-${Date.now()}`,
    name,
    created_at: new Date().toISOString(),
    members: [{ user_id: user.id, username: user.username }],
  }
  crews.unshift(crew)
  await AsyncStorage.setItem(LOCAL_KEYS.crews, JSON.stringify(crews))
  return crew
}

async function localFetchStats(userId: string) {
  const [rows, parts, crews] = await Promise.all([
    localRead<LocalActivityRow[]>(LOCAL_KEYS.activities, []),
    localRead<Participant[]>(LOCAL_KEYS.participants, []),
    localRead<Crew[]>(LOCAL_KEYS.crews, []),
  ])
  const memberIds = new Set<string>()
  crews.forEach((c) => c.members.forEach((m) => memberIds.add(m.user_id)))
  return {
    activities: rows.filter((r) => r.creator_id === userId).length,
    joined: parts.filter((p) => p.user_id === userId && p.status === 'committed').length,
    crews: crews.length,
    amigos: Math.max(0, memberIds.size - 1),
  }
}

// ---------------------------------------------------------------------------
// Public API — screens use only these
// ---------------------------------------------------------------------------

export async function fetchActivities(): Promise<Activity[]> {
  const user = await getCurrentUser()
  if (isSupabaseConfigured) return supabaseFetchActivities(user?.id ?? null)
  return localFetchActivities(user?.id ?? null)
}

export async function fetchActivity(id: string): Promise<Activity | null> {
  const user = await getCurrentUser()
  if (isSupabaseConfigured) return supabaseFetchActivity(id, user?.id ?? null)
  return localFetchActivity(id, user?.id ?? null)
}

export async function fetchParticipants(activityId: string): Promise<Participant[]> {
  if (isSupabaseConfigured) return supabaseFetchParticipants(activityId)
  return localFetchParticipants(activityId)
}

export async function setRSVP(activityId: string, status: RSVPStatus): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return
  if (isSupabaseConfigured) return supabaseSetRSVP(activityId, user.id, status)
  return localSetRSVP(activityId, user.id, user.username, status)
}

export async function createActivity(input: CreateActivityInput): Promise<Activity | null> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Could not determine who you are')
  if (isSupabaseConfigured) return supabaseCreateActivity(input, user)
  return localCreateActivity(input, user)
}

export async function fetchCrews(): Promise<Crew[]> {
  if (isSupabaseConfigured) return supabaseFetchCrews()
  return localFetchCrews()
}

export async function createCrew(name: string): Promise<Crew | null> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Could not determine who you are')
  if (isSupabaseConfigured) return supabaseCreateCrew(name, user)
  return localCreateCrew(name, user)
}

export async function fetchStats(): Promise<{ activities: number; joined: number; crews: number; amigos: number }> {
  const user = await getCurrentUser()
  if (!user) return { activities: 0, joined: 0, crews: 0, amigos: 0 }
  if (isSupabaseConfigured) return supabaseFetchStats(user.id)
  return localFetchStats(user.id)
}

/**
 * Live updates. In Supabase mode this is a real postgres_changes
 * subscription on activities + participants, so "who's down" updates
 * the moment someone RSVPs. In local mode there is no remote source,
 * so it returns a no-op unsubscribe and screens poll on focus/refresh.
 */
export function subscribeToActivityChanges(onChange: () => void): () => void {
  if (!isSupabaseConfigured || !supabase) return () => {}
  const channel = supabase
    .channel('vamanos-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_participants' }, onChange)
    .subscribe()
  return () => {
    supabase!.removeChannel(channel)
  }
}
