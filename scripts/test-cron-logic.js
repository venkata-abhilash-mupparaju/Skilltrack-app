// Unit & Integration test for Cloud Scheduler Logic

function getUserLocalTime(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const map = {};
  parts.forEach((p) => { map[p.type] = p.value; });

  const dayName = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  const hours = parseInt(map.hour, 10);
  const minutes = parseInt(map.minute, 10);

  return {
    dateStr: `${map.year}-${map.month}-${map.day}`,
    hours,
    minutes,
    totalMinutes: hours * 60 + minutes,
    dayOfWeek: dayMap[dayName] ?? 0,
  };
}

function parseTimeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return h * 60 + m;
}

function isInQuietHours(currentMinutes, startStr, endStr) {
  const start = parseTimeToMinutes(startStr);
  const end = parseTimeToMinutes(endStr);
  if (start < end) {
    return currentMinutes >= start && currentMinutes < end;
  } else {
    return currentMinutes >= start || currentMinutes < end;
  }
}

function simulateScheduler(simulatedUtcDate, session, settings, existingLogs) {
  const local = getUserLocalTime(simulatedUtcDate, settings.timezone);
  const startMin = parseTimeToMinutes(session.start_time);
  const endMin = parseTimeToMinutes(session.end_time);
  const offset = settings.reminder_before_minutes || 10;
  const targetBefore = startMin - offset;

  let reminderType = null;
  let title = '';
  let body = '';
  let idempotencyKey = '';

  if (Math.abs(local.totalMinutes - targetBefore) <= 1) {
    reminderType = 'before_session';
    title = `🎯 ${session.title} Starts Soon`;
    body = `Your ${session.title} session starts in ${offset} minutes. Get ready!`;
    idempotencyKey = `${session.id}_${local.dateStr}_before_${offset}`;
  } else if (settings.reminder_at_start && Math.abs(local.totalMinutes - startMin) <= 1) {
    reminderType = 'session_start';
    title = `⚡ Study Time: ${session.title}`;
    body = `It's time for ${session.title}! Solve your daily problems now.`;
    idempotencyKey = `${session.id}_${local.dateStr}_start`;
  }

  if (!reminderType) return { action: 'none' };

  // Idempotency check
  if (existingLogs.has(idempotencyKey)) {
    return { action: 'skipped_duplicate', idempotencyKey };
  }

  // Quiet hours check
  if (settings.quiet_hours_enabled && isInQuietHours(local.totalMinutes, settings.quiet_hours_start, settings.quiet_hours_end)) {
    existingLogs.add(idempotencyKey);
    return { action: 'suppressed_quiet_hours', idempotencyKey };
  }

  existingLogs.add(idempotencyKey);
  return { action: 'sent', reminderType, title, body, idempotencyKey };
}

function assert(condition, message) {
  if (!condition) {
    console.error('❌ FAIL:', message);
    process.exit(1);
  }
  console.log('  ✔ PASS:', message);
}

function runTests() {
  console.log('--- 3. Testing Cloud Scheduler & Idempotency Rules ---');

  const session = {
    id: 'dsa-daily',
    title: 'DSA Practice',
    start_time: '18:00', // 6:00 PM
    end_time: '19:00',   // 7:00 PM
  };

  const settings = {
    timezone: 'Asia/Kolkata',
    reminder_before_minutes: 10,
    reminder_at_start: true,
    reminder_missed: true,
    missed_threshold_minutes: 30,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
  };

  const logs = new Set();

  // Test Case A: At 5:50 PM (17:50) -> Should send "starts in 10 minutes"
  // 17:50 IST = 12:20 UTC
  const time550 = new Date('2026-11-10T12:20:00Z');
  const res1 = simulateScheduler(time550, session, settings, logs);
  assert(res1.action === 'sent', 'Reminder sent at 5:50 PM');
  assert(res1.reminderType === 'before_session', 'Type is before_session');
  assert(res1.body.includes('starts in 10 minutes'), 'Body includes 10 minutes advance warning');

  // Test Case B: Immediate duplicate run at 5:50 PM -> Must be SKIPPED
  const resDuplicate = simulateScheduler(time550, session, settings, logs);
  assert(resDuplicate.action === 'skipped_duplicate', 'Duplicate run safely suppressed by idempotency');

  // Test Case C: At 6:00 PM (18:00) -> Should send "It's time for DSA!"
  // 18:00 IST = 12:30 UTC
  const time600 = new Date('2026-11-10T12:30:00Z');
  const res2 = simulateScheduler(time600, session, settings, logs);
  assert(res2.action === 'sent', 'Reminder sent at 6:00 PM session start');
  assert(res2.reminderType === 'session_start', 'Type is session_start');
  assert(res2.body.includes("Solve your daily problems"), 'Body prompts user to solve daily problems');

  // Test Case D: Quiet Hours Suppression
  const quietSettings = { ...settings, quiet_hours_enabled: true, quiet_hours_start: '17:00', quiet_hours_end: '19:00' };
  const quietLogs = new Set();
  const resQuiet = simulateScheduler(time550, session, quietSettings, quietLogs);
  assert(resQuiet.action === 'suppressed_quiet_hours', 'Quiet hours correctly suppress alert');

  console.log('✅ Cloud Scheduler and Idempotency Rules Verified Successfully!');
}

runTests();
