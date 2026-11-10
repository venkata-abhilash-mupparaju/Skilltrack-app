'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Code2, Bell, Settings } from 'lucide-react';

export function MobileNavBar() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Today',
      href: '/',
      icon: LayoutDashboard,
      active: pathname === '/',
    },
    {
      label: 'Schedule',
      href: '/schedule',
      icon: Calendar,
      active: pathname.startsWith('/schedule'),
    },
    {
      label: 'DSA',
      href: '/dsa',
      icon: Code2,
      active: pathname.startsWith('/dsa'),
    },
    {
      label: 'Reminders',
      href: '/settings/notifications',
      icon: Bell,
      active: pathname.startsWith('/settings/notifications'),
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      active: pathname === '/settings',
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-900/95 backdrop-blur-lg border-t border-surface-800 px-2 py-1.5 pb-safe shadow-2xl">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                item.active
                  ? 'text-primary-400 font-semibold'
                  : 'text-surface-200/70 hover:text-white font-normal'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-transform ${
                  item.active ? 'bg-primary-500/20 scale-110' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
