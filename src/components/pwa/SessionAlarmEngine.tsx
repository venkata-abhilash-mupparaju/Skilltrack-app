// SkillTrack Client-Side Background Session Alarm Engine
// Monitors today's study sessions in real-time, displays on-device notifications, and syncs schedules to the cloud

'use client';

import { useEffect, useRef } from 'react';
import { useSkillTrackStore } from '@/lib/store';
import { extractIanaTimezone } from '@/lib/timezones';
import { StudySession, UserNotificationSettings } from '@/types';

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
}

function getLocalMinutesInTimezone(timeZone: string): { totalMinutes: number; dateStr: string; dayOfWeek: number } {
  const now = new Date();
  const cleanTz = extractIanaTimezone(timeZone);
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: cleanTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const map: Record<string, string> = {};
    parts.forEach((p) => { map[p.type] = p.value; });
    const h = parseInt(map.hour, 10);
    const m = parseInt(map.minute, 10);

    const dayName = new Intl.DateTimeFormat('en-US', { timeZone: cleanTz, weekday: 'short' }).format(now);
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

    return {
      totalMinutes: h * 60 + m,
      dateStr: `${map.year}-${map.month}-${map.day}`,
      dayOfWeek: dayMap[dayName] ?? now.getDay(),
    };
  } catch {
    const h = now.getHours();
    const m = now.getMinutes();
    return {
      totalMinutes: h * 60 + m,
      dateStr: now.toISOString().split('T')[0],
      dayOfWeek: now.getDay(),
    };
  }
}

export function SessionAlarmEngine() {
  const { todaySessions, settings } = useSkillTrackStore();
  const isCheckingRef = useRef(false);
  const lastSyncTimeRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkSessionsAndSync = async () => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        // 1. Read fresh sessions directly from localStorage to catch all updates immediately
        let allSessions: StudySession[] = [];
        try {
          const raw = localStorage.getItem('skilltrack_sessions');
          allSessions = raw ? JSON.parse(raw) : todaySessions;
        } catch {
          allSessions = todaySessions;
        }

        let userSettings: UserNotificationSettings = settings;
        try {
          const rawSett = localStorage.getItem('skilltrack_settings');
          if (rawSett) userSettings = JSON.parse(rawSett);
        } catch {
          userSettings = settings;
        }

        const tz = userSettings?.timezone || 'Asia/Kolkata';
        const { totalMinutes: nowMinutes, dateStr, dayOfWeek } = getLocalMinutesInTimezone(tz);
        const beforeOffset = userSettings?.reminder_before_minutes || 10;

        // Filter sessions for today
        const todaysList = allSessions.filter((s) => {
          if (!s.is_active) return false;
          const days = s.days_of_week && s.days_of_week.length > 0 ? s.days_of_week : [0, 1, 2, 3, 4, 5, 6];
          return days.includes(dayOfWeek);
        });

        // 2. Client-side on-device notification triggers
        if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;

          for (const session of todaysList) {
            const startMinutes = parseTimeToMinutes(session.start_time);
            const minutesUntilStart = startMinutes - nowMinutes;

            // Advance Reminder: within advance window
            if (minutesUntilStart > 0 && minutesUntilStart <= beforeOffset) {
              const idempotencyKey = `alarm_${session.id}_${dateStr}_before_${beforeOffset}`;
              if (!localStorage.getItem(idempotencyKey)) {
                localStorage.setItem(idempotencyKey, '1');
                reg.showNotification(`🎯 ${session.title} Starts Soon`, {
                  body: `Your ${session.title} session starts in ${minutesUntilStart} minute(s). Get ready!`,
                  icon: '/icons/icon-192x192.png',
                  badge: '/icons/badge-72x72.png',
                  vibrate: [200, 100, 200, 100, 300],
                  tag: idempotencyKey,
                  data: { url: '/schedule' },
                } as any);
              }
            }

            // Session Start Reminder
            if (
              userSettings?.reminder_at_start &&
              nowMinutes >= startMinutes &&
              nowMinutes < startMinutes + 15
            ) {
              const idempotencyKey = `alarm_${session.id}_${dateStr}_start`;
              if (!localStorage.getItem(idempotencyKey)) {
                localStorage.setItem(idempotencyKey, '1');
                reg.showNotification(`⚡ Study Time: ${session.title}`, {
                  body: `It's time for ${session.title}! Solve your daily problems now.`,
                  icon: '/icons/icon-192x192.png',
                  badge: '/icons/badge-72x72.png',
                  vibrate: [200, 100, 200, 100, 300],
                  tag: idempotencyKey,
                  data: { url: '/schedule' },
                } as any);
              }
            }
          }
        }

        // 3. Periodically sync sessions & push subscription to cloud reminder engine
        const nowMs = Date.now();
        if (nowMs - lastSyncTimeRef.current > 45000 && 'serviceWorker' in navigator) {
          lastSyncTimeRef.current = nowMs;
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();

          const rawUser = localStorage.getItem('skilltrack_user');
          const parsedUser = rawUser ? JSON.parse(rawUser) : null;
          const userId = parsedUser?.id || localStorage.getItem('skilltrack_anon_id') || 'guest-user';

          if (sub) {
            fetch('/api/sessions/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                sessions: allSessions,
                settings: userSettings,
                subscription: sub.toJSON(),
                deviceName: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser',
              }),
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('[SessionAlarmEngine] Error:', err);
      } finally {
        isCheckingRef.current = false;
      }
    };

    checkSessionsAndSync();
    const interval = setInterval(checkSessionsAndSync, 20000);
    return () => clearInterval(interval);
  }, [todaySessions, settings]);

  return null;
}
