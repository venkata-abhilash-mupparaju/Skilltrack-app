'use client';

import { useState, useEffect } from 'react';
import { Bell, Clock, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { StudySession, UserNotificationSettings } from '@/types';
import Link from 'next/link';

interface UpcomingReminderCardProps {
  sessions: StudySession[];
  settings: UserNotificationSettings;
  onSendTest?: () => void;
}

export function UpcomingReminderCard({ sessions, settings, onSendTest }: UpcomingReminderCardProps) {
  const [upcomingInfo, setUpcomingInfo] = useState<{
    session: StudySession | null;
    reminderTimeStr: string;
    countdownStr: string;
    isImminent: boolean;
    notificationPreview: string;
  }>({
    session: null,
    reminderTimeStr: '',
    countdownStr: '',
    isImminent: false,
    notificationPreview: '',
  });

  useEffect(() => {
    function computeNext() {
      const now = new Date();
      const currentDay = now.getDay();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Find active sessions for today
      const todaySessions = sessions
        .filter((s) => s.is_active && (s.days_of_week || []).includes(currentDay))
        .sort((a, b) => {
          const [ha, ma] = a.start_time.split(':').map(Number);
          const [hb, mb] = b.start_time.split(':').map(Number);
          return ha * 60 + ma - (hb * 60 + mb);
        });

      if (todaySessions.length === 0) {
        setUpcomingInfo({
          session: null,
          reminderTimeStr: '',
          countdownStr: 'No more sessions scheduled for today',
          isImminent: false,
          notificationPreview: '',
        });
        return;
      }

      const offsetMinutes = settings.reminder_before_minutes || 10;
      let nextSession: StudySession | null = null;
      let reminderTotalMin = 0;
      let isBefore = true;

      for (const s of todaySessions) {
        const [h, m] = s.start_time.split(':').map(Number);
        const sessionStartMin = h * 60 + m;
        const targetMin = sessionStartMin - offsetMinutes;

        if (currentMinutes < targetMin) {
          nextSession = s;
          reminderTotalMin = targetMin;
          isBefore = true;
          break;
        } else if (currentMinutes < sessionStartMin) {
          nextSession = s;
          reminderTotalMin = sessionStartMin;
          isBefore = false;
          break;
        }
      }

      // If all of today's sessions started, pick the first one tomorrow or mark done
      if (!nextSession) {
        setUpcomingInfo({
          session: null,
          reminderTimeStr: 'Tomorrow',
          countdownStr: 'All sessions for today completed or started',
          isImminent: false,
          notificationPreview: 'Stay tuned for tomorrow’s scheduled learning alerts.',
        });
        return;
      }

      const remH = Math.floor(reminderTotalMin / 60);
      const remM = reminderTotalMin % 60;
      const formattedTime = `${remH % 12 || 12}:${remM < 10 ? '0' : ''}${remM} ${remH >= 12 ? 'PM' : 'AM'}`;

      const diffMin = reminderTotalMin - currentMinutes;
      let countdown = '';
      if (diffMin <= 1) countdown = 'in less than a minute';
      else if (diffMin < 60) countdown = `in ${diffMin} minutes`;
      else {
        const diffH = Math.floor(diffMin / 60);
        const remRemainM = diffMin % 60;
        countdown = `in ${diffH}h ${remRemainM}m`;
      }

      const preview = isBefore
        ? `Your ${nextSession.title} session starts in ${offsetMinutes} minutes. Get ready!`
        : `It's time for ${nextSession.title}! Solve your daily problems.`;

      setUpcomingInfo({
        session: nextSession,
        reminderTimeStr: formattedTime,
        countdownStr: countdown,
        isImminent: diffMin <= 15,
        notificationPreview: preview,
      });
    }

    computeNext();
    const interval = setInterval(computeNext, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [sessions, settings]);

  return (
    <div className="bg-gradient-to-br from-surface-900 via-surface-900 to-primary-950/40 border border-surface-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-400">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-400">
              Cloud Reminder Engine
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white">Next Scheduled Push</h2>
          </div>
        </div>

        <Link
          href="/settings/notifications"
          className="text-xs text-primary-400 hover:text-primary-300 font-medium hover:underline flex items-center gap-1"
        >
          <span>Preferences</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {upcomingInfo.session ? (
        <div className="space-y-3">
          <div className="bg-surface-800/80 border border-surface-700/60 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-white text-sm sm:text-base truncate">
                {upcomingInfo.session.title}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 font-medium text-[11px] shrink-0">
                {upcomingInfo.reminderTimeStr} ({upcomingInfo.countdownStr})
              </span>
            </div>

            <p className="text-xs text-surface-200/80 flex items-center gap-1.5 mt-1">
              <Clock className="w-3.5 h-3.5 text-primary-400 shrink-0" />
              <span>
                Session Start: <strong>{upcomingInfo.session.start_time}</strong> (
                {settings.reminder_before_minutes}m advance alert)
              </span>
            </p>
          </div>

          <div className="bg-primary-950/40 border border-primary-500/20 rounded-xl p-3 text-xs text-primary-200 flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0 animate-ping" />
            <div>
              <span className="text-[10px] uppercase font-bold text-primary-400 tracking-wider">
                Cloud Dispatcher Active
              </span>
              <p className="text-surface-200 text-xs mt-0.5">
                This notification will arrive on your phone at <strong>{upcomingInfo.reminderTimeStr}</strong> even if your laptop is shut down.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-4 text-center">
          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
          <p className="text-xs sm:text-sm text-surface-200 font-medium">
            {upcomingInfo.countdownStr}
          </p>
          <p className="text-[11px] text-surface-200/60 mt-1">
            Configure more recurring study blocks in the Schedule tab.
          </p>
        </div>
      )}
    </div>
  );
}
