'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Bell, Flame, Cloud, HardDrive, Wifi, Smartphone } from 'lucide-react';
import { useInstallPrompt } from '@/lib/pwa/useInstallPrompt';

interface AppHeaderProps {
  currentStreak?: number;
  syncStatus?: 'synced' | 'local' | 'syncing';
}

export function AppHeader({ currentStreak = 5, syncStatus = 'synced' }: AppHeaderProps) {
  const pathname = usePathname();
  const { isInstallable, promptInstall } = useInstallPrompt();

  return (
    <header className="sticky top-0 z-30 bg-surface-950/80 backdrop-blur-md border-b border-surface-800/80 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/25 group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">SkillTrack</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-300 border border-primary-500/30">
                PWA
              </span>
            </div>
            <p className="text-[10px] text-surface-200/70 hidden sm:block">Cloud-Synced Mobile Study Tracker</p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-surface-900/60 p-1 rounded-xl border border-surface-800">
          <Link
            href="/"
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              pathname === '/'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-surface-200 hover:text-white hover:bg-surface-800/60'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/schedule"
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              pathname.startsWith('/schedule')
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-surface-200 hover:text-white hover:bg-surface-800/60'
            }`}
          >
            Schedule
          </Link>
          <Link
            href="/dsa"
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              pathname.startsWith('/dsa')
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-surface-200 hover:text-white hover:bg-surface-800/60'
            }`}
          >
            DSA Practice
          </Link>
          <Link
            href="/settings/notifications"
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
              pathname.startsWith('/settings/notifications')
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-surface-200 hover:text-white hover:bg-surface-800/60'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Cloud Reminders</span>
          </Link>
        </nav>

        {/* Header Right Status Badges */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Streak Counter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Flame className="w-3.5 h-3.5 fill-amber-400 animate-pulse" />
            <span>{currentStreak}d Streak</span>
          </div>

          {/* Sync Status Indicator */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${
              syncStatus === 'synced'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : syncStatus === 'syncing'
                ? 'bg-primary-500/10 border-primary-500/30 text-primary-400'
                : 'bg-surface-800 border-surface-700 text-surface-200'
            }`}
            title={
              syncStatus === 'synced'
                ? 'Connected to Supabase Cloud'
                : 'Operating in Local Mode (Offline-Ready)'
            }
          >
            {syncStatus === 'synced' ? (
              <>
                <Cloud className="w-3 h-3 text-emerald-400" />
                <span>Supabase Live</span>
              </>
            ) : syncStatus === 'syncing' ? (
              <>
                <Wifi className="w-3 h-3 text-primary-400 animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <HardDrive className="w-3 h-3 text-surface-200" />
                <span>Local Cache</span>
              </>
            )}
          </div>

          {/* Install Button for Desktop */}
          {isInstallable && (
            <button
              onClick={promptInstall}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 border border-surface-700 text-xs font-medium text-white transition-all"
            >
              <Smartphone className="w-3.5 h-3.5 text-primary-400" />
              <span>Install PWA</span>
            </button>
          )}

          {/* Notification Quick Link */}
          <Link
            href="/settings/notifications"
            className="p-2 rounded-xl bg-surface-800/80 hover:bg-surface-700 text-surface-200 hover:text-white transition-colors relative"
            aria-label="Notification Settings"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary-500 ring-2 ring-surface-950" />
          </Link>
        </div>
      </div>
    </header>
  );
}
