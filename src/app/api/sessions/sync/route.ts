import { NextRequest, NextResponse } from 'next/server';
import { userSyncCache, SyncedUserData } from '@/lib/pwa/syncStore';
import { localSubscriptionsCache } from '@/lib/pwa/subscriptionCache';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      userId = 'guest-user',
      sessions = [],
      settings = {
        timezone: 'Asia/Kolkata',
        reminder_before_minutes: 10,
        reminder_at_start: true,
        reminder_missed: true,
        missed_threshold_minutes: 30,
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
      },
      subscription,
      deviceName = 'Mobile Device',
    } = body;

    const syncData: SyncedUserData = {
      userId,
      sessions: Array.isArray(sessions) ? sessions : [],
      settings,
      subscription,
      lastSyncedAt: new Date().toISOString(),
    };

    // 1. Store in server-side memory store
    userSyncCache.set(userId, syncData);

    if (subscription?.endpoint && subscription?.keys?.p256dh && subscription?.keys?.auth) {
      localSubscriptionsCache.set(subscription.endpoint, {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        device_name: deviceName,
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
      });
    }

    // 2. Best-effort database synchronization to Supabase
    const supabase = getServiceSupabase();
    if (supabase) {
      // Upsert notification settings
      supabase
        .from('user_notification_settings')
        .upsert(
          {
            user_id: userId,
            timezone: settings.timezone || 'Asia/Kolkata',
            reminder_before_minutes: settings.reminder_before_minutes ?? 10,
            reminder_at_start: settings.reminder_at_start ?? true,
            reminder_missed: settings.reminder_missed ?? true,
            missed_threshold_minutes: settings.missed_threshold_minutes ?? 30,
            quiet_hours_enabled: settings.quiet_hours_enabled ?? false,
            quiet_hours_start: settings.quiet_hours_start || '22:00',
            quiet_hours_end: settings.quiet_hours_end || '07:00',
          },
          { onConflict: 'user_id' }
        )
        .then();

      // Upsert push subscription
      if (subscription?.endpoint && subscription?.keys) {
        supabase
          .from('push_subscriptions')
          .upsert(
            {
              user_id: userId,
              endpoint: subscription.endpoint,
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
              device_name: deviceName,
              last_used_at: new Date().toISOString(),
            },
            { onConflict: 'endpoint' }
          )
          .then();
      }

      // Upsert study sessions
      if (Array.isArray(sessions) && sessions.length > 0) {
        for (const s of sessions) {
          if (!s.title || !s.start_time || !s.end_time) continue;
          supabase
            .from('study_sessions')
            .upsert(
              {
                id: s.id,
                user_id: userId,
                title: s.title,
                category: s.category || 'DSA',
                start_time: s.start_time,
                end_time: s.end_time,
                days_of_week: Array.isArray(s.days_of_week) ? s.days_of_week : [0, 1, 2, 3, 4, 5, 6],
                is_active: s.is_active ?? true,
                notes: s.notes || null,
              },
              { onConflict: 'id' }
            )
            .then();
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sessions and notification schedules synced with cloud reminder engine',
      cachedSessions: syncData.sessions.length,
      userId,
    });
  } catch (err: any) {
    console.error('[API /api/sessions/sync Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId') || 'guest-user';
  const cached = userSyncCache.get(userId);
  return NextResponse.json({
    success: true,
    data: cached || null,
  });
}
