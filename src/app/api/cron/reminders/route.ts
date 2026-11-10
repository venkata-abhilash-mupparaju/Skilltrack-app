import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getServiceSupabase } from '@/lib/supabase/server';
import { localSubscriptionsCache } from '@/lib/pwa/subscriptionCache';

const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:notifications@skilltrack.app';
const cronSecret = process.env.CRON_SECRET || '';

if (vapidPublic && vapidPrivate) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  } catch (err) {
    console.error('[WebPush Cron] VAPID error:', err);
  }
}

import { extractIanaTimezone } from '@/lib/timezones';

// Convert UTC Date to components in user timezone
function getUserLocalTime(date: Date, timeZone: string) {
  const cleanTz = extractIanaTimezone(timeZone);
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: cleanTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const map: Record<string, string> = {};
    parts.forEach((p) => {
      map[p.type] = p.value;
    });

    const dayName = new Intl.DateTimeFormat('en-US', { timeZone: cleanTz, weekday: 'short' }).format(date);
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

    const hours = parseInt(map.hour, 10);
    const minutes = parseInt(map.minute, 10);

    return {
      dateStr: `${map.year}-${map.month}-${map.day}`,
      hours,
      minutes,
      totalMinutes: hours * 60 + minutes,
      dayOfWeek: dayMap[dayName] ?? 0,
    };
  } catch {
    return {
      dateStr: date.toISOString().split('T')[0],
      hours: date.getUTCHours(),
      minutes: date.getUTCMinutes(),
      totalMinutes: date.getUTCHours() * 60 + date.getUTCMinutes(),
      dayOfWeek: date.getUTCDay(),
    };
  }
}

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return h * 60 + m;
}

function isInQuietHours(currentMinutes: number, startStr: string, endStr: string): boolean {
  const start = parseTimeToMinutes(startStr);
  const end = parseTimeToMinutes(endStr);
  if (start < end) {
    return currentMinutes >= start && currentMinutes < end;
  } else {
    return currentMinutes >= start || currentMinutes < end;
  }
}

// In-memory duplicate log cache for local fallback
const localNotificationLogs = new Set<string>();

export async function GET(req: NextRequest) {
  return handleCronJob(req);
}

export async function POST(req: NextRequest) {
  return handleCronJob(req);
}

async function handleCronJob(req: NextRequest) {
  // Authorization check (Vercel Cron sets Authorization: Bearer <CRON_SECRET>, or allow simulation tests)
  const authHeader = req.headers.get('authorization');
  const secretParam = req.nextUrl.searchParams.get('secret');
  const isSimulation =
    req.headers.get('x-simulation') === 'true' ||
    req.nextUrl.searchParams.get('simulate') === 'true';

  if (cronSecret && !isSimulation) {
    const isAuthorized =
      (authHeader && authHeader === `Bearer ${cronSecret}`) ||
      (secretParam && secretParam === cronSecret) ||
      req.headers.get('x-vercel-cron') === '1';

    if (!isAuthorized && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized scheduler trigger' }, { status: 401 });
    }
  }

  const supabase = getServiceSupabase();
  const now = new Date();
  const summary = {
    processedUsers: 0,
    remindersSent: 0,
    suppressedQuietHours: 0,
    skippedDuplicate: 0,
    expiredSubscriptionsRemoved: 0,
    timestamp: now.toISOString(),
  };

  try {
    // If Supabase is configured, use database
    if (supabase) {
      // 1. Fetch all users who have active push subscriptions
      const { data: subsList } = await supabase
        .from('push_subscriptions')
        .select('*');

      // 2. Fetch user notification settings
      const { data: allSettings } = await supabase
        .from('user_notification_settings')
        .select('*');

      const settingsMap = new Map<string, any>();
      (allSettings || []).forEach((s) => settingsMap.set(s.user_id, s));

      // Group subscriptions by user_id
      const userSubsMap = new Map<string, any[]>();
      (subsList || []).forEach((sub) => {
        if (!sub.user_id) return;
        const current = userSubsMap.get(sub.user_id) || [];
        current.push(sub);
        userSubsMap.set(sub.user_id, current);
      });

      // Target users: all users with enrolled devices or enabled settings
      const targetUserIds = new Set<string>();
      (allSettings || []).filter((s) => s.enabled).forEach((s) => targetUserIds.add(s.user_id));
      Array.from(userSubsMap.keys()).forEach((uid) => targetUserIds.add(uid));

      for (const userId of targetUserIds) {
        summary.processedUsers++;
        const settings = settingsMap.get(userId) || {
          user_id: userId,
          enabled: true,
          timezone: 'Asia/Kolkata',
          reminder_before_minutes: 10,
          reminder_at_start: true,
          reminder_missed: true,
          missed_threshold_minutes: 30,
          daily_summary: true,
          quiet_hours_enabled: false,
          quiet_hours_start: '22:00',
          quiet_hours_end: '07:00',
        };

        const userTz = settings.timezone || 'Asia/Kolkata';
        const local = getUserLocalTime(now, userTz);

        const inQuiet = settings.quiet_hours_enabled
          ? isInQuietHours(local.totalMinutes, settings.quiet_hours_start, settings.quiet_hours_end)
          : false;

        const { data: rawSessions } = await supabase
          .from('study_sessions')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true);

        // Filter sessions active for today in JavaScript
        const sessions = (rawSessions || []).filter((s) => {
          const days = Array.isArray(s.days_of_week) && s.days_of_week.length > 0
            ? s.days_of_week
            : [0, 1, 2, 3, 4, 5, 6];
          return days.includes(local.dayOfWeek);
        });

        if (sessions.length === 0) continue;

        const subscriptions = userSubsMap.get(userId) || [];
        if (subscriptions.length === 0) continue;

        for (const session of sessions) {
          const startMinutes = parseTimeToMinutes(session.start_time);
          const endMinutes = parseTimeToMinutes(session.end_time);
          const beforeOffset = settings.reminder_before_minutes || 10;
          const minutesUntilStart = startMinutes - local.totalMinutes;

          let reminderType: string | null = null;
          let title = '';
          let body = '';
          let idempotencyKey = '';

          // 1. Advance Reminder (Prior to Session): session starts soon and hasn't started yet
          if (minutesUntilStart > 0 && minutesUntilStart <= beforeOffset) {
            reminderType = 'before_session';
            title = `🎯 ${session.title} Starts Soon`;
            body = `Your ${session.title} session starts in ${minutesUntilStart === beforeOffset ? beforeOffset : minutesUntilStart} minutes. Get ready!`;
            idempotencyKey = `${session.id}_${local.dateStr}_before_${beforeOffset}`;
          }
          // 2. At start reminder: within the first 15 minutes of session start
          else if (settings.reminder_at_start && local.totalMinutes >= startMinutes && local.totalMinutes < startMinutes + 15) {
            reminderType = 'session_start';
            title = `⚡ Study Time: ${session.title}`;
            body = `It's time for ${session.title}! Solve your daily problems now.`;
            idempotencyKey = `${session.id}_${local.dateStr}_start`;
          }
          // 3. Missed session reminder: after session ends + threshold
          else if (
            settings.reminder_missed &&
            local.totalMinutes >= endMinutes + (settings.missed_threshold_minutes || 30) &&
            local.totalMinutes <= endMinutes + (settings.missed_threshold_minutes || 30) + 15
          ) {
            const { data: log } = await supabase
              .from('session_logs')
              .select('id, status')
              .eq('user_id', settings.user_id)
              .eq('session_id', session.id)
              .eq('date', local.dateStr)
              .single();

            if (!log || log.status !== 'completed') {
              reminderType = 'missed_session';
              title = `⚠️ Incomplete Session: ${session.title}`;
              body = `You haven't checked off your ${session.title} session today yet. Keep your streak alive!`;
              idempotencyKey = `${session.id}_${local.dateStr}_missed`;
            }
          }

            if (!reminderType) continue;

            // Strict Idempotency Check
            const { data: existingLog } = await supabase
              .from('notification_logs')
              .select('id')
              .eq('idempotency_key', idempotencyKey)
              .single();

            if (existingLog) {
              summary.skippedDuplicate++;
              continue;
            }

            // Quiet hours suppression
            if (inQuiet) {
              summary.suppressedQuietHours++;
              await supabase.from('notification_logs').insert({
                user_id: settings.user_id,
                session_id: session.id,
                notification_type: reminderType,
                scheduled_for: local.dateStr,
                idempotency_key: idempotencyKey,
                title,
                body,
                delivery_status: 'suppressed_quiet_hours',
              });
              continue;
            }

            // Dispatch push notification
            const payload = JSON.stringify({
              title,
              body,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/badge-72x72.png',
              url: '/schedule',
              type: reminderType,
              scheduleId: session.id,
              tag: `session-${session.id}`,
            });

            for (const sub of subscriptions) {
              try {
                await webpush.sendNotification(
                  {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                  },
                  payload,
                  { TTL: 300, urgency: 'high' }
                );
                summary.remindersSent++;
                await supabase
                  .from('push_subscriptions')
                  .update({ last_used_at: new Date().toISOString() })
                  .eq('id', sub.id);
              } catch (err: any) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                  summary.expiredSubscriptionsRemoved++;
                  await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                }
              }
            }

            await supabase.from('notification_logs').insert({
              user_id: settings.user_id,
              session_id: session.id,
              notification_type: reminderType,
              scheduled_for: local.dateStr,
              idempotency_key: idempotencyKey,
              title,
              body,
              delivery_status: 'sent',
            });
          }
        }
      }

    // Also dispatch to local mock cache if any local test subscriptions exist
    if (localSubscriptionsCache.size > 0 && summary.remindersSent === 0) {
      const nowLocal = getUserLocalTime(now, 'Asia/Kolkata');
      for (const [endpoint, sub] of Array.from(localSubscriptionsCache.entries())) {
        const testKey = `manual_cron_test_${nowLocal.dateStr}_${nowLocal.hours}_${nowLocal.minutes}`;
        if (!localNotificationLogs.has(testKey)) {
          localNotificationLogs.add(testKey);
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify({
                title: '⚡ Cloud Scheduler Triggered',
                body: `Cloud reminder engine executed at ${now.toLocaleTimeString()}. All schedules are active.`,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/badge-72x72.png',
                url: '/schedule',
              })
            );
            summary.remindersSent++;
          } catch (err: any) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              localSubscriptionsCache.delete(endpoint);
              summary.expiredSubscriptionsRemoved++;
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cloud reminder scheduler executed successfully',
      summary,
    });
  } catch (err: any) {
    console.error('[Cron Reminders Engine Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
