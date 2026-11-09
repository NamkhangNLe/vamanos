# Vámonos 🚀

Vámonos is a social coordination app for spontaneous activities with friend groups. See who's down, set squad thresholds, and track real-time progress toward the event.

The core loop: someone throws out a plan ("pickup volleyball tonight", "coffee in 30 min"), the squad RSVPs in real time, and once the minimum headcount is hit, it's on. No group-chat archaeology, no "who's actually coming?" — the count is the answer.

## How it works

- **Map-first home** — a full-bleed map with emoji pins for every nearby plan, plus a bottom sheet listing them with live RSVP progress (4/6 down, 🔥 On when the threshold is hit).
- **Create in seconds** — title, category, when (Now / 30 min / 1 hr / 2 hrs / Tonight), and minimum squad size. Your location is attached automatically.
- **Real-time who's-down** — RSVP as "I'm Down", "Maybe", or "Can't make it". With Supabase connected, counts update live on every screen via realtime subscriptions. The detail screen shows who's in, with live participant pins on the map.
- **Crews (Amigos)** — coordinate inside specific friend groups. Create a crew, tap it to see who's in it. Your first activity auto-creates a "My Squad" crew if you don't have one yet.
- **Works with zero setup** — no Supabase project? The app runs in local demo mode on your device (AsyncStorage) with sample plans and crews, clearly labelled as demo. Everything works: create, RSVP, maps, crews.

## Getting started

```bash
npm install
npm run ios       # iOS
npm run android   # Android
npm run web       # Web — Leaflet maps, no API key needed
```

Local demo mode works out of the box. To go live with your squad, connect Supabase (below).

## Going live with Supabase

1. **Create a project** at [supabase.com](https://supabase.com) (free tier is fine).
2. **Apply the schema.** Either run the migrations with the Supabase CLI:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   or paste the SQL from `supabase/migrations/` into the Supabase dashboard SQL editor, in order. The `20260220000000_vamanos_fixes.sql` migration is the important one: it adds the `emoji`/`category` columns the app writes, the waitlist table, the auto-profile trigger, the full RLS policy set (the original schema only had two SELECT policies, so all writes were denied), and realtime publication for live RSVPs.
3. **Set your env vars.** Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
   Find both in your project dashboard under Settings → API. Never commit a real `.env`.
4. **Restart the app.** It picks up Supabase automatically when the env vars are present; local demo plans stay on your device.

> Security note: a `.env` with real Supabase keys was previously committed to this public repo's history. If that was your key, rotate it in the Supabase dashboard (Settings → API → Generate new anon key) — the anon key is low-privilege, but a committed key is a committed key.

## Project structure

```
app/
  (tabs)/index.tsx      Map + bottom-sheet home feed
  (tabs)/create.tsx     New activity flow
  (tabs)/amigos.tsx     Crews
  (tabs)/profile.tsx    Profile, real stats, Supabase setup card
  activity/[id].tsx     Detail: map hero, live counts, RSVP, who's in
  auth.tsx              Waitlist gate (Supabase mode)
components/
  HomeMap(.web).tsx     Home map (react-native-maps / Leaflet on web)
  ActivityMap(.web).tsx Detail map with participant pins
lib/
  supabase.ts           Guarded client — null when unconfigured, never throws
  store.ts              The data layer: one API, Supabase or local backend
  geo.ts                Deterministic pin offsets, distance helpers
supabase/migrations/    Schema + RLS + realtime
```

## Tech

Expo SDK 52 · React Native 0.76 · expo-router · Supabase (Postgres + Auth + Realtime) · Leaflet + react-leaflet on web · react-native-maps on iOS/Android · AsyncStorage local fallback
