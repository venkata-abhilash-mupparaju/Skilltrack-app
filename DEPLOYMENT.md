# 🚀 SkillTrack: Production Deployment & Mobile PWA Guide

SkillTrack is built to run **independently of your laptop**. Scheduled learning reminders are dispatched by the cloud scheduler (Supabase Cron / Edge Function / Vercel Cron) directly to your mobile phone even when your laptop is completely powered off and the website is closed.

---

## 📱 Mobile Installation Guide

### Android (Google Chrome, Edge, Brave, Samsung Internet)
1. Open your deployed SkillTrack URL (e.g. `https://skilltrack.vercel.app`) in **Chrome** on your phone.
2. An **Install SkillTrack** banner will appear at the top.
3. Tap **Install** (or tap Chrome's `⋮` three-dot menu &rarr; **Install app** / **Add to Home screen**).
4. Tap **Install** to confirm.
5. SkillTrack is now installed as an independent standalone app on your home screen and app drawer!
6. Open SkillTrack from your phone's home screen.
7. Navigate to **Reminders** (or tap the banner) and tap **"Enable This Device"**.
8. Tap **Allow** when Android asks for notification permissions.
9. Tap **"Send Test Notification"** to confirm your phone vibrates/alerts immediately.

### Apple iOS 16.4+ (Safari)
> *Note: Apple requires PWAs to be added to the Home Screen before Web Push notifications can be activated.*
1. Open the SkillTrack URL in **Safari** on your iPhone or iPad.
2. Tap the **Share** button in Safari's bottom toolbar (square with upward arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add** in the top-right corner.
5. Close Safari. Open the **SkillTrack** icon from your iOS Home Screen.
6. Go to **Reminders** &rarr; tap **"Enable This Device"**.
7. Tap **Allow** on the iOS notification permission prompt.
8. Tap **"Send Test Notification"** — iOS will display the push banner and alert sound.

---

## ☁️ Cloud Infrastructure & Deployment

### 1. Database & Supabase Setup
1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open `supabase/schema.sql` from this codebase, copy the SQL, paste it into the SQL Editor, and click **Run**.
   - This creates all tables: `profiles`, `study_sessions`, `session_logs`, `dsa_problems`, `user_notification_settings`, `push_subscriptions`, `notification_logs`.
   - Configures Row Level Security (RLS) policies.
   - Sets up the `handle_new_user()` auto-provisioning trigger.
   - Enables `pg_cron` and `pg_net` for cloud scheduling.

### 2. Deploy Supabase Edge Function (Option A - Supabase Cron)
If deploying the Edge Function directly on Supabase:
```bash
# Login to Supabase CLI
npx supabase login

# Link your remote Supabase project
npx supabase link --project-ref your-project-ref

# Set secrets on Supabase
npx supabase secrets set \
  VAPID_PUBLIC_KEY="BCX8n0OBCdbXi_BP55YNjtmkatUYYfAivT6OlEFq06TpyhG-VEOtolky3J1O8r60zZA9jHKM5Y5nH5oikTVC4zc" \
  VAPID_PRIVATE_KEY="bicSZGAeYMP0PccAAUaDAPBNg6PMM8KKtbzU_maKdAY" \
  VAPID_SUBJECT="mailto:notifications@skilltrack.app" \
  CRON_SECRET="12bd16720aad8b6f6a007e3762c67304ce62e55cfc3fe36a"

# Deploy Edge Function
npx supabase functions deploy send-reminders --no-verify-jwt
```
In Supabase SQL Editor, schedule the function every minute using `pg_cron`:
```sql
SELECT cron.schedule(
  'study-reminders-job',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 12bd16720aad8b6f6a007e3762c67304ce62e55cfc3fe36a'
    ),
    body := jsonb_build_object('time', now())
  );
  $$
);
```

### 3. Deploy Next.js to Vercel (Option B - Vercel Cron)
SkillTrack includes `vercel.json` configured with a 1-minute cron job calling `/api/cron/reminders`.
1. Push this project to GitHub.
2. In [Vercel Dashboard](https://vercel.com), click **Add New Project** and import the repository.
3. Under **Environment Variables**, add:
   | Variable | Value | Purpose |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase API URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-key` | Supabase Public Key |
   | `SUPABASE_SERVICE_ROLE_KEY` | `your-service-role-key` | Server-side push & cron access |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `BCX8n0OBCdbXi_BP55YNjtmkatUYYfAivT6OlEFq06TpyhG-VEOtolky3J1O8r60zZA9jHKM5Y5nH5oikTVC4zc` | Public VAPID key |
   | `VAPID_PRIVATE_KEY` | `bicSZGAeYMP0PccAAUaDAPBNg6PMM8KKtbzU_maKdAY` | Private VAPID key (Secret) |
   | `VAPID_SUBJECT` | `mailto:notifications@skilltrack.app` | VAPID Contact URI |
   | `CRON_SECRET` | `12bd16720aad8b6f6a007e3762c67304ce62e55cfc3fe36a` | Authorization token for cron |
   | `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` | Production app domain |
4. Click **Deploy**. Vercel will automatically configure the `/api/cron/reminders` schedule.

---

## 🧪 Verification & Acceptance Test Suite

| Test # | Test Name | Procedure | Expected Result |
|---|---|---|---|
| **Test 1 & 2** | **5-Min Reminder Laptop-Off Test** | In **Settings &rarr; Test Bench**, click **"Schedule 5-Min Test"**. Shut down or close your laptop completely. Keep phone on. | At the scheduled minute, the cloud engine executes and delivers the push notification to your phone. |
| **Test 3** | **Notification Click Navigation** | Tap the push notification banner on your phone screen. | Phone launches SkillTrack directly to `/schedule` with session highlighted. |
| **Test 4** | **Real-Time Cross-Device Sync** | Add a session or log a problem on your laptop; refresh mobile dashboard. | Supabase real-time updates mobile dashboard instantly. |
| **Test 5** | **Strict Duplicate Prevention** | Trigger cron multiple times back-to-back via **Test Bench &rarr; "Test Idempotency"**. | `idempotency_key` ensures 0 duplicate notifications are delivered. |
| **Test 6** | **Expired & Offline Subscription Handling** | Unsubscribe or clear browser storage, then trigger notification. | HTTP 410/404 is caught and the dead subscription is automatically pruned. |
| **Test 7** | **Android & iOS Device Verification** | Install on Android Chrome and iOS Safari Home Screen. Send test push. | Both platforms display native lockscreen & notification shade alerts with vibration. |
