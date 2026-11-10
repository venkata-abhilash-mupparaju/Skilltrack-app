-- ==============================================================================
-- SkillTrack: Fix Cloud Reminder Sync & Database Row Level Security
-- Run this in your Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Drop foreign key constraints so any user account (authenticated or local)
-- can sync study sessions and push subscription devices to Supabase
ALTER TABLE IF EXISTS public.push_subscriptions 
  DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;

ALTER TABLE IF EXISTS public.study_sessions 
  DROP CONSTRAINT IF EXISTS study_sessions_user_id_fkey;

ALTER TABLE IF EXISTS public.user_notification_settings 
  DROP CONSTRAINT IF EXISTS user_notification_settings_user_id_fkey;

ALTER TABLE IF EXISTS public.notification_logs 
  DROP CONSTRAINT IF EXISTS notification_logs_user_id_fkey;

ALTER TABLE IF EXISTS public.session_logs 
  DROP CONSTRAINT IF EXISTS session_logs_user_id_fkey;

ALTER TABLE IF EXISTS public.dsa_problems 
  DROP CONSTRAINT IF EXISTS dsa_problems_user_id_fkey;

-- 2. Disable Row Level Security on reminder and session tables so that the Next.js
-- cloud backend can read and write notifications without being blocked
ALTER TABLE public.push_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dsa_problems DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 3. Grant full permissions to anon and authenticated roles
GRANT ALL ON TABLE public.push_subscriptions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.study_sessions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_notification_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.notification_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.session_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.dsa_problems TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;

-- 4. Enable automatic Cloud Cron (runs every minute independently)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_skilltrack_reminders()
RETURNS void AS $$
BEGIN
  -- Calls your live Vercel reminder endpoint with secret
  PERFORM net.http_get(
    url := 'https://skilltrack-app-git-main-abhi-b3c3.vercel.app/api/cron/reminders?secret=12bd16720aad8b6f6a007e3762c67304ce62e55cfc3fe36a'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unschedule any old job if present and register the 1-minute reminder job
SELECT cron.unschedule(jobid) 
FROM cron.job 
WHERE jobname = 'skilltrack-reminders-job';

SELECT cron.schedule(
  'skilltrack-reminders-job',
  '* * * * *',
  'SELECT public.trigger_skilltrack_reminders()'
);
