import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getServiceSupabase } from '@/lib/supabase/server';
import { localSubscriptionsCache } from '@/lib/pwa/subscriptionCache';

const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:notifications@skilltrack.app';

if (vapidPublic && vapidPrivate) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  } catch (err) {
    console.error('[WebPush] Configuration error:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId = 'guest-user', customTitle, customBody } = await req.json().catch(() => ({}));

    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json(
        { error: 'VAPID keys not configured in environment variables.' },
        { status: 500 }
      );
    }

    // 1. Gather subscriptions from Supabase and local cache
    const supabase = getServiceSupabase();
    let subscriptions: any[] = [];

    if (supabase) {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (data && data.length > 0) {
        subscriptions = data;
      }
    }

    if (subscriptions.length === 0) {
      // Use in-memory cache
      subscriptions = Array.from(localSubscriptionsCache.values()).filter(
        (s) => s.user_id === userId
      );
    }

    if (subscriptions.length === 0) {
      return NextResponse.json(
        {
          error:
            'No registered push devices found. Please click "Enable Push Reminders" on your mobile device first.',
        },
        { status: 404 }
      );
    }

    const payload = JSON.stringify({
      title: customTitle || '🎯 SkillTrack Live Reminder Test',
      body:
        customBody ||
        `Verification successful! Your device is linked to SkillTrack's cloud scheduler at ${new Date().toLocaleTimeString()}.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      url: '/schedule',
      type: 'test',
      tag: `test-${Date.now()}`,
    });

    const results = [];
    let sentCount = 0;
    let expiredCount = 0;

    for (const sub of subscriptions) {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushConfig, payload, {
          TTL: 60,
          urgency: 'high',
        });
        sentCount++;
        results.push({ device: sub.device_name, status: 'delivered' });

        // Update last_used_at in Supabase if present
        if (supabase && sub.id) {
          await supabase
            .from('push_subscriptions')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', sub.id);
        }
      } catch (err: any) {
        const statusCode = err.statusCode || 500;
        console.error(`[WebPush Test Error] Device ${sub.device_name}:`, statusCode, err.message);

        if (statusCode === 410 || statusCode === 404) {
          expiredCount++;
          localSubscriptionsCache.delete(sub.endpoint);
          if (supabase && sub.id) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          }
          results.push({ device: sub.device_name, status: 'expired_removed' });
        } else {
          results.push({ device: sub.device_name, status: 'failed', error: err.message });
        }
      }
    }

    // Record test in notification logs if Supabase is connected
    if (supabase) {
      await supabase.from('notification_logs').insert({
        user_id: userId,
        notification_type: 'test',
        scheduled_for: new Date().toISOString().split('T')[0],
        idempotency_key: `test_${userId}_${Date.now()}`,
        title: customTitle || '🎯 SkillTrack Live Reminder Test',
        body: customBody || 'Test push notification delivered',
        delivery_status: sentCount > 0 ? 'sent' : 'failed',
      });
    }

    return NextResponse.json({
      success: sentCount > 0,
      sentCount,
      expiredCount,
      totalDevices: subscriptions.length,
      results,
    });
  } catch (err: any) {
    console.error('[API /api/push/test] Fatal Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
