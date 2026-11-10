'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('[SkillTrack SW] Registered with scope:', registration.scope);

            // Check for updates periodically
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[SkillTrack SW] New content is available; please refresh.');
                  }
                };
              }
            };
          })
          .catch((error) => {
            console.error('[SkillTrack SW] Registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}
