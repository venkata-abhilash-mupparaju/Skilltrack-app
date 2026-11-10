// SkillTrack Web Push Subscription & Device Manager

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function detectDeviceName(): string {
  if (typeof window === 'undefined') return 'Unknown Device';
  const ua = navigator.userAgent;

  let os = 'Unknown OS';
  if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/Chrome/i.test(ua) && !/Edg|OPR/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/OPR|Opera/i.test(ua)) browser = 'Opera';

  // Add mobile flag if portable
  const isMobile = /Mobi|Android|iPhone/i.test(ua);
  return `${os} ${browser} ${isMobile ? '(Mobile)' : '(Desktop)'}`;
}

export function isPushNotificationSupported(): {
  supported: boolean;
  reason?: string;
  isIosBrowserNotPwa?: boolean;
} {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Server side rendering' };
  }

  const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

  if (isIos && !isStandalone) {
    return {
      supported: false,
      isIosBrowserNotPwa: true,
      reason: 'On iOS, push notifications require installing SkillTrack to your Home Screen first.',
    };
  }

  if (!('serviceWorker' in navigator)) {
    return { supported: false, reason: 'Service Workers are not supported in this browser.' };
  }

  if (!('PushManager' in window)) {
    return { supported: false, reason: 'PushManager is not supported in this browser.' };
  }

  if (!('Notification' in window)) {
    return { supported: false, reason: 'Notification API is not supported in this browser.' };
  }

  return { supported: true };
}

export async function registerPushSubscription(userId: string = 'guest-user'): Promise<{
  success: boolean;
  subscription?: PushSubscription;
  error?: string;
}> {
  if (userId === 'guest-user' && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('skilltrack_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u && u.id) userId = u.id;
      }
    } catch {}
  }

  const check = isPushNotificationSupported();
  if (!check.supported) {
    return { success: false, error: check.reason || 'Push notifications not supported' };
  }

  try {
    // 1. Explicit user permission prompt
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was denied by the user.' };
    }

    // 2. Wait for Service Worker registration
    const registration = await navigator.serviceWorker.ready;

    // 3. Check for existing subscription or create new
    let subscription = await registration.pushManager.getSubscription();

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      return { success: false, error: 'VAPID public key is missing in environment variables.' };
    }

    if (!subscription) {
      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey as unknown as BufferSource,
      });
    }

    // 4. Send subscription to server API to save in Supabase
    const deviceName = detectDeviceName();
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userId,
        deviceName,
        userAgent: navigator.userAgent,
      }),
    });

    const resJson = await res.json();
    if (!res.ok) {
      return { success: false, error: resJson.error || 'Failed to save subscription on server.' };
    }

    return { success: true, subscription };
  } catch (err: any) {
    console.error('[PushManager] Registration error:', err);
    return { success: false, error: err.message || 'Error subscribing to Web Push.' };
  }
}

export async function unregisterPushSubscription(endpoint?: string, userId: string = 'guest-user'): Promise<boolean> {
  if (userId === 'guest-user' && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('skilltrack_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u && u.id) userId = u.id;
      }
    } catch {}
  }
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        endpoint = endpoint || sub.endpoint;
        await sub.unsubscribe();
      }
    }

    if (endpoint) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, userId }),
      });
    }
    return true;
  } catch (err) {
    console.error('[PushManager] Unsubscribe error:', err);
    return false;
  }
}
