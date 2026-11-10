'use client';

import { AppHeader } from '@/components/layout/AppHeader';
import { NotificationSettingsView } from '@/components/settings/NotificationSettingsView';
import { useSkillTrackStore } from '@/lib/store';
import Link from 'next/link';
import { ChevronLeft, Bell } from 'lucide-react';

export default function NotificationSettingsPage() {
  const {
    user,
    profile,
    dynamicStreak,
    settings,
    devices,
    syncStatus,
    updateSettings,
    refreshDevices,
    removeDevice,
  } = useSkillTrackStore();

  return (
    <div className="space-y-6">
      <AppHeader
        currentStreak={dynamicStreak}
        syncStatus={syncStatus}
        user={user}
        profile={profile}
      />

      <div className="flex items-center gap-2 text-xs text-surface-200">
        <Link href="/" className="hover:text-white flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <span className="text-white font-medium">Notification Settings</span>
      </div>

      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <Bell className="w-6 h-6 text-primary-400" />
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            Cloud Reminder Settings
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-surface-200/80">
          Configure server-triggered Web Push alerts. Reminders are dispatched directly from
          Supabase cloud cron and do not require your laptop or browser to remain open.
        </p>
      </div>

      <NotificationSettingsView
        settings={settings}
        devices={devices}
        onUpdateSettings={updateSettings}
        onRefreshDevices={refreshDevices}
        onRemoveDevice={removeDevice}
      />
    </div>
  );
}
