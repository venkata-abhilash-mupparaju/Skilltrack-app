# ⚡ SkillTrack

**Mobile PWA and Cloud-Based Push Notification System** designed to operate **100% independently of your laptop**.

---

## 🌟 Key Features

- **Progressive Web App (PWA)**:
  - Installable on Android (Chrome, Edge, Samsung Internet) and iOS (Safari 16.4+).
  - Standalone display mode with custom splash screen and theme colors (`#0f172a` / `#0b0f19`).
  - Offline fallback page (`/offline.html`) and Service Worker (`/sw.js`).
  - Interactive "Install App" banner and native installation prompt.

- **Real Mobile Push Notifications (Server-Side Web Push)**:
  - Cryptographically secure ECDSA VAPID keys.
  - Multi-device support: register multiple phones and laptops per user.
  - Device management UI: view all enrolled devices and remove old/stale devices.
  - Automatic pruning of expired push subscriptions (HTTP 410 / 404).

- **Cloud-Based Reminder Scheduler (Independent of Laptop)**:
  - **No browser timers, no laptop scheduling, no setInterval**.
  - Reminders originate from **Supabase Cron (`pg_cron`) / Supabase Edge Functions** and **Vercel Cron (`/api/cron/reminders`)**.
  - Strict **idempotency keys** (`${session_id}_${date}_${type}`) in `notification_logs` to prevent duplicate alerts.
  - User timezone aware (converts UTC to user local time).
  - Advance reminders (e.g. 10m before), session start alerts, and missed-session reminders.
  - Configurable Quiet Hours suppression.

- **Mobile Dashboard**:
  - Touch-friendly layout with bottom navigation bar.
  - Next upcoming reminder card with live countdown.
  - One-tap session completion with confetti celebrations.
  - Quick-add DSA problem modal.
  - Habit streak counter and weekly consistency metrics.
  - Real-time cloud sync with Supabase.

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev

# 3. Open in browser
http://localhost:3000
```

To run the verification test suite:
```bash
npm run test-all
```

---

## ☁️ Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for full instructions on Supabase setup, Edge Function deployment, Vercel deployment, and mobile installation.
