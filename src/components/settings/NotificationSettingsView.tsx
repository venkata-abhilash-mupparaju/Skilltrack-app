'use client';

import { useState } from 'react';
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Smartphone,
  Trash2,
  Clock,
  Moon,
  Send,
  RefreshCw,
  Sliders,
  Shield,
  Zap,
} from 'lucide-react';
import { UserNotificationSettings, PushSubscriptionItem } from '@/types';
import {
  registerPushSubscription,
  isPushNotificationSupported,
} from '@/lib/pwa/pushManager';
import { INDIAN_CITIES, GLOBAL_TIMEZONES } from '@/lib/timezones';

interface NotificationSettingsViewProps {
  user?: { id: string; email: string | null } | null;
  settings: UserNotificationSettings;
  devices: PushSubscriptionItem[];
  onUpdateSettings: (newSettings: Partial<UserNotificationSettings>) => void;
  onRefreshDevices: () => Promise<void>;
  onRemoveDevice: (endpoint: string) => Promise<void>;
}

export function NotificationSettingsView({
  user,
  settings,
  devices,
  onUpdateSettings,
  onRefreshDevices,
  onRemoveDevice,
}: NotificationSettingsViewProps) {
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTriggeringCron, setIsTriggeringCron] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supportCheck = isPushNotificationSupported();

  const handleEnablePush = async () => {
    setIsSubscribing(true);
    setStatusMessage(null);

    const targetUserId = user?.id || 'guest-user';
    const res = await registerPushSubscription(targetUserId);
    setIsSubscribing(false);

    if (res.success) {
      onUpdateSettings({ enabled: true });
      setStatusMessage({
        type: 'success',
        text: 'This device is successfully subscribed to cloud push notifications!',
      });
      await onRefreshDevices();
    } else {
      setStatusMessage({
        type: 'error',
        text: res.error || 'Failed to enable push notifications on this device.',
      });
    }
  };

  const handleSendTestPush = async () => {
    setIsTesting(true);
    setStatusMessage(null);

    try {
      const targetUserId = user?.id || 'guest-user';

      // 1. Send test push via server Web Push
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          customTitle: '🎯 SkillTrack Mobile Test Reminder',
          customBody: `Cloud push delivered successfully at ${new Date().toLocaleTimeString()}! Your phone is connected.`,
        }),
      });

      const data = await res.json();

      // 2. Also trigger immediate local notification via Service Worker
      if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        try {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification('🎯 SkillTrack Mobile Test Reminder', {
            body: `Your phone is connected! Notifications are working at ${new Date().toLocaleTimeString()}.`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            vibrate: [200, 100, 200],
            tag: `test-instant-${Date.now()}`,
          } as any);
        } catch (localErr) {
          console.warn('Local service worker test notification:', localErr);
        }
      }

      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: `Test push sent successfully to ${data.sentCount} registered device(s)! Check your mobile phone notification shade.`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Could not send test push. Ensure you have clicked "Enable This Device" first.',
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error triggering test push.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTriggerCloudScheduler = async () => {
    setIsTriggeringCron(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/cron/reminders?simulate=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-simulation': 'true',
        },
        body: JSON.stringify({ isSimulation: true, userId: user?.id }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage({
          type: 'success',
          text: `Cloud Reminder Cron executed! Processed: ${data.summary?.processedUsers ?? 1} user(s), Sent: ${data.summary?.remindersSent ?? 0} push alert(s), Duplicates avoided: ${data.summary?.skippedDuplicate ?? 0}.`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Failed to execute cloud scheduler.',
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error running scheduler.' });
    } finally {
      setIsTriggeringCron(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs sm:text-sm font-medium flex-1">{statusMessage.text}</div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* iOS Special Notice if needed */}
      {supportCheck.isIosBrowserNotPwa && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 flex items-start gap-3 text-xs sm:text-sm">
          <Smartphone className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold">Action Required for iPhone / iPad:</strong>
            iOS requires SkillTrack to be added to your Home Screen before Web Push can be activated.
            Tap Safari’s <strong>Share</strong> button &rarr; <strong>Add to Home Screen</strong>, then launch SkillTrack from your home screen.
          </div>
        </div>
      )}

      {/* Section 1: Device Push Activation Card */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-surface-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Mobile Push Reminders</h2>
              <p className="text-xs text-surface-200/70">
                Server-triggered Web Push notifications delivered straight to your phone.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {devices.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold text-xs flex items-center gap-1.5 shadow-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Device Enabled & Active</span>
                </div>
                <button
                  onClick={handleEnablePush}
                  disabled={isSubscribing}
                  className="px-2.5 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-surface-200 hover:text-white text-[11px] font-medium transition-colors"
                  title="Re-sync push subscription if needed"
                >
                  {isSubscribing ? 'Syncing...' : 'Re-sync'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleEnablePush}
                disabled={isSubscribing}
                className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 active:bg-primary-700 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-primary-600/30 transition-all"
              >
                <Smartphone className="w-4 h-4" />
                <span>{isSubscribing ? 'Enabling Device...' : 'Enable This Device'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Test Controls */}
        <div className="pt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSendTestPush}
            disabled={isTesting || devices.length === 0}
            className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 disabled:opacity-40 border border-surface-700 text-surface-200 hover:text-white font-medium text-xs flex items-center gap-2 transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-primary-400" />
            <span>{isTesting ? 'Sending Push...' : 'Send Test Notification'}</span>
          </button>

          <button
            onClick={handleTriggerCloudScheduler}
            disabled={isTriggeringCron}
            className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 disabled:opacity-40 border border-surface-700 text-surface-200 hover:text-white font-medium text-xs flex items-center gap-2 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{isTriggeringCron ? 'Running Cron...' : 'Simulate Cloud Scheduler'}</span>
          </button>

          <span className="text-[11px] text-surface-200/60 ml-auto">
            {devices.length} device(s) enrolled
          </span>
        </div>
      </div>

      {/* Section 2: Timing & Schedule Preferences */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5 shadow-lg space-y-5">
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-primary-400" />
          <h2 className="font-bold text-white text-base">Reminder Timing & Rules</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
          {/* Timezone */}
          <div className="bg-surface-800/60 p-4 rounded-xl border border-surface-700/60">
            <label className="block text-surface-200 font-semibold mb-1">Your City / Timezone</label>
            <p className="text-[11px] text-surface-200/70 mb-2">Select your Indian city or local timezone for exact reminders</p>
            <select
              value={settings.timezone || 'Asia/Kolkata'}
              onChange={(e) => onUpdateSettings({ timezone: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-900 border border-surface-700 text-white text-xs focus:outline-none focus:border-primary-500 font-medium"
            >
              <optgroup label="🇮🇳 Indian Cities (IST - UTC+05:30)">
                {INDIAN_CITIES.map((city) => (
                  <option key={city.value} value={city.value}>
                    {city.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="🌍 International Timezones">
                {GLOBAL_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Reminder Before Session */}
          <div className="bg-surface-800/60 p-4 rounded-xl border border-surface-700/60">
            <label className="block text-surface-200 font-semibold mb-1">Advance Alert</label>
            <p className="text-[11px] text-surface-200/70 mb-2">Send preparation notification before session starts</p>
            <select
              value={settings.reminder_before_minutes}
              onChange={(e) => onUpdateSettings({ reminder_before_minutes: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg bg-surface-900 border border-surface-700 text-white text-xs focus:outline-none focus:border-primary-500"
            >
              <option value={5}>5 minutes before</option>
              <option value={10}>10 minutes before (Recommended)</option>
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before</option>
            </select>
          </div>

          {/* At Start Reminder Toggle */}
          <div className="bg-surface-800/60 p-4 rounded-xl border border-surface-700/60 flex items-center justify-between">
            <div>
              <span className="font-semibold text-white block">Session Start Reminder</span>
              <p className="text-[11px] text-surface-200/70">"It's time for DSA! Solve your daily problems."</p>
            </div>
            <input
              type="checkbox"
              checked={settings.reminder_at_start}
              onChange={(e) => onUpdateSettings({ reminder_at_start: e.target.checked })}
              className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 accent-primary-600 cursor-pointer"
            />
          </div>

          {/* Missed Session Alert Toggle */}
          <div className="bg-surface-800/60 p-4 rounded-xl border border-surface-700/60 flex items-center justify-between">
            <div>
              <span className="font-semibold text-white block">Missed Session Reminder</span>
              <p className="text-[11px] text-surface-200/70">Trigger if uncompleted after scheduled end time</p>
            </div>
            <input
              type="checkbox"
              checked={settings.reminder_missed}
              onChange={(e) => onUpdateSettings({ reminder_missed: e.target.checked })}
              className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 accent-primary-600 cursor-pointer"
            />
          </div>

          {/* Daily Progress Summary */}
          <div className="bg-surface-800/60 p-4 rounded-xl border border-surface-700/60 flex items-center justify-between">
            <div>
              <span className="font-semibold text-white block">Daily Progress Summary</span>
              <p className="text-[11px] text-surface-200/70">Nightly notification summarizing your tasks & problems</p>
            </div>
            <input
              type="checkbox"
              checked={settings.daily_summary}
              onChange={(e) => onUpdateSettings({ daily_summary: e.target.checked })}
              className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 accent-primary-600 cursor-pointer"
            />
          </div>

          {/* Revision Reminders */}
          <div className="bg-surface-800/60 p-4 rounded-xl border border-surface-700/60 flex items-center justify-between">
            <div>
              <span className="font-semibold text-white block">Spaced Revision Reminders</span>
              <p className="text-[11px] text-surface-200/70">Spaced repetition prompts for Hard DSA problems</p>
            </div>
            <input
              type="checkbox"
              checked={settings.revision_reminders}
              onChange={(e) => onUpdateSettings({ revision_reminders: e.target.checked })}
              className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 accent-primary-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Quiet Hours */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Moon className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="font-bold text-white text-base">Quiet Hours</h2>
              <p className="text-xs text-surface-200/70">Suppress push notifications while you are asleep</p>
            </div>
          </div>

          <input
            type="checkbox"
            checked={settings.quiet_hours_enabled}
            onChange={(e) => onUpdateSettings({ quiet_hours_enabled: e.target.checked })}
            className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 accent-primary-600 cursor-pointer"
          />
        </div>

        {settings.quiet_hours_enabled && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-surface-200 mb-1">Start Time</label>
              <input
                type="time"
                value={settings.quiet_hours_start}
                onChange={(e) => onUpdateSettings({ quiet_hours_start: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-200 mb-1">End Time</label>
              <input
                type="time"
                value={settings.quiet_hours_end}
                onChange={(e) => onUpdateSettings({ quiet_hours_end: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-white text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Registered Mobile & Desktop Devices */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-bold text-white text-base">Registered Push Devices</h2>
              <p className="text-xs text-surface-200/70">Multi-device push endpoints saved in Supabase</p>
            </div>
          </div>

          <button
            onClick={() => onRefreshDevices()}
            className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-200 hover:text-white"
            title="Refresh device list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {devices.length === 0 ? (
          <div className="text-center py-6 bg-surface-950/40 rounded-xl border border-dashed border-surface-800 text-xs text-surface-200">
            No devices registered yet. Open SkillTrack on your mobile phone and tap "Enable This Device" above.
          </div>
        ) : (
          <div className="space-y-2.5">
            {devices.map((device, idx) => (
              <div
                key={device.id || device.endpoint || idx}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-800/80 border border-surface-700/60 text-xs"
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-primary-400 shrink-0" />
                  <div>
                    <span className="font-semibold text-white block">{device.device_name}</span>
                    <span className="text-[11px] text-surface-200/60">
                      Enrolled: {new Date(device.created_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onRemoveDevice(device.endpoint)}
                  className="p-2 rounded-lg hover:bg-rose-500/20 text-surface-200 hover:text-rose-400 transition-colors"
                  title="Remove this device"
                  aria-label="Remove device"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
