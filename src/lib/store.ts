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

export function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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

// Strict Email Regex Validation (RFC 5322 compliant)
export function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

export interface StoredLocalAccount {
  id: string;
  email: string;
  password: string;
  profile: UserProfile;
  sessions: StudySession[];
  dsaProblems: DsaProblem[];
  sessionLogs: SessionLog[];
  settings?: UserNotificationSettings;
}

export function syncSessionsToServer(
  sessionsList: StudySession[],
  settingsData?: UserNotificationSettings,
  userId?: string
) {
  if (typeof window === 'undefined') return;
  try {
    const rawUser = localStorage.getItem('skilltrack_user');
    const u = rawUser ? JSON.parse(rawUser) : null;
    const finalUserId = userId || u?.id || localStorage.getItem('skilltrack_anon_id') || generateUUID();
    if (!localStorage.getItem('skilltrack_anon_id')) {
      localStorage.setItem('skilltrack_anon_id', finalUserId);
    }

    const rawSettings = localStorage.getItem('skilltrack_settings');
    const finalSettings = settingsData || (rawSettings ? JSON.parse(rawSettings) : DEFAULT_SETTINGS);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          fetch('/api/sessions/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: finalUserId,
              sessions: sessionsList,
              settings: finalSettings,
              subscription: sub ? sub.toJSON() : null,
              deviceName: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser',
            }),
          }).catch(() => {});
        });
      });
    }
  } catch (e) {
    // Ignore network or parsing errors during background sync
  }
}

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

      const storedSessions = localStorage.getItem('skilltrack_sessions');
      const storedProblems = localStorage.getItem('skilltrack_dsa');
      const storedLogs = localStorage.getItem('skilltrack_logs');
      const storedSettings = localStorage.getItem('skilltrack_settings');

      if (storedSessions) setSessions(JSON.parse(storedSessions));
      if (storedProblems) setDsaProblems(JSON.parse(storedProblems));
      if (storedLogs) setSessionLogs(JSON.parse(storedLogs));
      if (storedSettings) setSettings(JSON.parse(storedSettings));

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        if (storedProfile) {
          setProfile(JSON.parse(storedProfile));
        }
      } else {
        setUser(null);
        setProfile(null);
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
              if (sessRes.data && sessRes.data.length > 0) {
                setSessions(sessRes.data);
              } else {
                // If Supabase has 0 sessions, salvage any sessions saved in local storage
                try {
                  const storedSessions = localStorage.getItem('skilltrack_sessions');
                  if (storedSessions) {
                    const parsed = JSON.parse(storedSessions);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      const migrated = parsed.map((s: any) => ({
                        ...s,
                        id: isValidUUID(s.id) ? s.id : generateUUID(),
                        user_id: session.user.id,
                        days_of_week: s.days_of_week || [0, 1, 2, 3, 4, 5, 6],
                        is_active: s.is_active ?? true,
                      }));
                      setSessions(migrated);
                      migrated.forEach((m: any) => {
                        client.from('study_sessions').upsert({
                          id: m.id,
                          user_id: m.user_id,
                          title: m.title,
                          category: m.category || 'DSA',
                          start_time: m.start_time,
                          end_time: m.end_time,
                          days_of_week: m.days_of_week,
                          is_active: m.is_active,
                          notes: m.notes || null,
                        }).then();
                      });
                    }
                  }
                } catch (e) {
                  console.warn('Could not salvage local sessions:', e);
                }
              }

              if (dsaRes.data && dsaRes.data.length > 0) {
                setDsaProblems(dsaRes.data);
              }
              if (logsRes.data && logsRes.data.length > 0) {
                setSessionLogs(logsRes.data);
              }
              if (settRes.data) setSettings(settRes.data);
              if (devRes.data) setDevices(devRes.data);
              setSyncStatus('synced');
            })
            .catch(() => setSyncStatus('local'));
        }
      });
    }
  }, []);

  // Save changes to localStorage whenever state changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('skilltrack_sessions', JSON.stringify(sessions));
      localStorage.setItem('skilltrack_dsa', JSON.stringify(dsaProblems));
      localStorage.setItem('skilltrack_logs', JSON.stringify(sessionLogs));
      localStorage.setItem('skilltrack_settings', JSON.stringify(settings));
      if (profile) {
        localStorage.setItem('skilltrack_profile', JSON.stringify(profile));
      }

      // Also persist to local accounts registry if user is logged in
      if (user && user.email) {
        const normalized = user.email.trim().toLowerCase();
        const rawAccounts = localStorage.getItem('skilltrack_accounts');
        const accounts: Record<string, StoredLocalAccount> = rawAccounts ? JSON.parse(rawAccounts) : {};
        if (accounts[normalized]) {
          if (profile) accounts[normalized].profile = profile;
          accounts[normalized].sessions = sessions;
          accounts[normalized].dsaProblems = dsaProblems;
          accounts[normalized].sessionLogs = sessionLogs;
          accounts[normalized].settings = settings;
          localStorage.setItem('skilltrack_accounts', JSON.stringify(accounts));
        }
      }
    } catch (e) {
      console.warn('Failed to save to local storage:', e);
    }
  }, [sessions, dsaProblems, sessionLogs, settings, profile, user, isLoaded]);

  // Account Creation: Strict validation and database/registry updates
  const signUpWithEmail = useCallback(
    async (fullName: string, email: string, pass: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      const trimmedName = fullName.trim();

      // Strict validation checks
      if (!isValidEmail(normalizedEmail)) {
        throw new Error('Please enter a valid email address (e.g., student@university.edu or user@gmail.com).');
      }
      if (!pass || pass.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }
      if (!trimmedName) {
        throw new Error('Please enter your full name.');
      }

      let authedUser: { id: string; email: string | null };
      let newProfile: UserProfile;

      if (isSupabaseClientConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: pass,
          options: {
            data: { full_name: trimmedName },
          },
        });

        if (error) throw new Error(error.message);
        if (!data.user) throw new Error('Account registration failed.');

        authedUser = { id: data.user.id, email: data.user.email ?? normalizedEmail };
        newProfile = {
          id: data.user.id,
          email: data.user.email ?? normalizedEmail,
          full_name: trimmedName,
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
        // Local mode with strict accounts registry
        const rawAccounts = localStorage.getItem('skilltrack_accounts');
        const accounts: Record<string, StoredLocalAccount> = rawAccounts ? JSON.parse(rawAccounts) : {};

        if (accounts[normalizedEmail]) {
          throw new Error(`An account with the email "${normalizedEmail}" is already registered. Please sign in instead.`);
        }

        const localId = generateUUID();
        authedUser = { id: localId, email: normalizedEmail };
        newProfile = {
          id: localId,
          email: normalizedEmail,
          full_name: trimmedName,
          bio: '',
          target_hours_per_week: 10,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
          current_streak: 0,
          longest_streak: 0,
          total_sessions_completed: 0,
          isGuest: false,
        };

        accounts[normalizedEmail] = {
          id: localId,
          email: normalizedEmail,
          password: pass,
          profile: newProfile,
          sessions: [],
          dsaProblems: [],
          sessionLogs: [],
          settings: DEFAULT_SETTINGS,
        };

        localStorage.setItem('skilltrack_accounts', JSON.stringify(accounts));
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

  // Sign In: Strict email format, account existence, and password validation
  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    // Strict validation
    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Please enter a valid email address (e.g., student@university.edu or user@gmail.com).');
    }
    if (!pass) {
      throw new Error('Please enter your password.');
    }

    let authedUser: { id: string; email: string | null };
    let loadedProfile: UserProfile;

    if (isSupabaseClientConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: pass,
      });

      if (error) {
        throw new Error(error.message || 'Invalid email or password.');
      }
      if (!data.user) throw new Error('Sign in failed.');

      authedUser = { id: data.user.id, email: data.user.email ?? normalizedEmail };

      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      loadedProfile = profData || {
        id: data.user.id,
        email: data.user.email ?? normalizedEmail,
        full_name: normalizedEmail.split('@')[0],
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

      if (userSessions && userSessions.length > 0) {
        setSessions(userSessions);
      } else {
        try {
          const storedSessions = localStorage.getItem('skilltrack_sessions');
          if (storedSessions) {
            const parsed = JSON.parse(storedSessions);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const migrated = parsed.map((s: any) => ({
                ...s,
                id: isValidUUID(s.id) ? s.id : generateUUID(),
                user_id: data.user.id,
                days_of_week: s.days_of_week || [0, 1, 2, 3, 4, 5, 6],
                is_active: s.is_active ?? true,
              }));
              setSessions(migrated);
              migrated.forEach((m: any) => {
                if (supabase) {
                  supabase.from('study_sessions').upsert({
                    id: m.id,
                    user_id: m.user_id,
                    title: m.title,
                    category: m.category || 'DSA',
                    start_time: m.start_time,
                    end_time: m.end_time,
                    days_of_week: m.days_of_week,
                    is_active: m.is_active,
                    notes: m.notes || null,
                  }).then();
                }
              });
            }
          }
        } catch {}
      }
      setDsaProblems(userProblems || []);
      setSessionLogs(userLogs || []);
    } else {
      // Local authentication verification against registered accounts
      const rawAccounts = localStorage.getItem('skilltrack_accounts');
      const accounts: Record<string, StoredLocalAccount> = rawAccounts ? JSON.parse(rawAccounts) : {};
      const storedAccount = accounts[normalizedEmail];

      if (!storedAccount) {
        throw new Error(`No account found for "${normalizedEmail}". Please switch to "Create Account" to register first.`);
      }

      if (storedAccount.password !== pass) {
        throw new Error('Incorrect password. Please verify your credentials and try again.');
      }

      authedUser = { id: storedAccount.id, email: storedAccount.email };
      loadedProfile = storedAccount.profile || {
        id: storedAccount.id,
        email: storedAccount.email,
        full_name: storedAccount.email.split('@')[0],
        timezone: 'Asia/Kolkata',
        current_streak: 0,
        longest_streak: 0,
        total_sessions_completed: 0,
        isGuest: false,
      };

      setSessions(storedAccount.sessions || []);
      setDsaProblems(storedAccount.dsaProblems || []);
      setSessionLogs(storedAccount.sessionLogs || []);
      if (storedAccount.settings) setSettings(storedAccount.settings);
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
      const sessionId = generateUUID();
      const currentUserId = user?.id || generateUUID();
      const session: StudySession = {
        ...newSession,
        id: sessionId,
        user_id: currentUserId,
        days_of_week: newSession.days_of_week && newSession.days_of_week.length > 0 ? newSession.days_of_week : [0, 1, 2, 3, 4, 5, 6],
        is_active: newSession.is_active ?? true,
      };

      setSessions((prev) => {
        const next = [...prev, session];
        syncSessionsToServer(next, settings, user?.id);
        return next;
      });

      if (supabase && user && isSupabaseClientConfigured) {
        const dbPayload = {
          id: session.id,
          user_id: user.id,
          title: session.title,
          category: session.category || 'DSA',
          start_time: session.start_time,
          end_time: session.end_time,
          days_of_week: session.days_of_week,
          is_active: session.is_active,
          notes: session.notes ?? null,
        };
        supabase
          .from('study_sessions')
          .insert(dbPayload)
          .then(({ error }) => {
            if (error) {
              console.error('[Supabase] Failed to insert study session:', error);
            } else {
              console.log('[Supabase] Successfully inserted study session:', session.id);
            }
          });
      }
      return session;
    },
    [user]
  );

  const updateSession = useCallback(
    (id: string, updates: Partial<StudySession>) => {
      setSessions((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
        syncSessionsToServer(next, settings, user?.id);
        return next;
      });
      if (supabase && user && isSupabaseClientConfigured) {
        const { id: _, user_id: __, is_today: ___, status_today: ____, ...cleanUpdates } = updates as any;
        supabase
          .from('study_sessions')
          .update(cleanUpdates)
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('[Supabase] Failed to update session:', error);
          });
      }
    },
    [user, settings]
  );

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        syncSessionsToServer(next, settings, user?.id);
        return next;
      });
      if (supabase && user && isSupabaseClientConfigured) {
        supabase
          .from('study_sessions')
          .delete()
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('[Supabase] Failed to delete session:', error);
          });
      }
    },
    [user, settings]
  );

  const toggleSessionCompletion = useCallback(
    (sessionId: string, date: string = new Date().toISOString().split('T')[0]) => {
      const currentUserId = user?.id || generateUUID();
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
          if (supabase && user && isSupabaseClientConfigured) {
            supabase
              .from('session_logs')
              .update({ status: nextStatus })
              .eq('id', existing.id)
              .then(({ error }) => {
                if (error) console.error('[Supabase] Failed to update session log:', error);
              });
          }
        } else {
          const newLogId = generateUUID();
          const newLog: SessionLog = {
            id: newLogId,
            user_id: currentUserId,
            session_id: sessionId,
            date,
            status: 'completed',
            problems_solved: 0,
            duration_minutes: 60,
            completed_at: new Date().toISOString(),
          };
          updatedLogs = [...prev, newLog];
          if (supabase && user && isSupabaseClientConfigured) {
            supabase
              .from('session_logs')
              .insert({
                id: newLog.id,
                user_id: user.id,
                session_id: sessionId,
                date: newLog.date,
                status: newLog.status,
                problems_solved: newLog.problems_solved,
                duration_minutes: newLog.duration_minutes,
                completed_at: newLog.completed_at,
              })
              .then(({ error }) => {
                if (error) console.error('[Supabase] Failed to insert session log:', error);
              });
          }
        }
        return updatedLogs;
      });
    },
    [user]
  );

  const addDsaProblem = useCallback(
    (problem: Omit<DsaProblem, 'id' | 'user_id' | 'solved_at'>) => {
      const probId = generateUUID();
      const currentUserId = user?.id || generateUUID();
      const today = new Date().toISOString().split('T')[0];
      const newProb: DsaProblem = {
        ...problem,
        id: probId,
        user_id: currentUserId,
        solved_at: today,
      };
      setDsaProblems((prev) => [newProb, ...prev]);

      if (supabase && user && isSupabaseClientConfigured) {
        supabase
          .from('dsa_problems')
          .insert({
            id: newProb.id,
            user_id: user.id,
            title: newProb.title,
            difficulty: newProb.difficulty,
            platform: newProb.platform || 'LeetCode',
            problem_url: newProb.problem_url ?? null,
            tags: newProb.tags ?? [],
            status: newProb.status ?? 'Solved',
            notes: newProb.notes ?? null,
            solved_at: newProb.solved_at,
          })
          .then(({ error }) => {
            if (error) console.error('[Supabase] Failed to insert dsa problem:', error);
          });
      }
      return newProb;
    },
    [user]
  );

  const deleteDsaProblem = useCallback(
    (id: string) => {
      setDsaProblems((prev) => prev.filter((p) => p.id !== id));
      if (supabase && user && isSupabaseClientConfigured) {
        supabase
          .from('dsa_problems')
          .delete()
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.error('[Supabase] Failed to delete dsa problem:', error);
          });
      }
    },
    [user]
  );

  const updateSettings = useCallback(
    (newSettings: Partial<UserNotificationSettings>) => {
      setSettings((prev) => {
        const merged = { ...prev, ...newSettings };
        syncSessionsToServer(sessions, merged, user?.id);
        if (supabase && user && isSupabaseClientConfigured) {
          supabase
            .from('user_notification_settings')
            .upsert({ ...merged, user_id: user.id })
            .then(({ error }) => {
              if (error) console.error('[Supabase] Failed to update settings:', error);
            });
        }
        return merged;
      });
    },
    [user, sessions]
  );

  const refreshDevices = useCallback(async () => {
    const targetUserId = user?.id || (typeof window !== 'undefined' ? localStorage.getItem('skilltrack_user_id') : null) || 'guest-user';
    try {
      const res = await fetch(`/api/push/subscribe?userId=${targetUserId}`);
      const data = await res.json();
      if (data.subscriptions) {
        setDevices(data.subscriptions);
      }
    } catch (err) {
      console.warn('Failed to refresh devices:', err);
    }
  }, [user]);

  const removeDevice = useCallback(
    async (endpoint: string) => {
      setDevices((prev) => prev.filter((d) => d.endpoint !== endpoint));
      try {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint, userId: user?.id || 'guest-user' }),
        });
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

  const todaySessions = sessions.filter((s) => {
    if (!s.is_active) return false;
    const days = s.days_of_week && s.days_of_week.length > 0 ? s.days_of_week : [0, 1, 2, 3, 4, 5, 6];
    return days.includes(todayDayOfWeek);
  });

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
