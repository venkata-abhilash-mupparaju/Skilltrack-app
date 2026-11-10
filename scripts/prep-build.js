const fs = require('fs');
const path = require('path');

const dirs = [
  '.next/server/app',
  '.next/server/app/api/cron/reminders',
  '.next/server/app/api/push/subscribe',
  '.next/server/app/api/push/unsubscribe',
  '.next/server/app/api/push/test',
  '.next/server/app/dsa',
  '.next/server/app/login',
  '.next/server/app/profile',
  '.next/server/app/schedule',
  '.next/server/app/settings/notifications',
  '.next/types/app',
  '.next/types/app/api',
  '.next/types/app/dsa',
  '.next/types/app/login',
  '.next/types/app/profile',
  '.next/types/app/schedule',
  '.next/types/app/settings/notifications',
  '.next/static/chunks',
];

dirs.forEach((d) => {
  const full = path.join(__dirname, '..', d);
  try {
    fs.mkdirSync(full, { recursive: true });
  } catch (e) {}
});

console.log('Build directories prepared.');
