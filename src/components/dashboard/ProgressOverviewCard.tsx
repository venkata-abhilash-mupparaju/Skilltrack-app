'use client';

import { Flame, CheckCircle, Code2, Plus, Zap, TrendingUp } from 'lucide-react';
import { DsaProblem } from '@/types';

interface ProgressOverviewCardProps {
  completedCount: number;
  totalToday: number;
  dsaProblems: DsaProblem[];
  currentStreak?: number;
  onOpenQuickDsa: () => void;
}

export function ProgressOverviewCard({
  completedCount,
  totalToday,
  dsaProblems,
  currentStreak = 0,
  onOpenQuickDsa,
}: ProgressOverviewCardProps) {
  const percentage = totalToday > 0 ? Math.round((completedCount / totalToday) * 100) : 0;

  const easyCount = dsaProblems.filter((p) => p.difficulty === 'Easy').length;
  const mediumCount = dsaProblems.filter((p) => p.difficulty === 'Medium').length;
  const hardCount = dsaProblems.filter((p) => p.difficulty === 'Hard').length;
  const totalSolved = dsaProblems.length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {/* Card 1: Today's Completion */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-surface-200/80">
            Today's Progress
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300">
            {percentage}% Complete
          </span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {completedCount} <span className="text-surface-200 text-lg font-medium">/ {totalToday}</span>
            </div>
            <p className="text-xs text-surface-200/70 mt-1">Sessions Finished Today</p>
          </div>

          <div className="w-12 h-12 rounded-full bg-primary-500/10 border-2 border-primary-500 flex items-center justify-center font-bold text-primary-400 text-xs">
            {percentage}%
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-surface-800 h-2 rounded-full overflow-hidden mt-3.5">
          <div
            className="bg-gradient-to-r from-primary-600 to-indigo-400 h-full transition-all duration-500 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Card 2: Streak & Consistency */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-surface-200/80">
            Consistency Streak
          </span>
          <div className="p-1 rounded-lg bg-amber-500/15 text-amber-400">
            <Flame className="w-4 h-4 fill-amber-400" />
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 flex items-center gap-1.5">
              <span>{currentStreak}</span>
              <span className="text-surface-200 text-sm font-normal">Days In A Row</span>
            </div>
            <p className="text-xs text-surface-200/70 mt-1">
              {currentStreak > 0
                ? 'Consecutive daily study completed. Keep your streak alive!'
                : 'Complete your scheduled sessions to start your consistency streak!'}
            </p>
          </div>

          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Card 3: DSA Metrics & Quick Add */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden sm:col-span-2 lg:col-span-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-surface-200/80">
            DSA Problem Hub
          </span>
          <button
            onClick={onOpenQuickDsa}
            className="px-2.5 py-1 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-all"
          >
            <Plus className="w-3 h-3" />
            <span>Quick Log</span>
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {totalSolved} <span className="text-xs text-surface-200 font-medium">Problems Solved</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-lg py-1.5">
            <span className="text-emerald-400 font-bold block">{easyCount}</span>
            <span className="text-[10px] text-surface-200/70">Easy</span>
          </div>
          <div className="bg-amber-950/30 border border-amber-500/20 rounded-lg py-1.5">
            <span className="text-amber-400 font-bold block">{mediumCount}</span>
            <span className="text-[10px] text-surface-200/70">Medium</span>
          </div>
          <div className="bg-rose-950/30 border border-rose-500/20 rounded-lg py-1.5">
            <span className="text-rose-400 font-bold block">{hardCount}</span>
            <span className="text-[10px] text-surface-200/70">Hard</span>
          </div>
        </div>
      </div>
    </div>
  );
}
