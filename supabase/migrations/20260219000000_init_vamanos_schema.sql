-- Create profiles table (if not exists, extending from auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  website TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create crews table
CREATE TABLE public.crews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users NOT NULL
);

-- Create crew members mapping
CREATE TABLE public.crew_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crew_id UUID REFERENCES public.crews ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(crew_id, user_id)
);

-- Create activities table
CREATE TABLE public.activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crew_id UUID REFERENCES public.crews ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES public.profiles NOT NULL,
  title TEXT NOT NULL,
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  threshold INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity participants mapping
CREATE TABLE public.activity_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID REFERENCES public.activities ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'interested' CHECK (status IN ('interested', 'committed', 'declined')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(activity_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Basic examples, can be refined)
CREATE POLICY "Users can view crews they are members of" ON public.crews
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.crew_members WHERE crew_id = crews.id AND user_id = auth.uid())
  );

CREATE POLICY "Users can view activities in their crews" ON public.activities
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.crew_members WHERE crew_id = activities.crew_id AND user_id = auth.uid())
  );
