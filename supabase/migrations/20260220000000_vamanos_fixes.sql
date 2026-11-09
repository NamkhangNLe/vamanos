-- Vámonos fixes: the app reads/writes columns and rows this migration adds.
-- Apply with `supabase db push` or paste into the Supabase SQL editor.
-- Safe to re-run: every statement is guarded (IF NOT EXISTS / DROP IF EXISTS).

-- 1. Columns the app actually uses -----------------------------------------
-- create.tsx inserts `category`; the UI reads `emoji`/`category` everywhere.
-- The original schema had neither, so creates failed and pins had no emoji.
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '✨';
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Activities may exist without a crew ------------------------------------
-- The create flow auto-creates a "My Squad" crew, but a first-time user has
-- none yet; a NOT NULL crew_id made that first insert fail outright.
ALTER TABLE public.activities ALTER COLUMN crew_id DROP NOT NULL;

-- 3. Waitlist table (the auth screen inserts here) ---------------------------
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can join the waitlist" ON public.waitlist;
CREATE POLICY "Anyone can join the waitlist" ON public.waitlist
  FOR INSERT WITH CHECK (true);

-- 4. Auto-create a profile row on signup -------------------------------------
-- Without this, a brand-new user has no profiles row, so creator joins
-- return null and the profile screen stays empty.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. RLS: the original migration enabled RLS but only added two SELECT
--    policies, so every INSERT/UPDATE/DELETE from the client was denied
--    and profiles had no policies at all (all reads denied). Complete set:
-- ---------------------------------------------------------------------------

-- profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- crews
DROP POLICY IF EXISTS "Users can view crews they are members of" ON public.crews;
CREATE POLICY "Users can view crews they are members of" ON public.crews
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.crew_members WHERE crew_id = crews.id AND user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Users can create crews" ON public.crews;
CREATE POLICY "Users can create crews" ON public.crews
  FOR INSERT WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "Creators can update their crews" ON public.crews;
CREATE POLICY "Creators can update their crews" ON public.crews
  FOR UPDATE USING (created_by = auth.uid());
DROP POLICY IF EXISTS "Creators can delete their crews" ON public.crews;
CREATE POLICY "Creators can delete their crews" ON public.crews
  FOR DELETE USING (created_by = auth.uid());

-- crew_members
DROP POLICY IF EXISTS "Members can view crew membership" ON public.crew_members;
CREATE POLICY "Members can view crew membership" ON public.crew_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.crew_members m WHERE m.crew_id = crew_members.crew_id AND m.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Users can join crews" ON public.crew_members;
CREATE POLICY "Users can join crews" ON public.crew_members
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can leave crews" ON public.crew_members;
CREATE POLICY "Users can leave crews" ON public.crew_members
  FOR DELETE USING (user_id = auth.uid());

-- activities
DROP POLICY IF EXISTS "Users can view activities in their crews" ON public.activities;
CREATE POLICY "Users can view activities in their crews" ON public.activities
  FOR SELECT USING (
    creator_id = auth.uid()
    OR crew_id IS NULL
    OR EXISTS (SELECT 1 FROM public.crew_members WHERE crew_id = activities.crew_id AND user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Users can create activities" ON public.activities;
CREATE POLICY "Users can create activities" ON public.activities
  FOR INSERT WITH CHECK (creator_id = auth.uid());
DROP POLICY IF EXISTS "Creators can update their activities" ON public.activities;
CREATE POLICY "Creators can update their activities" ON public.activities
  FOR UPDATE USING (creator_id = auth.uid());
DROP POLICY IF EXISTS "Creators can delete their activities" ON public.activities;
CREATE POLICY "Creators can delete their activities" ON public.activities
  FOR DELETE USING (creator_id = auth.uid());

-- activity_participants
DROP POLICY IF EXISTS "Crew members can view participants" ON public.activity_participants;
CREATE POLICY "Crew members can view participants" ON public.activity_participants
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.activities a
      LEFT JOIN public.crew_members cm ON cm.crew_id = a.crew_id
      WHERE a.id = activity_participants.activity_id
      AND (a.creator_id = auth.uid() OR cm.user_id = auth.uid())
    )
  );
DROP POLICY IF EXISTS "Users can RSVP for themselves" ON public.activity_participants;
CREATE POLICY "Users can RSVP for themselves" ON public.activity_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own RSVP" ON public.activity_participants;
CREATE POLICY "Users can update their own RSVP" ON public.activity_participants
  FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can remove their own RSVP" ON public.activity_participants;
CREATE POLICY "Users can remove their own RSVP" ON public.activity_participants
  FOR DELETE USING (user_id = auth.uid());

-- 6. Realtime: the app subscribes to postgres_changes on these tables so
--    "who's down" updates live. Tables must be in the publication.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_participants;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
