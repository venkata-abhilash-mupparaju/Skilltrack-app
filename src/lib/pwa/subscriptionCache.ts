// Shared server-side in-memory cache for subscriptions when in local evaluation mode
export interface CachedSubscription {
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

const globalStore = globalThis as unknown as {
  __pushSubscriptionsCache?: Map<string, CachedSubscription>;
};

if (!globalStore.__pushSubscriptionsCache) {
  globalStore.__pushSubscriptionsCache = new Map<string, CachedSubscription>();
}

export const localSubscriptionsCache: Map<string, CachedSubscription> =
  globalStore.__pushSubscriptionsCache;
