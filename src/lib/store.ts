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
  UserProfile,
} from '@/types';
import { supabase, isSupabaseClientConfigured } from './supabase/client';

const DEFAULT_SETTINGS: UserNotificationSettings = {
  user_id: '',
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
  // Strictly null until user creates an account or signs in
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Purely empty by default - no fake or pre-seeded tasks
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [dsaProblems, setDsaProblems] = useState<DsaProblem[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);

  const [settings, setSettings] = useState<UserNotificationSettings>(DEFAULT_SETTINGS);
  const [devices, setDevices] = useState<PushSubscriptionItem[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<NotificationLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'local' | 'syncing'>('local');

  // Load user data only if a logged-in account exists
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('skilltrack_user');
      const storedProfile = localStorage.getItem('skilltrack_profile');

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        if (storedProfile) {
          setProfile(JSON.parse(storedProfile));
        }

        const storedSessions = localStorage.getItem('skilltrack_sessions');
        const storedProblems = localStorage.getItem('skilltrack_dsa');
        const storedLogs = localStorage.getItem('skilltrack_logs');
        const storedSettings = localStorage.getItem('skilltrack_settings');

        setSessions(storedSessions ? JSON.parse(storedSessions) : []);
        setDsaProblems(storedProblems ? JSON.parse(storedProblems) : []);
        setSessionLogs(storedLogs ? JSON.parse(storedLogs) : []);
        if (storedSettings) setSettings(JSON.parse(storedSettings));
      } else {
        // No account logged in - keep completely empty
        setUser(null);
        setProfile(null);
        setSessions([]);
        setDsaProblems([]);
        setSessionLogs([]);
      }
    } catch (e) {
      console.warn('Could not read user state from storage:', e);
      setUser(null);
      setProfile(null);
      setSessions([]);
      setDsaProblems([]);
    }

    setIsLoaded(true);

    // Sync with Supabase Auth session if configured
    if (isSupabaseClientConfigured && supabase) {
      const client = supabase;
      client.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
          const authedUser = { id: session.user.id, email: session.user.email ?? null };
          setUser(authedUser);
          localStorage.setItem('skilltrack_user', JSON.stringify(authedUser));

          // Load profile from database
          client
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
            .then(({ data: profData }) => {
              if (profData) {
                setProfile(profData);
                localStorage.setItem('skilltrack_profile', JSON.stringify(profData));
              }
            });

          // Load only this user's study sessions & DSA problems
          setSyncStatus('syncing');
          Promise.all([
            client.from('study_sessions').select('*').eq('user_id', session.user.id),
            client.from('dsa_problems').select('*').eq('user_id', session.user.id),
            client.from('session_logs').select('*').eq('user_id', session.user.id),
            client.from('user_notification_settings').select('*').eq('user_id', session.user.id).single(),
            client.from('push_subscriptions').select('*').eq('user_id', session.user.id),
          ])
            .then(([sessRes, dsaRes, logsRes, settRes, devRes]) => {
              if (sessRes.data) setSessions(sessRes.data);
              if (dsaRes.data) setDsaProblems(dsaRes.data);
              if (logsRes.data) setSessionLogs(logsRes.data);
              if (settRes.data) setSettings(settRes.data);
              if (devRes.data) setDevices(devRes.data);
              setSyncStatus('synced');
            })
            .catch(() => setSyncStatus('local'));
        }
      });
    }
  }, []);

  // Save changes to localStorage only if user is logged in
  useEffect(() => {
    if (!isLoaded || !user) return;
    try {
      localStorage.setItem('skilltrack_sessions', JSON.stringify(sessions));
      localStorage.setItem('skilltrack_dsa', JSON.stringify(dsaProblems));
      localStorage.setItem('skilltrack_logs', JSON.stringify(sessionLogs));
      localStorage.setItem('skilltrack_settings', JSON.stringify(settings));
      if (profile) {
        localStorage.setItem('skilltrack_profile', JSON.stringify(profile));
      }
    } catch (e) {
      console.warn('Failed to save to local storage:', e);
    }
  }, [sessions, dsaProblems, sessionLogs, settings, profile, user, isLoaded]);

  // Account Creation: Only now is the profile database updated
  const signUpWithEmail = useCallback(
    async (fullName: string, email: string, pass: string) => {
      let authedUser: { id: string; email: string | null };
      let newProfile: UserProfile;

      if (isSupabaseClientConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: {
            data: { full_name: fullName },
          },
        });

        if (error) throw error;
        if (!data.user) throw new Error('Account registration failed.');

        authedUser = { id: data.user.id, email: data.user.email ?? email };
        newProfile = {
          id: data.user.id,
          email: data.user.email ?? email,
          full_name: fullName,
          bio: '',
          target_hours_per_week: 10,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
          current_streak: 0,
          longest_streak: 0,
          total_sessions_completed: 0,
          isGuest: false,
        };

        // Insert actual user profile into database
        await supabase.from('profiles').upsert(newProfile);
      } else {
        // Local account creation
        const localId = `user_${Date.now()}`;
        authedUser = { id: localId, email };
        newProfile = {
          id: localId,
          email,
          full_name: fullName,
          bio: '',
          target_hours_per_week: 10,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
          current_streak: 0,
          longest_streak: 0,
          total_sessions_completed: 0,
          isGuest: false,
        };
      }

      setUser(authedUser);
      setProfile(newProfile);
      setSessions([]);
      setDsaProblems([]);
      setSessionLogs([]);

      localStorage.setItem('skilltrack_user', JSON.stringify(authedUser));
      localStorage.setItem('skilltrack_profile', JSON.stringify(newProfile));
      localStorage.removeItem('skilltrack_sessions');
      localStorage.removeItem('skilltrack_dsa');
      localStorage.removeItem('skilltrack_logs');

      return { user: authedUser, profile: newProfile };
    },
    []
  );

  // Sign In
  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    let authedUser: { id: string; email: string | null };
    let loadedProfile: UserProfile;

    if (isSupabaseClientConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Sign in failed.');

      authedUser = { id: data.user.id, email: data.user.email ?? email };

      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      loadedProfile = profData || {
        id: data.user.id,
        email: data.user.email ?? email,
        full_name: email.split('@')[0],
        timezone: 'Asia/Kolkata',
        current_streak: 0,
        longest_streak: 0,
        total_sessions_completed: 0,
        isGuest: false,
      };

      // Load user's actual sessions & problems
      const { data: userSessions } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', data.user.id);
      const { data: userProblems } = await supabase
        .from('dsa_problems')
        .select('*')
        .eq('user_id', data.user.id);
      const { data: userLogs } = await supabase
        .from('session_logs')
        .select('*')
        .eq('user_id', data.user.id);

      setSessions(userSessions || []);
      setDsaProblems(userProblems || []);
      setSessionLogs(userLogs || []);
    } else {
      // Local sign in
      const localId = `user_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      authedUser = { id: localId, email };
      loadedProfile = {
        id: localId,
        email,
        full_name: email.split('@')[0],
        timezone: 'Asia/Kolkata',
        current_streak: 0,
        longest_streak: 0,
        total_sessions_completed: 0,
        isGuest: false,
      };
      setSessions([]);
      setDsaProblems([]);
      setSessionLogs([]);
    }

    setUser(authedUser);
    setProfile(loadedProfile);
    localStorage.setItem('skilltrack_user', JSON.stringify(authedUser));
    localStorage.setItem('skilltrack_profile', JSON.stringify(loadedProfile));

    return { user: authedUser, profile: loadedProfile };
  }, []);

  // Sign Out: Clears all user data completely
  const signOut = useCallback(async () => {
    if (isSupabaseClientConfigured && supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    setUser(null);
    setProfile(null);
    setSessions([]);
    setDsaProblems([]);
    setSessionLogs([]);

    localStorage.removeItem('skilltrack_user');
    localStorage.removeItem('skilltrack_profile');
    localStorage.removeItem('skilltrack_sessions');
    localStorage.removeItem('skilltrack_dsa');
    localStorage.removeItem('skilltrack_logs');
  }, []);

  // Update Profile: Modifies database for this authenticated user
  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      if (!user) return;
      setProfile((prev) => {
        if (!prev) return null;
        const merged = { ...prev, ...updates };
        if (supabase && isSupabaseClientConfigured && user.id) {
          supabase.from('profiles').update(updates).eq('id', user.id).then();
        }
        return merged;
      });
    },
    [user]
  );

  // Add Session / Task
  const addSession = useCallback(
    (newSession: Omit<StudySession, 'id' | 'user_id'>) => {
      const currentUserId = user ? user.id : 'anonymous';
      const session: StudySession = {
        ...newSession,
        id: `sess-${Date.now()}`,
        user_id: currentUserId,
      };
      setSessions((prev) => [...prev, session]);

      if (supabase && user) {
        supabase.from('study_sessions').insert(session).then();
      }
      return session;
    },
    [user]
  );

  const updateSession = useCallback(
    (id: string, updates: Partial<StudySession>) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
      if (supabase && user) {
        supabase.from('study_sessions').update(updates).eq('id', id).then();
      }
    },
    [user]
  );

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (supabase && user) {
        supabase.from('study_sessions').delete().eq('id', id).then();
      }
    },
    [user]
  );

  const toggleSessionCompletion = useCallback(
    (sessionId: string, date: string = new Date().toISOString().split('T')[0]) => {
      const currentUserId = user ? user.id : 'anonymous';
      setSessionLogs((prev) => {
        const existing = prev.find((l) => l.session_id === sessionId && l.date === date);
        let updatedLogs: SessionLog[];

        if (existing) {
          const nextStatus = existing.status === 'completed' ? 'in_progress' : 'completed';
          updatedLogs = prev.map((l) =>
            l.id === existing.id
              ? { ...l, status: nextStatus, completed_at: new Date().toISOString() }
              : l
          );
          if (supabase && user) {
            supabase.from('session_logs').update({ status: nextStatus }).eq('id', existing.id).then();
          }
        } else {
          const newLog: SessionLog = {
            id: `log-${Date.now()}`,
            user_id: currentUserId,
            session_id: sessionId,
            date,
            status: 'completed',
            problems_solved: 0,
            duration_minutes: 60,
            completed_at: new Date().toISOString(),
          };
          updatedLogs = [...prev, newLog];
          if (supabase && user) {
            supabase.from('session_logs').insert(newLog).then();
          }
        }
        return updatedLogs;
      });
    },
    [user]
  );

  const addDsaProblem = useCallback(
    (problem: Omit<DsaProblem, 'id' | 'user_id' | 'solved_at'>) => {
      const currentUserId = user ? user.id : 'anonymous';
      const today = new Date().toISOString().split('T')[0];
      const newProb: DsaProblem = {
        ...problem,
        id: `prob-${Date.now()}`,
        user_id: currentUserId,
        solved_at: today,
      };
      setDsaProblems((prev) => [newProb, ...prev]);

      if (supabase && user) {
        supabase.from('dsa_problems').insert(newProb).then();
      }
      return newProb;
    },
    [user]
  );

  const deleteDsaProblem = useCallback(
    (id: string) => {
      setDsaProblems((prev) => prev.filter((p) => p.id !== id));
      if (supabase && user) {
        supabase.from('dsa_problems').delete().eq('id', id).then();
      }
    },
    [user]
  );

  const updateSettings = useCallback(
    (newSettings: Partial<UserNotificationSettings>) => {
      setSettings((prev) => {
        const merged = { ...prev, ...newSettings };
        if (supabase && user) {
          supabase
            .from('user_notification_settings')
            .upsert({ ...merged, user_id: user.id })
            .then();
        }
        return merged;
      });
    },
    [user]
  );

  const refreshDevices = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/push/subscribe?userId=${user.id}`);
      const data = await res.json();
      if (data.subscriptions) {
        setDevices(data.subscriptions);
      }
    } catch {}
  }, [user]);

  const removeDevice = useCallback(
    async (endpoint: string) => {
      if (!user) return;
      try {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint, userId: user.id }),
        });
        setDevices((prev) => prev.filter((d) => d.endpoint !== endpoint));
      } catch (e) {
        console.error('Failed to remove device:', e);
      }
    },
    [user]
  );

  // Dynamic consecutive days streak calculation based purely on completed logs
  const dynamicStreak = (() => {
    const completedDates = new Set(
      sessionLogs.filter((l) => l.status === 'completed').map((l) => l.date)
    );

    if (completedDates.size === 0) {
      return 0;
    }

    const formatYmd = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const now = new Date();
    const todayStr = formatYmd(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatYmd(yesterday);

    let streak = 0;
    let checkDate = new Date(now);

    if (!completedDates.has(todayStr)) {
      if (completedDates.has(yesterdayStr)) {
        checkDate = yesterday;
      } else {
        return 0;
      }
    }

    while (true) {
      const dateKey = formatYmd(checkDate);
      if (completedDates.has(dateKey)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  })();

  const todayStr = new Date().toISOString().split('T')[0];
  const todayDayOfWeek = new Date().getDay();

  const todaySessions = sessions.filter(
    (s) => s.is_active && (s.days_of_week || []).includes(todayDayOfWeek)
  );

  const completedTodayCount = todaySessions.filter((s) => {
    const log = sessionLogs.find((l) => l.session_id === s.id && l.date === todayStr);
    return log?.status === 'completed';
  }).length;

  const totalDsaSolved = dsaProblems.filter((p) => p.status === 'Solved').length;

  return {
    user,
    profile,
    updateProfile,
    dynamicStreak,
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
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };
}
