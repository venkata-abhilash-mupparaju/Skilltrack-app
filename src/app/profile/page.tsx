'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { useSkillTrackStore } from '@/lib/store';
import {
  User,
  Flame,
  CheckCircle2,
  Code2,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Save,
  LogOut,
  Bell,
  Globe,
  Target,
  Edit3,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { SessionCategory } from '@/types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProfilePage() {
  const router = useRouter();
  const {
    user,
    profile,
    updateProfile,
    dynamicStreak,
    sessions,
    dsaProblems,
    sessionLogs,
    syncStatus,
    addSession,
    deleteSession,
    updateSession,
    signOut,
  } = useSkillTrackStore();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [fullName, setFullName] = useState(profile.full_name || 'Study Scholar');
  const [email, setEmail] = useState(profile.email || user?.email || 'scholar@skilltrack.app');
  const [bio, setBio] = useState(profile.bio || 'Mastering Data Structures & Algorithms and System Design');
  const [targetHours, setTargetHours] = useState(profile.target_hours_per_week || 15);
  const [timezone, setTimezone] = useState(profile.timezone || 'Asia/Kolkata');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Quick Add Task Form State
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<SessionCategory>('DSA');
  const [taskStartTime, setTaskStartTime] = useState('18:00');
  const [taskEndTime, setTaskEndTime] = useState('19:00');
  const [taskDays, setTaskDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [taskNotes, setTaskNotes] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      full_name: fullName.trim(),
      email: email.trim(),
      bio: bio.trim(),
      target_hours_per_week: Number(targetHours),
      timezone: timezone.trim(),
    });
    setSaveMessage('Profile updated successfully!');
    setIsEditingProfile(false);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const toggleDaySelection = (dayIdx: number) => {
    setTaskDays((prev) =>
      prev.includes(dayIdx) ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx]
    );
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    addSession({
      title: taskTitle.trim(),
      category: taskCategory,
      start_time: taskStartTime,
      end_time: taskEndTime,
      days_of_week: taskDays.length > 0 ? taskDays : [0, 1, 2, 3, 4, 5, 6],
      is_active: true,
      notes: taskNotes.trim() || undefined,
    });

    setTaskTitle('');
    setTaskNotes('');
    setIsAddingTask(false);
    setSaveMessage('New study task added to your schedule!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const totalCompletedCount = sessionLogs.filter((l) => l.status === 'completed').length;
  const totalDsaCount = dsaProblems.length;

  return (
    <div className="space-y-6">
      <AppHeader
        currentStreak={dynamicStreak}
        syncStatus={syncStatus}
        user={user}
        profile={profile}
        onOpenAddTask={() => setIsAddingTask(true)}
      />

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-surface-200">
        <Link href="/" className="hover:text-white flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <span className="text-white font-medium">My Profile & Tasks</span>
      </div>

      {saveMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* 1. Profile Overview Header Card */}
      <div className="bg-gradient-to-br from-surface-900 via-surface-900 to-primary-950/40 border border-surface-800 rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-extrabold uppercase shadow-xl shadow-primary-600/30 shrink-0">
              {(profile.full_name || 'U').charAt(0)}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                  {profile.full_name || 'Study Scholar'}
                </h1>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
                  {user?.isGuest ? 'Guest Scholar' : 'Active Account'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-surface-200/80 mt-0.5">
                {profile.email || user?.email || 'scholar@skilltrack.app'}
              </p>
              <p className="text-xs text-surface-200/70 mt-2 italic max-w-xl">
                "{profile.bio || 'Dedicated to deliberate daily practice and algorithmic problem solving.'}"
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="px-3.5 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5 text-primary-400" />
              <span>{isEditingProfile ? 'Close Editor' : 'Edit Profile'}</span>
            </button>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl bg-surface-800 hover:bg-rose-500/20 text-surface-200 hover:text-rose-400 transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-surface-800/80 text-center">
          <div className="bg-surface-800/40 border border-surface-700/50 rounded-2xl p-3">
            <div className="flex items-center justify-center gap-1.5 text-amber-400 font-extrabold text-lg sm:text-xl">
              <Flame className="w-4 h-4 fill-amber-400" />
              <span>{dynamicStreak}d</span>
            </div>
            <span className="text-[11px] text-surface-200/70 font-medium mt-0.5 block">
              Active Streak
            </span>
          </div>

          <div className="bg-surface-800/40 border border-surface-700/50 rounded-2xl p-3">
            <div className="text-emerald-400 font-extrabold text-lg sm:text-xl">
              {totalCompletedCount}
            </div>
            <span className="text-[11px] text-surface-200/70 font-medium mt-0.5 block">
              Sessions Completed
            </span>
          </div>

          <div className="bg-surface-800/40 border border-surface-700/50 rounded-2xl p-3">
            <div className="text-primary-400 font-extrabold text-lg sm:text-xl">
              {totalDsaCount}
            </div>
            <span className="text-[11px] text-surface-200/70 font-medium mt-0.5 block">
              DSA Solved
            </span>
          </div>

          <div className="bg-surface-800/40 border border-surface-700/50 rounded-2xl p-3">
            <div className="text-indigo-400 font-extrabold text-lg sm:text-xl">
              {profile.target_hours_per_week || 15}h
            </div>
            <span className="text-[11px] text-surface-200/70 font-medium mt-0.5 block">
              Weekly Goal
            </span>
          </div>
        </div>
      </div>

      {/* 2. Edit Profile Form (collapsible) */}
      {isEditingProfile && (
        <div className="bg-surface-900 border border-surface-800 rounded-3xl p-6 shadow-xl animate-in fade-in">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-primary-400" />
            <span>Update Profile Details</span>
          </h2>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-surface-200 mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-surface-200 mb-1 font-medium">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-white focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-surface-200 mb-1 font-medium">Focus Statement / Bio</label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. Preparing for SDE interview, mastering Dynamic Programming"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-white focus:outline-none focus:border-primary-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-surface-200 mb-1 font-medium">Target Study Hours / Week</label>
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={targetHours}
                  onChange={(e) => setTargetHours(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-surface-200 mb-1 font-medium">Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-white font-mono text-xs focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-800">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-200 font-medium text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs shadow-md shadow-primary-600/30 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Task Management Section ("where we can add tasks") */}
      <div className="bg-surface-900 border border-surface-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-400" />
              <span>Study Tasks & Sessions</span>
            </h2>
            <p className="text-xs text-surface-200/70">
              Manage your scheduled learning blocks. The cloud scheduler sends alerts for these sessions.
            </p>
          </div>

          <button
            onClick={() => setIsAddingTask(!isAddingTask)}
            className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-primary-600/30 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{isAddingTask ? 'Cancel' : 'Add New Task'}</span>
          </button>
        </div>

        {/* Add Task Form (inline expander) */}
        {isAddingTask && (
          <div className="bg-surface-800/80 border border-primary-500/30 rounded-2xl p-5 shadow-lg animate-in fade-in">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-400" />
              <span>Create New Study Task</span>
            </h3>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-surface-200 mb-1 font-medium">Task / Session Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Graph Algorithms Practice, System Design Reading"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-900 border border-surface-700 text-white placeholder-surface-200/40 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-surface-200 mb-1 font-medium">Category</label>
                <select
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value as SessionCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-900 border border-surface-700 text-white focus:outline-none focus:border-primary-500"
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
                    value={taskStartTime}
                    onChange={(e) => setTaskStartTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-900 border border-surface-700 text-white focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-surface-200 mb-1 font-medium">End Time</label>
                  <input
                    type="time"
                    required
                    value={taskEndTime}
                    onChange={(e) => setTaskEndTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-900 border border-surface-700 text-white focus:outline-none focus:border-primary-500"
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
                      className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        taskDays.includes(dIdx)
                          ? 'bg-primary-600 text-white'
                          : 'bg-surface-900 text-surface-200 border border-surface-700'
                      }`}
                    >
                      {dName}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-surface-200 mb-1 font-medium">Notes / Target</label>
                <input
                  type="text"
                  placeholder="e.g. Complete 2 LeetCode Medium problems"
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-900 border border-surface-700 text-white placeholder-surface-200/40 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-surface-700/60">
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  className="px-4 py-2 rounded-xl bg-surface-900 hover:bg-surface-800 text-surface-200 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold shadow-md shadow-primary-600/30 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Task</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Existing Tasks List */}
        <div className="space-y-2.5">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-800/60 border border-surface-700/60 hover:border-surface-700 transition-all text-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-bold text-white text-sm sm:text-base truncate">
                    {session.title}
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-300">
                    {session.category}
                  </span>
                  <span className="text-[11px] text-surface-200/80 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-primary-400" />
                    <span>
                      {session.start_time} - {session.end_time}
                    </span>
                  </span>
                </div>

                {session.notes && (
                  <p className="text-surface-200/70 text-[11px] truncate italic">
                    "{session.notes}"
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  onClick={() => updateSession(session.id, { is_active: !session.is_active })}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                    session.is_active
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-surface-700 text-surface-200/60 border-surface-600'
                  }`}
                >
                  {session.is_active ? 'Active' : 'Paused'}
                </button>

                <button
                  onClick={() => deleteSession(session.id)}
                  className="p-1.5 rounded-lg hover:bg-rose-500/20 text-surface-200 hover:text-rose-400 transition-colors"
                  title="Delete task"
                  aria-label="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
