// SkillTrack State Store & Supabase Sync Layer
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  StudySession,
  DsaProblem,
  SessionLog,
  UserNotificationSettings,
  PushSubscriptionItem,
  NotificationLog,
} from '@/types';
import { supabase, isSupabaseClientConfigured } from './supabase/client';

const DEFAULT_SESSIONS: StudySession[] = [
  {
    id: 'session-dsa-daily',
    user_id: 'guest-user',
    title: 'DSA Practice',
    category: 'DSA',
    start_time: '18:00',
    end_time: '19:00',
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    is_active: true,
    notes: 'Solve 2 LeetCode Mediums on Graphs / Dynamic Programming.',
  },
  {
    id: 'session-system-design',
    user_id: 'guest-user',
    title: 'System Design & High-Level Architecture',
    category: 'Web Dev',
    start_time: '20:00',
    end_time: '21:00',
    days_of_week: [1, 2, 3, 4, 5],
    is_active: true,
    notes: 'Read Designing Data-Intensive Applications chapter.',
  },
  {
    id: 'session-cs-fundamentals',
    user_id: 'guest-user',
    title: 'Core CS & Operating Systems Revision',
    category: 'Core CS',
    start_time: '21:30',
    end_time: '22:15',
    days_of_week: [1, 3, 5],
    is_active: true,
    notes: 'Virtual memory, semaphores, and database index internals.',
  },
];

const DEFAULT_DSA_PROBLEMS: DsaProblem[] = [
  {
    id: 'prob-1',
    user_id: 'guest-user',
    title: 'LRU Cache',
    difficulty: 'Medium',
    platform: 'LeetCode',
    problem_url: 'https://leetcode.com/problems/lru-cache/',
    tags: ['Hash Table', 'Linked List', 'Design'],
    status: 'Solved',
    notes: 'Used Doubly Linked List + HashMap for O(1) get and put.',
    solved_at: new Date().toISOString().split('T')[0],
  },
  {
    id: 'prob-2',
    user_id: 'guest-user',
    title: 'Trapping Rain Water',
    difficulty: 'Hard',
    platform: 'LeetCode',
    problem_url: 'https://leetcode.com/problems/trapping-rain-water/',
    tags: ['Two Pointers', 'Array', 'Stack'],
    status: 'Solved',
    notes: 'Two pointer approach maintaining leftMax and rightMax.',
    solved_at: new Date(Date.now() - 86400000).toISOString().split('T')[0],
  },
  {
    id: 'prob-3',
    user_id: 'guest-user',
    title: 'Number of Islands',
    difficulty: 'Medium',
    platform: 'LeetCode',
    problem_url: 'https://leetcode.com/problems/number-of-islands/',
    tags: ['BFS', 'DFS', 'Graph'],
    status: 'Solved',
    notes: 'Classic BFS/DFS traversal mutating or marking visited cells.',
    solved_at: new Date(Date.now() - 172800000).toISOString().split('T')[0],
  },
];

const DEFAULT_SETTINGS: UserNotificationSettings = {
  user_id: 'guest-user',
  enabled: true,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
  reminder_before_minutes: 10,
  reminder_at_start: true,
  reminder_missed: true,
  missed_threshold_minutes: 30,
  daily_summary: true,
  daily_summary_time: '21:00',
  revision_reminders: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  category_preferences: {
    DSA: true,
    'Web Dev': true,
    'Core CS': true,
    Aptitude: true,
    Revision: true,
  },
};

export function useSkillTrackStore() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [dsaProblems, setDsaProblems] = useState<DsaProblem[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [settings, setSettings] = useState<UserNotificationSettings>(DEFAULT_SETTINGS);
  const [devices, setDevices] = useState<PushSubscriptionItem[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<NotificationLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'local' | 'syncing'>('local');

  // Load initial data from localStorage & Supabase
  useEffect(() => {
    try {
      const storedSessions = localStorage.getItem('skilltrack_sessions');
      const storedProblems = localStorage.getItem('skilltrack_dsa');
      const storedLogs = localStorage.getItem('skilltrack_logs');
      const storedSettings = localStorage.getItem('skilltrack_settings');

      setSessions(storedSessions ? JSON.parse(storedSessions) : DEFAULT_SESSIONS);
      setDsaProblems(storedProblems ? JSON.parse(storedProblems) : DEFAULT_DSA_PROBLEMS);
      setSessionLogs(storedLogs ? JSON.parse(storedLogs) : []);
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (e) {
      console.warn('Could not read from local storage:', e);
      setSessions(DEFAULT_SESSIONS);
      setDsaProblems(DEFAULT_DSA_PROBLEMS);
    }

    setIsLoaded(true);

    // Fetch registered devices from backend
    fetch('/api/push/subscribe?userId=guest-user')
      .then((res) => res.json())
      .then((data) => {
        if (data.subscriptions) {
          setDevices(data.subscriptions);
        }
      })
      .catch(() => {});

    // Sync with Supabase if configured
    if (isSupabaseClientConfigured && supabase) {
      setSyncStatus('syncing');
      Promise.all([
        supabase.from('study_sessions').select('*'),
        supabase.from('dsa_problems').select('*'),
        supabase.from('session_logs').select('*'),
        supabase.from('user_notification_settings').select('*').single(),
        supabase.from('notification_logs').select('*').order('sent_at', { ascending: false }).limit(20),
      ])
        .then(([sessRes, dsaRes, logsRes, settRes, notifRes]) => {
          if (sessRes.data && sessRes.data.length > 0) setSessions(sessRes.data);
          if (dsaRes.data && dsaRes.data.length > 0) setDsaProblems(dsaRes.data);
          if (logsRes.data && logsRes.data.length > 0) setSessionLogs(logsRes.data);
          if (settRes.data) setSettings(settRes.data);
          if (notifRes.data) setDeliveryLogs(notifRes.data);
          setSyncStatus('synced');
        })
        .catch(() => setSyncStatus('local'));
    }
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('skilltrack_sessions', JSON.stringify(sessions));
      localStorage.setItem('skilltrack_dsa', JSON.stringify(dsaProblems));
      localStorage.setItem('skilltrack_logs', JSON.stringify(sessionLogs));
      localStorage.setItem('skilltrack_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save to local storage:', e);
    }
  }, [sessions, dsaProblems, sessionLogs, settings, isLoaded]);

  // Actions
  const addSession = useCallback((newSession: Omit<StudySession, 'id' | 'user_id'>) => {
    const session: StudySession = {
      ...newSession,
      id: `sess-${Date.now()}`,
      user_id: 'guest-user',
    };
    setSessions((prev) => [...prev, session]);

    if (supabase) {
      supabase.from('study_sessions').insert(session).then();
    }
    return session;
  }, []);

  const updateSession = useCallback((id: string, updates: Partial<StudySession>) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    if (supabase) {
      supabase.from('study_sessions').update(updates).eq('id', id).then();
    }
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (supabase) {
      supabase.from('study_sessions').delete().eq('id', id).then();
    }
  }, []);

  const toggleSessionCompletion = useCallback((sessionId: string, date: string = new Date().toISOString().split('T')[0]) => {
    setSessionLogs((prev) => {
      const existing = prev.find((l) => l.session_id === sessionId && l.date === date);
      let updatedLogs: SessionLog[];

      if (existing) {
        // Toggle status
        const nextStatus = existing.status === 'completed' ? 'in_progress' : 'completed';
        updatedLogs = prev.map((l) =>
          l.id === existing.id ? { ...l, status: nextStatus, completed_at: new Date().toISOString() } : l
        );
        if (supabase) {
          supabase.from('session_logs').update({ status: nextStatus }).eq('id', existing.id).then();
        }
      } else {
        const newLog: SessionLog = {
          id: `log-${Date.now()}`,
          user_id: 'guest-user',
          session_id: sessionId,
          date,
          status: 'completed',
          problems_solved: 0,
          duration_minutes: 60,
          completed_at: new Date().toISOString(),
        };
        updatedLogs = [...prev, newLog];
        if (supabase) {
          supabase.from('session_logs').insert(newLog).then();
        }
      }
      return updatedLogs;
    });
  }, []);

  const addDsaProblem = useCallback((problem: Omit<DsaProblem, 'id' | 'user_id' | 'solved_at'>) => {
    const today = new Date().toISOString().split('T')[0];
    const newProb: DsaProblem = {
      ...problem,
      id: `prob-${Date.now()}`,
      user_id: 'guest-user',
      solved_at: today,
    };
    setDsaProblems((prev) => [newProb, ...prev]);

    if (supabase) {
      supabase.from('dsa_problems').insert(newProb).then();
    }
    return newProb;
  }, []);

  const deleteDsaProblem = useCallback((id: string) => {
    setDsaProblems((prev) => prev.filter((p) => p.id !== id));
    if (supabase) {
      supabase.from('dsa_problems').delete().eq('id', id).then();
    }
  }, []);

  const updateSettings = useCallback((newSettings: Partial<UserNotificationSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      if (supabase) {
        supabase.from('user_notification_settings').upsert(merged).then();
      }
      return merged;
    });
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/push/subscribe?userId=guest-user');
      const data = await res.json();
      if (data.subscriptions) {
        setDevices(data.subscriptions);
      }
    } catch {}
  }, []);

  const removeDevice = useCallback(async (endpoint: string) => {
    try {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, userId: 'guest-user' }),
      });
      setDevices((prev) => prev.filter((d) => d.endpoint !== endpoint));
    } catch (e) {
      console.error('Failed to remove device:', e);
    }
  }, []);

  // Compute stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDayOfWeek = new Date().getDay(); // 0 to 6

  const todaySessions = sessions.filter(
    (s) => s.is_active && (s.days_of_week || []).includes(todayDayOfWeek)
  );

  const completedTodayCount = todaySessions.filter((s) => {
    const log = sessionLogs.find((l) => l.session_id === s.id && l.date === todayStr);
    return log?.status === 'completed';
  }).length;

  const totalDsaSolved = dsaProblems.filter((p) => p.status === 'Solved').length;

  return {
    sessions,
    dsaProblems,
    sessionLogs,
    settings,
    devices,
    deliveryLogs,
    isLoaded,
    syncStatus,
    todaySessions,
    completedTodayCount,
    totalDsaSolved,
    addSession,
    updateSession,
    deleteSession,
    toggleSessionCompletion,
    addDsaProblem,
    deleteDsaProblem,
    updateSettings,
    refreshDevices,
    removeDevice,
  };
}
