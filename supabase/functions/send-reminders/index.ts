// Supabase Edge Function: Cloud Reminder Scheduler (Deno)
// Fully independent cloud push dispatcher. Runs even when user laptop is shut down.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

interface PushPayload {
  title: string;
  body: string;
  url: string;
  type: string;
  scheduleId?: string;
}

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_name: string;
}

// Helper to format date parts in specific timezone
function getTimeInTimezone(date: Date, timeZone: string) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      weekday: "numeric", // 1 (Sun) to 7 (Sat) or we compute
    });
    const parts = formatter.formatToParts(date);
    const map: Record<string, string> = {};
    parts.forEach((p) => {
      map[p.type] = p.value;
    });

    // Compute standard JS day of week (0=Sunday ... 6=Saturday)
    const localDateStr = `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`;
    const weekdayIdx = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
    const dayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    return {
      dateStr: `${map.year}-${map.month}-${map.day}`,
      hours: parseInt(map.hour, 10),
      minutes: parseInt(map.minute, 10),
      totalMinutes: parseInt(map.hour, 10) * 60 + parseInt(map.minute, 10),
      dayOfWeek: dayMap[weekdayIdx] ?? 0,
    };
  } catch (e) {
    // Fallback to UTC if timezone is invalid
    return {
      dateStr: date.toISOString().split("T")[0],
      hours: date.getUTCHours(),
      minutes: date.getUTCMinutes(),
      totalMinutes: date.getUTCHours() * 60 + date.getUTCMinutes(),
      dayOfWeek: date.getUTCDay(),
    };
  }
}

// Convert "HH:MM:SS" or "HH:MM" to total minutes
function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map((v) => parseInt(v, 10));
  return h * 60 + m;
}

// Check if current minutes fall in quiet hours
function isInQuietHours(currentMinutes: number, startStr: string, endStr: string): boolean {
  const start = parseTimeToMinutes(startStr);
  const end = parseTimeToMinutes(endStr);
  if (start < end) {
    return currentMinutes >= start && currentMinutes < end;
  } else {
    // Crosses midnight (e.g. 22:00 to 07:00)
    return currentMinutes >= start || currentMinutes < end;
  }
}

// Deno Web Push sender using standard Web Crypto and VAPID
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
  vapidPublic: string,
  vapidPrivate: string,
  vapidSubject: string
): Promise<{ success: boolean; statusCode: number; error?: string }> {
  try {
    // Note: In Deno Edge runtime, we can either use standard npm:web-push or fetch to push service
    const webpush = await import("npm:web-push@3.6.7");
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload)
    );

    return { success: true, statusCode: 201 };
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    return { success: false, statusCode, error: err.message || String(err) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") || Deno.env.get("NEXT_PUBLIC_VAPID_PUBLIC_KEY") || "";
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:notifications@skilltrack.app";
  const cronSecret = Deno.env.get("CRON_SECRET") || "";

  // Optional: check secret if provided in Authorization header
  const authHeader = req.headers.get("Authorization");
  if (cronSecret && authHeader && !authHeader.includes(cronSecret)) {
    // allow service_role key as well
    if (!authHeader.includes(supabaseServiceKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const nowUtc = new Date();
  const summary = {
    processedUsers: 0,
    remindersSent: 0,
    suppressedQuietHours: 0,
    skippedDuplicate: 0,
    expiredSubscriptionsRemoved: 0,
  };

  try {
    // 1. Fetch all users with active notification settings
    const { data: settingsList, error: settingsError } = await supabase
      .from("user_notification_settings")
      .select("*")
      .eq("enabled", true);

    if (settingsError) throw settingsError;
    if (!settingsList || settingsList.length === 0) {
      return new Response(JSON.stringify({ message: "No active notification users found", summary }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Loop through users and their schedules
    for (const settings of settingsList) {
      summary.processedUsers++;
      const userTz = settings.timezone || "Asia/Kolkata";
      const local = getTimeInTimezone(nowUtc, userTz);

      // Check quiet hours
      const inQuiet = settings.quiet_hours_enabled
        ? isInQuietHours(local.totalMinutes, settings.quiet_hours_start, settings.quiet_hours_end)
        : false;

      // 3. Fetch active study sessions for this user matching today's day of week
      const { data: sessions, error: sessionsErr } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", settings.user_id)
        .eq("is_active", true)
        .contains("days_of_week", [local.dayOfWeek]);

      if (sessionsErr || !sessions || sessions.length === 0) continue;

      // 4. Fetch subscriptions for this user
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", settings.user_id);

      if (!subscriptions || subscriptions.length === 0) continue;

      // 5. Evaluate each study session
      for (const session of sessions) {
        const startMinutes = parseTimeToMinutes(session.start_time);
        const endMinutes = parseTimeToMinutes(session.end_time);
        const beforeOffset = settings.reminder_before_minutes || 10;
        const targetBeforeMinutes = startMinutes - beforeOffset;

        let reminderType: string | null = null;
        let title = "";
        let body = "";
        let idempotencyKey = "";

        // Trigger 1: Before session (e.g., exactly at 10 minutes before)
        // Allow a 2-minute processing window (local.totalMinutes == targetBeforeMinutes)
        if (Math.abs(local.totalMinutes - targetBeforeMinutes) <= 1) {
          reminderType = "before_session";
          title = "SkillTrack: Upcoming Session";
          body = `Your ${session.title} practice session starts in ${beforeOffset} minutes. Get ready!`;
          idempotencyKey = `${session.id}_${local.dateStr}_before_${beforeOffset}`;
        }
        // Trigger 2: At session start
        else if (settings.reminder_at_start && Math.abs(local.totalMinutes - startMinutes) <= 1) {
          reminderType = "session_start";
          title = "SkillTrack: Study Time!";
          body = `It's time for ${session.title}! Solve your daily problems.`;
          idempotencyKey = `${session.id}_${local.dateStr}_start`;
        }
        // Trigger 3: Missed session (after session has passed + threshold)
        else if (
          settings.reminder_missed &&
          local.totalMinutes >= endMinutes + (settings.missed_threshold_minutes || 30) &&
          local.totalMinutes <= endMinutes + (settings.missed_threshold_minutes || 30) + 15
        ) {
          // Check if session was logged today
          const { data: log } = await supabase
            .from("session_logs")
            .select("id, status")
            .eq("user_id", settings.user_id)
            .eq("session_id", session.id)
            .eq("date", local.dateStr)
            .single();

          if (!log || log.status !== "completed") {
            reminderType = "missed_session";
            title = "SkillTrack: Missed Session Reminder";
            body = `You haven't checked off your ${session.title} session yet. Keep your streak alive!`;
            idempotencyKey = `${session.id}_${local.dateStr}_missed`;
          }
        }

        if (!reminderType) continue;

        // Check Idempotency: Prevent duplicate notifications
        const { data: existingLog } = await supabase
          .from("notification_logs")
          .select("id")
          .eq("idempotency_key", idempotencyKey)
          .single();

        if (existingLog) {
          summary.skippedDuplicate++;
          continue;
        }

        // If quiet hours are active, record suppression and skip dispatch
        if (inQuiet) {
          summary.suppressedQuietHours++;
          await supabase.from("notification_logs").insert({
            user_id: settings.user_id,
            session_id: session.id,
            notification_type: reminderType,
            scheduled_for: local.dateStr,
            idempotency_key: idempotencyKey,
            title,
            body,
            delivery_status: "suppressed_quiet_hours",
          });
          continue;
        }

        // Dispatch push notification to all user's registered devices
        const payload: PushPayload = {
          title,
          body,
          url: "/schedule",
          type: reminderType,
          scheduleId: session.id,
        };

        for (const sub of subscriptions) {
          const res = await sendWebPush(sub, payload, vapidPublic, vapidPrivate, vapidSubject);

          if (res.success) {
            summary.remindersSent++;
            await supabase
              .from("push_subscriptions")
              .update({ last_used_at: new Date().toISOString() })
              .eq("id", sub.id);
          } else {
            // Handle Expired / Invalid subscription: 410 Gone or 404 Not Found
            if (res.statusCode === 410 || res.statusCode === 404) {
              summary.expiredSubscriptionsRemoved++;
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            }
          }
        }

        // Record in delivery log
        await supabase.from("notification_logs").insert({
          user_id: settings.user_id,
          session_id: session.id,
          notification_type: reminderType,
          scheduled_for: local.dateStr,
          idempotency_key: idempotencyKey,
          title,
          body,
          delivery_status: "sent",
        });
      }
    }

    return new Response(JSON.stringify({ status: "success", summary }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
