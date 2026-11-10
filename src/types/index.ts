export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  avatar_url?: string | null;
  bio?: string;
  target_hours_per_week?: number;
  timezone: string;
  current_streak: number;
  longest_streak: number;
  total_sessions_completed: number;
  isGuest: boolean;
  created_at?: string;
  updated_at?: string;
}

export type UserProfile = Profile;

export type SessionCategory = 'DSA' | 'Web Dev' | 'Core CS' | 'Aptitude' | 'Revision' | 'Other';

export interface StudySession {
  id: string;
  user_id: string;
  title: string;
  category: SessionCategory;
  start_time: string; // 'HH:MM:SS' or 'HH:MM'
  end_time: string;   // 'HH:MM:SS' or 'HH:MM'
  days_of_week: number[]; // 0=Sunday, 1=Monday... 6=Saturday
  is_active: boolean;
  notes?: string | null;
  created_at?: string;
  // Computed for today
  is_today?: boolean;
  status_today?: 'pending' | 'completed' | 'in_progress' | 'missed';
}

export interface SessionLog {
  id: string;
  user_id: string;
  session_id: string;
  date: string; // 'YYYY-MM-DD'
  status: 'completed' | 'in_progress' | 'missed' | 'skipped';
  problems_solved: number;
  duration_minutes: number;
  notes?: string | null;
  completed_at: string;
}

export type DsaDifficulty = 'Easy' | 'Medium' | 'Hard';
export type DsaPlatform = 'LeetCode' | 'Codeforces' | 'GeeksforGeeks' | 'HackerRank' | 'Other';

export interface DsaProblem {
  id: string;
  user_id: string;
  title: string;
  difficulty: DsaDifficulty;
  platform: DsaPlatform;
  problem_url?: string | null;
  tags: string[];
  status: 'Solved' | 'Attempted' | 'Revisiting';
  notes?: string | null;
  solved_at: string; // 'YYYY-MM-DD'
  created_at?: string;
}

export interface UserNotificationSettings {
  user_id: string;
  enabled: boolean;
  timezone: string;
  reminder_before_minutes: number; // 5, 10, 15, 30
  reminder_at_start: boolean;
  reminder_missed: boolean;
  missed_threshold_minutes: number; // 15, 30, 45, 60
  daily_summary: boolean;
  daily_summary_time: string; // '21:00:00'
  revision_reminders: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // '22:00:00'
  quiet_hours_end: string;   // '07:00:00'
  category_preferences: Record<string, boolean>;
  updated_at?: string;
}

export interface PushSubscriptionItem {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_name: string;
  user_agent?: string | null;
  created_at: string;
  last_used_at: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  session_id?: string | null;
  notification_type: 'before_session' | 'session_start' | 'missed_session' | 'daily_summary' | 'revision' | 'test';
  scheduled_for: string;
  idempotency_key: string;
  title: string;
  body: string;
  delivery_status: 'sent' | 'failed' | 'suppressed_quiet_hours';
  error_message?: string | null;
  sent_at: string;
}
