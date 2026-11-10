'use client';

import { useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { useSkillTrackStore } from '@/lib/store';
import {
  Code2,
  Plus,
  ExternalLink,
  Trash2,
  Search,
  Filter,
  ChevronLeft,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { QuickAddDsaModal } from '@/components/dashboard/QuickAddDsaModal';
import { DsaDifficulty } from '@/types';

export default function DsaPage() {
  const { dsaProblems, syncStatus, addDsaProblem, deleteDsaProblem } = useSkillTrackStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | DsaDifficulty>('All');

  const filtered = dsaProblems.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDiff = difficultyFilter === 'All' || p.difficulty === difficultyFilter;
    return matchesSearch && matchesDiff;
  });

  return (
    <div className="space-y-6">
      <AppHeader currentStreak={5} syncStatus={syncStatus} />

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-surface-200 mb-1">
            <Link href="/" className="hover:text-white flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <span>/</span>
            <span className="text-white font-medium">DSA Problem Log</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <Code2 className="w-6 h-6 text-primary-400" />
            <span>Problem Tracker</span>
          </h1>
          <p className="text-xs text-surface-200/80">
            Log your daily solved problems across LeetCode, Codeforces, and GeeksforGeeks.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-primary-600/30 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Log Problem</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-surface-200 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search problems by name or tag (e.g. DP, Two Pointers)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-900 border border-surface-800 text-white placeholder-surface-200/50 text-xs sm:text-sm focus:outline-none focus:border-primary-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-surface-900 p-1 rounded-xl border border-surface-800">
          {(['All', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
            <button
              key={diff}
              onClick={() => setDifficultyFilter(diff)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                difficultyFilter === diff
                  ? diff === 'Easy'
                    ? 'bg-emerald-600 text-white'
                    : diff === 'Medium'
                    ? 'bg-amber-600 text-white'
                    : diff === 'Hard'
                    ? 'bg-rose-600 text-white'
                    : 'bg-primary-600 text-white'
                  : 'text-surface-200 hover:text-white'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Problems List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-surface-900 border border-dashed border-surface-800 rounded-2xl">
            <Code2 className="w-10 h-10 text-surface-200/40 mx-auto mb-3" />
            <p className="text-sm text-surface-200 font-medium">No problems matched your filter</p>
            <p className="text-xs text-surface-200/60 mt-1">
              Click "Log Problem" to record a solved DSA challenge.
            </p>
          </div>
        ) : (
          filtered.map((problem) => (
            <div
              key={problem.id}
              className="bg-surface-900 border border-surface-800 hover:border-surface-700 rounded-2xl p-4 sm:p-5 shadow-lg flex items-start justify-between gap-4 transition-all"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <h3 className="font-bold text-white text-base truncate">{problem.title}</h3>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      problem.difficulty === 'Easy'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : problem.difficulty === 'Medium'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {problem.difficulty}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-800 text-surface-200 border border-surface-700">
                    {problem.platform}
                  </span>
                </div>

                {problem.notes && (
                  <p className="text-xs text-surface-200/80 mb-2 italic">
                    "{problem.notes}"
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {problem.tags &&
                    problem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-800 text-surface-200 border border-surface-700/50"
                      >
                        #{tag}
                      </span>
                    ))}
                  <span className="text-[11px] text-surface-200/60 ml-auto">
                    Solved: {problem.solved_at}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {problem.problem_url && (
                  <a
                    href={problem.problem_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-200 hover:text-white transition-colors"
                    title="Open problem in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => deleteDsaProblem(problem.id)}
                  className="p-2 rounded-xl bg-surface-800 hover:bg-rose-500/20 text-surface-200 hover:text-rose-400 transition-colors"
                  title="Delete problem"
                  aria-label="Delete problem"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <QuickAddDsaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddProblem={addDsaProblem}
      />
    </div>
  );
}
