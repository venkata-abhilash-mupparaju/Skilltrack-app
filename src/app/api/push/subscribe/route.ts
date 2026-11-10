import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { localSubscriptionsCache } from '@/lib/pwa/subscriptionCache';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, userId = 'guest-user', deviceName = 'Mobile Device', userAgent } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    if (!p256dh || !auth) {
      return NextResponse.json({ error: 'Missing p256dh or auth keys in push subscription' }, { status: 400 });
    }

    // Always keep in local memory cache for instant local testing
    const cacheEntry = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      endpoint,
      p256dh,
      auth,
      device_name: deviceName,
      user_agent: userAgent || null,
      created_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
    };
    localSubscriptionsCache.set(endpoint, cacheEntry);

    // Save to Supabase if configured
    const supabase = getServiceSupabase();
    if (supabase) {
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
          device_name: deviceName,
          user_agent: userAgent,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );

      if (error) {
        console.error('[API /api/push/subscribe] Supabase error:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription successfully saved',
      device: deviceName,
    });
  } catch (err: any) {
    console.error('[API /api/push/subscribe] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId') || 'guest-user';
  const supabase = getServiceSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return NextResponse.json({ subscriptions: data });
    }
  }

  // Fallback to local cache
  const cachedList = Array.from(localSubscriptionsCache.values()).filter(
    (item) => item.user_id === userId
  );
  return NextResponse.json({ subscriptions: cachedList });
}
