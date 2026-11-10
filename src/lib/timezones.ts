// SkillTrack Indian Cities & Global Timezones
// Maps major Indian metropolitan & tech hub cities to standard IANA 'Asia/Kolkata' (IST - UTC+05:30)

export interface TimezoneOption {
  label: string;
  value: string;
  iana: string;
}

export const INDIAN_CITIES: TimezoneOption[] = [
  { label: '🇮🇳 India Standard Time (IST) - Standard', value: 'Asia/Kolkata', iana: 'Asia/Kolkata' },
  { label: '📍 New Delhi / Delhi NCR (IST)', value: 'Asia/Kolkata (New Delhi)', iana: 'Asia/Kolkata' },
  { label: '📍 Mumbai, Maharashtra (IST)', value: 'Asia/Kolkata (Mumbai)', iana: 'Asia/Kolkata' },
  { label: '📍 Bengaluru / Bangalore, Karnataka (IST)', value: 'Asia/Kolkata (Bengaluru)', iana: 'Asia/Kolkata' },
  { label: '📍 Hyderabad, Telangana (IST)', value: 'Asia/Kolkata (Hyderabad)', iana: 'Asia/Kolkata' },
  { label: '📍 Chennai, Tamil Nadu (IST)', value: 'Asia/Kolkata (Chennai)', iana: 'Asia/Kolkata' },
  { label: '📍 Kolkata, West Bengal (IST)', value: 'Asia/Kolkata (Kolkata)', iana: 'Asia/Kolkata' },
  { label: '📍 Pune, Maharashtra (IST)', value: 'Asia/Kolkata (Pune)', iana: 'Asia/Kolkata' },
  { label: '📍 Ahmedabad, Gujarat (IST)', value: 'Asia/Kolkata (Ahmedabad)', iana: 'Asia/Kolkata' },
  { label: '📍 Jaipur, Rajasthan (IST)', value: 'Asia/Kolkata (Jaipur)', iana: 'Asia/Kolkata' },
  { label: '📍 Lucknow, Uttar Pradesh (IST)', value: 'Asia/Kolkata (Lucknow)', iana: 'Asia/Kolkata' },
  { label: '📍 Chandigarh (IST)', value: 'Asia/Kolkata (Chandigarh)', iana: 'Asia/Kolkata' },
  { label: '📍 Kochi / Cochin, Kerala (IST)', value: 'Asia/Kolkata (Kochi)', iana: 'Asia/Kolkata' },
  { label: '📍 Indore, Madhya Pradesh (IST)', value: 'Asia/Kolkata (Indore)', iana: 'Asia/Kolkata' },
  { label: '📍 Visakhapatnam, Andhra Pradesh (IST)', value: 'Asia/Kolkata (Visakhapatnam)', iana: 'Asia/Kolkata' },
  { label: '📍 Vijayawada, Andhra Pradesh (IST)', value: 'Asia/Kolkata (Vijayawada)', iana: 'Asia/Kolkata' },
  { label: '📍 Bhopal, Madhya Pradesh (IST)', value: 'Asia/Kolkata (Bhopal)', iana: 'Asia/Kolkata' },
  { label: '📍 Patna, Bihar (IST)', value: 'Asia/Kolkata (Patna)', iana: 'Asia/Kolkata' },
  { label: '📍 Nagpur, Maharashtra (IST)', value: 'Asia/Kolkata (Nagpur)', iana: 'Asia/Kolkata' },
  { label: '📍 Coimbatore, Tamil Nadu (IST)', value: 'Asia/Kolkata (Coimbatore)', iana: 'Asia/Kolkata' },
  { label: '📍 Thiruvananthapuram, Kerala (IST)', value: 'Asia/Kolkata (Thiruvananthapuram)', iana: 'Asia/Kolkata' },
  { label: '📍 Bhubaneswar, Odisha (IST)', value: 'Asia/Kolkata (Bhubaneswar)', iana: 'Asia/Kolkata' },
  { label: '📍 Guwahati, Assam (IST)', value: 'Asia/Kolkata (Guwahati)', iana: 'Asia/Kolkata' },
];

export const GLOBAL_TIMEZONES: TimezoneOption[] = [
  { label: '🌐 Dubai, UAE (GST - UTC+04:00)', value: 'Asia/Dubai', iana: 'Asia/Dubai' },
  { label: '🌐 Singapore (SGT - UTC+08:00)', value: 'Asia/Singapore', iana: 'Asia/Singapore' },
  { label: '🌐 London, UK (GMT/BST - UTC+00:00)', value: 'Europe/London', iana: 'Europe/London' },
  { label: '🌐 New York, USA (EST/EDT - UTC-05:00)', value: 'America/New_York', iana: 'America/New_York' },
  { label: '🌐 Chicago, USA (CST/CDT - UTC-06:00)', value: 'America/Chicago', iana: 'America/Chicago' },
  { label: '🌐 San Francisco / LA, USA (PST/PDT - UTC-08:00)', value: 'America/Los_Angeles', iana: 'America/Los_Angeles' },
  { label: '🌐 Sydney, Australia (AEST - UTC+10:00)', value: 'Australia/Sydney', iana: 'Australia/Sydney' },
  { label: '🌐 Tokyo, Japan (JST - UTC+09:00)', value: 'Asia/Tokyo', iana: 'Asia/Tokyo' },
  { label: '🌐 UTC (Coordinated Universal Time)', value: 'UTC', iana: 'UTC' },
];

export function extractIanaTimezone(value: string | undefined | null): string {
  if (!value) return 'Asia/Kolkata';
  if (value.startsWith('Asia/Kolkata')) return 'Asia/Kolkata';
  return value.split(' ')[0].trim() || 'Asia/Kolkata';
}
