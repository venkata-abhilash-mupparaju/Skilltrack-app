'use client';

import { useState } from 'react';
import { Check, Clock, Plus, Tag, Sparkles, CheckCircle2 } from 'lucide-react';
import { StudySession, SessionLog } from '@/types';
import confetti from 'canvas-confetti';

interface TodayScheduleCardProps {
  sessions: StudySession[];
  sessionLogs: SessionLog[];
  onToggleComplete: (sessionId: string) => void;
  onAddSession?: (session: Omit<StudySession, 'id' | 'user_id'>) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  DSA: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  'Web Dev': { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  'Core CS': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Aptitude: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  Revision: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
  Other: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30' },
};

export function TodayScheduleCard({
  sessions,
  sessionLogs,
  onToggleComplete,
  onAddSession,
}: TodayScheduleCardProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<any>('DSA');
  const [newStartTime, setNewStartTime] = useState('18:00');
  const [newEndTime, setNewEndTime] = useState('19:00');

  const todayStr = new Date().toISOString().split('T')[0];

  const handleCheck = (sessionId: string, wasCompleted: boolean) => {
    onToggleComplete(sessionId);

    // If marking completed, trigger celebratory confetti!
    if (!wasCompleted) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {}
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !onAddSession) return;

    onAddSession({
      title: newTitle.trim(),
      category: newCategory,
      start_time: newStartTime,
      end_time: newEndTime,
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      is_active: true,
    });

    setNewTitle('');
    setShowAddModal(false);
  };

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-2xl p-4 sm:p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span>Today's Study Plan</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-800 text-surface-200 border border-surface-700">
              {sessions.length} sessions
            </span>
          </h2>
          <p className="text-xs text-surface-200/70">Tap the checkmark when you finish a session</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-md shadow-primary-600/25"
          aria-label="Add study session"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Session</span>
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-8 bg-surface-950/40 border border-dashed border-surface-800 rounded-xl">
          <Clock className="w-8 h-8 text-surface-200/40 mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-surface-200 font-medium">No sessions scheduled for today</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-3 text-xs text-primary-400 hover:underline font-medium"
          >
            + Create a study block
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sessions.map((session) => {
            const log = sessionLogs.find(
              (l) => l.session_id === session.id && l.date === todayStr
            );
            const isCompleted = log?.status === 'completed';
            const catStyle = CATEGORY_COLORS[session.category] || CATEGORY_COLORS.Other;

            return (
              <div
                key={session.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-surface-800/60 hover:bg-surface-800 border-surface-700/60'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* One-Tap Checkmark Button */}
                  <button
                    onClick={() => handleCheck(session.id, isCompleted)}
                    className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                        : 'bg-surface-700/60 hover:bg-surface-700 border border-surface-600 text-surface-200 hover:text-white'
                    }`}
                    aria-label={`Mark ${session.title} as ${isCompleted ? 'incomplete' : 'complete'}`}
                  >
                    <Check className={`w-5 h-5 ${isCompleted ? 'stroke-[3]' : 'stroke-[2]'}`} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3
                        className={`font-semibold text-sm sm:text-base truncate ${
                          isCompleted ? 'line-through text-surface-200' : 'text-white'
                        }`}
                      >
                        {session.title}
                      </h3>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                      >
                        {session.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-surface-200/80">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary-400" />
                        <span>
                          {session.start_time} - {session.end_time}
                        </span>
                      </span>

                      {isCompleted && (
                        <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Done for today</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Session Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Add Study Session</h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-surface-200 mb-1 font-medium">Session Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DSA Practice, System Design"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-white placeholder-surface-200/50 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-surface-200 mb-1 font-medium">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="DSA">DSA Practice</option>
                  <option value="Web Dev">Web Development</option>
                  <option value="Core CS">Core CS / OS</option>
                  <option value="Aptitude">Aptitude & Interview</option>
                  <option value="Revision">Revision</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-surface-200 mb-1 font-medium">Start Time</label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-800 border border-surface-700 text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-surface-200 mb-1 font-medium">End Time</label>
                  <input
                    type="time"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-800 border border-surface-700 text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-200 font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium text-xs shadow-md shadow-primary-600/30"
                >
                  Save Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
