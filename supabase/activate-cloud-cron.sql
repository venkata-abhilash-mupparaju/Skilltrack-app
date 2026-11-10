-- ==============================================================================
-- SkillTrack 1-Minute Cloud Cron Scheduler
-- Runs in Supabase Postgres to ping your Vercel reminders API every minute
-- ==============================================================================

-- 1. Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. Unschedule any previous job if exists
DO $$
BEGIN
  PERFORM cron.unschedule('skilltrack-minute-reminders');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 3. Schedule the 1-Minute Cloud Cron Job
-- Note: Replace the URL below with your actual live Vercel domain if different
SELECT cron.schedule(
  'skilltrack-minute-reminders',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://skilltrack-app-abhi-b3c3.vercel.app/api/cron/reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);

-- 4. Check that the job is active
SELECT jobid, jobname, schedule, active FROM cron.job;
