'use client';

import { useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { UpcomingReminderCard } from '@/components/dashboard/UpcomingReminderCard';
import { ProgressOverviewCard } from '@/components/dashboard/ProgressOverviewCard';
import { TodayScheduleCard } from '@/components/dashboard/TodayScheduleCard';
import { QuickAddDsaModal } from '@/components/dashboard/QuickAddDsaModal';
import { useSkillTrackStore } from '@/lib/store';
import Link from 'next/link';
import { Bell, Sparkles, Smartphone, ShieldCheck, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const {
    user,
    profile,
    dynamicStreak,
    sessions,
    dsaProblems,
    sessionLogs,
    settings,
    todaySessions,
    completedTodayCount,
    syncStatus,
    toggleSessionCompletion,
    addSession,
    addDsaProblem,
  } = useSkillTrackStore();

  const [isQuickDsaOpen, setIsQuickDsaOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header with dynamic user profile & streak */}
      <AppHeader
        currentStreak={dynamicStreak}
        syncStatus={syncStatus}
        user={user}
        profile={profile}
      />

      {/* Hero Welcome & Cloud Guarantee Banner */}
      <div className="bg-gradient-to-r from-primary-900/60 via-surface-900 to-surface-900 border border-primary-500/20 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Independent Cloud Scheduler Active</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            SkillTrack Mobile Hub
          </h1>
          <p className="text-xs sm:text-sm text-surface-200/80 mt-1.5 leading-relaxed">
            Your reminders are managed by Supabase Cron in the cloud. Feel free to close your laptop
            or shut it down completely — your scheduled notifications will arrive on your mobile phone on time.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <Link
            href="/settings/notifications"
            className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-primary-600/30 transition-all"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Configure Cloud Reminders</span>
          </Link>

          <button
            onClick={() => setIsQuickDsaOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-surface-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Log Solved Problem</span>
          </button>
        </div>
      </div>

      {/* Next Upcoming Reminder */}
      <UpcomingReminderCard sessions={sessions} settings={settings} />

      {/* Progress & Habit Metrics */}
      <ProgressOverviewCard
        completedCount={completedTodayCount}
        totalToday={todaySessions.length}
        dsaProblems={dsaProblems}
        currentStreak={dynamicStreak}
        onOpenQuickDsa={() => setIsQuickDsaOpen(true)}
      />

      {/* Today's Schedule Timeline & Task Checkoffs */}
      <TodayScheduleCard
        sessions={todaySessions}
        sessionLogs={sessionLogs}
        onToggleComplete={toggleSessionCompletion}
        onAddSession={addSession}
      />

      {/* Quick Add DSA Modal */}
      <QuickAddDsaModal
        isOpen={isQuickDsaOpen}
        onClose={() => setIsQuickDsaOpen(false)}
        onAddProblem={addDsaProblem}
      />
    </div>
  );
}
