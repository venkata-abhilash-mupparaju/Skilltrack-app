import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { localSubscriptionsCache } from '@/lib/pwa/subscriptionCache';

export async function POST(req: NextRequest) {
  try {
    const { endpoint, userId } = await req.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
    }

    // Remove from local cache
    localSubscriptionsCache.delete(endpoint);

    // Remove from Supabase
    const supabase = getServiceSupabase();
    if (supabase) {
      const query = supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      if (userId) {
        query.eq('user_id', userId);
      }
      await query;
    }

    return NextResponse.json({ success: true, message: 'Device unsubscribed successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
