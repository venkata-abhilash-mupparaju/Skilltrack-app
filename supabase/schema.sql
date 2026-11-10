-- ==============================================================================
-- SkillTrack Database Schema: PWA & Cloud Push Notification Infrastructure
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. Profiles Table (Synced with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  total_sessions_completed INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Study Sessions Table (User's weekly schedule & topics)
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'DSA',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}', -- 0=Sunday, 6=Saturday
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Session Logs (Daily tracking & checkoffs)
CREATE TABLE IF NOT EXISTS public.session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'in_progress', 'missed', 'skipped'
  problems_solved INT NOT NULL DEFAULT 0,
  duration_minutes INT NOT NULL DEFAULT 60,
  notes TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_session_date UNIQUE (user_id, session_id, date)
);

-- 5. DSA Problems Log
CREATE TABLE IF NOT EXISTS public.dsa_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  platform TEXT NOT NULL DEFAULT 'LeetCode', -- 'LeetCode', 'Codeforces', 'GeeksforGeeks', 'Other'
  problem_url TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'Solved',
  notes TEXT,
  solved_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. User Notification Settings (Customized Push Preferences)
CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  reminder_before_minutes INT NOT NULL DEFAULT 10,
  reminder_at_start BOOLEAN NOT NULL DEFAULT true,
  reminder_missed BOOLEAN NOT NULL DEFAULT true,
  missed_threshold_minutes INT NOT NULL DEFAULT 30,
  daily_summary BOOLEAN NOT NULL DEFAULT true,
  daily_summary_time TIME NOT NULL DEFAULT '21:00:00',
  revision_reminders BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME NOT NULL DEFAULT '22:00:00',
  quiet_hours_end TIME NOT NULL DEFAULT '07:00:00',
  category_preferences JSONB NOT NULL DEFAULT '{"DSA": true, "Web Dev": true, "Core CS": true, "Revision": true}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Web Push Subscriptions (Supports Multiple Devices Per User)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_name TEXT NOT NULL DEFAULT 'Mobile Phone',
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Notification Delivery Logs (Strict Idempotency & Delivery Audit)
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.study_sessions(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'before_session', 'session_start', 'missed_session', 'daily_summary', 'revision', 'test'
  scheduled_for DATE NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE, -- Prevents duplicate notifications (e.g. {sessionId}_{date}_{type})
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'suppressed_quiet_hours'
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dsa_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Study Sessions Policies
CREATE POLICY "Users can view own study sessions" ON public.study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own study sessions" ON public.study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own study sessions" ON public.study_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own study sessions" ON public.study_sessions FOR DELETE USING (auth.uid() = user_id);

-- Session Logs Policies
CREATE POLICY "Users can view own session logs" ON public.session_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own session logs" ON public.session_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own session logs" ON public.session_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own session logs" ON public.session_logs FOR DELETE USING (auth.uid() = user_id);

-- DSA Problems Policies
CREATE POLICY "Users can view own DSA problems" ON public.dsa_problems FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own DSA problems" ON public.dsa_problems FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own DSA problems" ON public.dsa_problems FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own DSA problems" ON public.dsa_problems FOR DELETE USING (auth.uid() = user_id);

-- Notification Settings Policies
CREATE POLICY "Users can view own settings" ON public.user_notification_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert/update own settings" ON public.user_notification_settings FOR ALL USING (auth.uid() = user_id);

-- Push Subscriptions Policies
CREATE POLICY "Users can view own subscriptions" ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own subscriptions" ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- Notification Logs Policies
CREATE POLICY "Users can view own notification logs" ON public.notification_logs FOR SELECT USING (auth.uid() = user_id);

-- Service Role Bypass (For Edge Function and Cloud Scheduler)
CREATE POLICY "Service role full access on profiles" ON public.profiles FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on study_sessions" ON public.study_sessions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on session_logs" ON public.session_logs FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on dsa_problems" ON public.dsa_problems FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on user_notification_settings" ON public.user_notification_settings FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on push_subscriptions" ON public.push_subscriptions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on notification_logs" ON public.notification_logs FOR ALL TO service_role USING (true);

-- Auto-create profile & notification settings on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, timezone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'Asia/Kolkata')
  );

  INSERT INTO public.user_notification_settings (user_id, timezone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'Asia/Kolkata')
  );

  -- Seed Default Starter Study Sessions
  INSERT INTO public.study_sessions (user_id, title, category, start_time, end_time, days_of_week)
  VALUES
    (NEW.id, 'DSA Practice', 'DSA', '18:00:00', '19:00:00', '{0,1,2,3,4,5,6}'),
    (NEW.id, 'System Design & Web Tech', 'Web Dev', '20:00:00', '21:00:00', '{1,2,3,4,5}');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- Cloud Reminder Scheduler: pg_cron + pg_net trigger
-- ==============================================================================
-- This SQL function calls the Supabase Edge Function or Vercel API every minute.
-- Replace YOUR_PROJECT_REF and YOUR_ANON_KEY or SERVICE_ROLE_KEY accordingly.

CREATE OR REPLACE FUNCTION public.trigger_reminder_cron()
RETURNS void AS $$
DECLARE
  project_url text := current_setting('app.settings.project_url', true);
  cron_secret text := current_setting('app.settings.cron_secret', true);
BEGIN
  -- Calls the edge function securely via pg_net
  PERFORM net.http_post(
    url := project_url || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cron_secret
    ),
    body := jsonb_build_object('triggered_at', now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- To schedule every minute via pg_cron:
-- SELECT cron.schedule('check-study-reminders-job', '* * * * *', 'SELECT public.trigger_reminder_cron()');
