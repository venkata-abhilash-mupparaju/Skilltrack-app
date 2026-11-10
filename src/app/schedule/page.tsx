'use client';

import { useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { useSkillTrackStore } from '@/lib/store';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Bell,
  CheckCircle,
  Tag,
  ChevronLeft,
} from 'lucide-react';
import Link from 'next/link';
import { StudySession } from '@/types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SchedulePage() {
  const { sessions, settings, syncStatus, addSession, deleteSession, updateSession } =
    useSkillTrackStore();

  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<any>('DSA');
  const [newStartTime, setNewStartTime] = useState('18:00');
  const [newEndTime, setNewEndTime] = useState('19:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const filteredSessions = sessions.filter(
    (s) => s.days_of_week && s.days_of_week.includes(selectedDay)
  );

  const toggleDaySelection = (dayIdx: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayIdx) ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx]
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addSession({
      title: newTitle.trim(),
      category: newCategory,
      start_time: newStartTime,
      end_time: newEndTime,
      days_of_week: selectedDays.length > 0 ? selectedDays : [selectedDay],
      is_active: true,
    });

    setNewTitle('');
    setShowAddModal(false);
  };

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
            <span className="text-white font-medium">Weekly Schedule</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary-400" />
            <span>Study Timetable</span>
          </h1>
          <p className="text-xs text-surface-200/80">
            Cloud scheduler evaluates these sessions every minute and dispatches reminders to your phone.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-primary-600/30 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Session</span>
        </button>
      </div>

      {/* Day Selector Pills */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 bg-surface-900 p-2 rounded-2xl border border-surface-800">
        {DAYS.map((dayName, idx) => {
          const isToday = new Date().getDay() === idx;
          const isSelected = selectedDay === idx;
          const count = sessions.filter((s) => s.days_of_week?.includes(idx)).length;

          return (
            <button
              key={dayName}
              onClick={() => setSelectedDay(idx)}
              className={`py-2.5 px-1 rounded-xl text-center transition-all ${
                isSelected
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                  : 'bg-surface-800/60 hover:bg-surface-800 text-surface-200 hover:text-white'
              }`}
            >
              <span className="block text-[11px] font-bold uppercase">{dayName}</span>
              <span className="block text-[10px] mt-0.5 opacity-80">
                {count} {count === 1 ? 'block' : 'blocks'}
              </span>
              {isToday && (
                <span className="inline-block w-1 h-1 rounded-full bg-emerald-400 mt-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* Sessions on Selected Day */}
      <div className="space-y-3">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12 bg-surface-900 border border-dashed border-surface-800 rounded-2xl">
            <Clock className="w-10 h-10 text-surface-200/40 mx-auto mb-3" />
            <p className="text-sm text-surface-200 font-medium">
              No sessions scheduled on {DAYS[selectedDay]}
            </p>
            <p className="text-xs text-surface-200/60 mt-1">
              Add a recurring session to keep up your momentum.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-primary-600/20 hover:bg-primary-600/30 border border-primary-500/30 text-primary-300 text-xs font-semibold transition-colors"
            >
              + Create Session
            </button>
          </div>
        ) : (
          filteredSessions.map((session) => (
            <div
              key={session.id}
              className="bg-surface-900 border border-surface-800 hover:border-surface-700 rounded-2xl p-4 sm:p-5 shadow-lg flex items-center justify-between gap-4 transition-all"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <h3 className="font-bold text-white text-base truncate">{session.title}</h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-300">
                    {session.category}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-800 text-surface-200 border border-surface-700 flex items-center gap-1">
                    <Bell className="w-3 h-3 text-primary-400" />
                    <span>Alert: {settings.reminder_before_minutes}m before</span>
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-surface-200">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-primary-400" />
                    <span>
                      {session.start_time} - {session.end_time}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => deleteSession(session.id)}
                  className="p-2 rounded-xl bg-surface-800 hover:bg-rose-500/20 text-surface-200 hover:text-rose-400 transition-colors"
                  title="Delete session"
                  aria-label="Delete session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Session Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Create Study Session</h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-surface-200 mb-1 font-medium">Session Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DSA Practice, System Design"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-white focus:outline-none focus:border-primary-500"
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
                    className="w-full px-3 py-2 rounded-xl bg-surface-800 border border-surface-700 text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-surface-200 mb-1 font-medium">End Time</label>
                  <input
                    type="time"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-800 border border-surface-700 text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-surface-200 mb-1.5 font-medium">Repeat Days</label>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map((dName, dIdx) => (
                    <button
                      key={dName}
                      type="button"
                      onClick={() => toggleDaySelection(dIdx)}
                      className={`py-1.5 rounded-lg text-[11px] font-bold ${
                        selectedDays.includes(dIdx)
                          ? 'bg-primary-600 text-white'
                          : 'bg-surface-800 text-surface-200 border border-surface-700'
                      }`}
                    >
                      {dName}
                    </button>
                  ))}
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
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
