// Shared server-side store for synced user sessions and push subscriptions
export interface SyncedUserSession {
  id: string;
  user_id: string;
  title: string;
  category?: string;
  start_time: string;
  end_time: string;
  days_of_week?: number[];
  is_active: boolean;
  notes?: string | null;
}

export interface SyncedUserData {
  userId: string;
  sessions: SyncedUserSession[];
  settings: {
    timezone: string;
    reminder_before_minutes: number;
    reminder_at_start: boolean;
    reminder_missed: boolean;
    missed_threshold_minutes: number;
    quiet_hours_enabled: boolean;
    quiet_hours_start: string;
    quiet_hours_end: string;
  };
  subscription?: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  lastSyncedAt: string;
}

const globalStore = globalThis as unknown as {
  __userSyncCache?: Map<string, SyncedUserData>;
};

if (!globalStore.__userSyncCache) {
  globalStore.__userSyncCache = new Map<string, SyncedUserData>();
}

export const userSyncCache: Map<string, SyncedUserData> =
  globalStore.__userSyncCache;
