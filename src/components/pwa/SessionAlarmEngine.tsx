// SkillTrack Client-Side Background Session Alarm Engine
// Monitors today's study sessions in real-time and triggers notifications on time

'use client';

import { useEffect, useRef } from 'react';
import { useSkillTrackStore } from '@/lib/store';
import { extractIanaTimezone } from '@/lib/timezones';

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
}

function getLocalMinutesInTimezone(timeZone: string): { totalMinutes: number; dateStr: string } {
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
    return {
      totalMinutes: h * 60 + m,
      dateStr: `${map.year}-${map.month}-${map.day}`,
    };
  } catch {
    const h = now.getHours();
    const m = now.getMinutes();
    return {
      totalMinutes: h * 60 + m,
      dateStr: now.toISOString().split('T')[0],
    };
  }
}

export function SessionAlarmEngine() {
  const { todaySessions, settings, devices } = useSkillTrackStore();
  const isCheckingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkSessions = async () => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
          return;
        }

        const tz = settings?.timezone || 'Asia/Kolkata';
        const { totalMinutes: nowMinutes, dateStr } = getLocalMinutesInTimezone(tz);
        const beforeOffset = settings?.reminder_before_minutes || 10;

        for (const session of todaySessions) {
          if (!session.is_active) continue;

          const startMinutes = parseTimeToMinutes(session.start_time);
          const minutesUntilStart = startMinutes - nowMinutes;

          // 1. Advance Reminder (Prior to Session)
          if (minutesUntilStart > 0 && minutesUntilStart <= beforeOffset) {
            const idempotencyKey = `alarm_${session.id}_${dateStr}_before_${beforeOffset}`;
            if (!localStorage.getItem(idempotencyKey)) {
              localStorage.setItem(idempotencyKey, '1');

              if ('serviceWorker' in navigator) {
                const reg = await navigator.serviceWorker.ready;
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
          }

          // 2. Session Start Reminder
          if (
            settings?.reminder_at_start &&
            nowMinutes >= startMinutes &&
            nowMinutes < startMinutes + 15
          ) {
            const idempotencyKey = `alarm_${session.id}_${dateStr}_start`;
            if (!localStorage.getItem(idempotencyKey)) {
              localStorage.setItem(idempotencyKey, '1');

              if ('serviceWorker' in navigator) {
                const reg = await navigator.serviceWorker.ready;
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
      } catch (err) {
        console.warn('[SessionAlarmEngine] Check error:', err);
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Run immediately on mount or sessions change
    checkSessions();

    // Check every 25 seconds
    const interval = setInterval(checkSessions, 25000);
    return () => clearInterval(interval);
  }, [todaySessions, settings, devices]);

  return null;
}
