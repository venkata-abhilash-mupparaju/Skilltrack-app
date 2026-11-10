'use client';

import { useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { UpcomingReminderCard } from '@/components/dashboard/UpcomingReminderCard';
import { ProgressOverviewCard } from '@/components/dashboard/ProgressOverviewCard';
import { TodayScheduleCard } from '@/components/dashboard/TodayScheduleCard';
import { QuickAddDsaModal } from '@/components/dashboard/QuickAddDsaModal';
import { useSkillTrackStore } from '@/lib/store';
import Link from 'next/link';
import { Bell, Sparkles } from 'lucide-react';

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

      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {profile?.full_name ? `Welcome back, ${profile.full_name}` : 'Study Dashboard'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQuickDsaOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-surface-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Log Problem</span>
          </button>
          <Link
            href="/settings/notifications"
            className="px-3.5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Reminders</span>
          </Link>
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
