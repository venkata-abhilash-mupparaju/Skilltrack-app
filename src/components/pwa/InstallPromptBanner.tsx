'use client';

import { useState } from 'react';
import { Download, X, HelpCircle, Smartphone, Share2, PlusSquare, Check } from 'lucide-react';
import { useInstallPrompt } from '@/lib/pwa/useInstallPrompt';

export function InstallPromptBanner() {
  const { isInstallable, isInstalled, isIos, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  if (isInstalled || dismissed) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-primary-900/90 via-surface-900/95 to-primary-950/90 border-b border-primary-500/20 px-4 py-2.5 backdrop-blur-md sticky top-0 z-40 transition-all">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary-500/20">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div className="truncate">
              <span className="font-semibold text-white">Install SkillTrack App</span>
              <p className="text-surface-200/80 text-[11px] truncate">
                Get push reminders on your phone even when laptop is turned off!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isInstallable ? (
              <button
                onClick={promptInstall}
                className="bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-primary-600/30 transition-all text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
            ) : (
              <button
                onClick={() => setShowInstructions(true)}
                className="bg-surface-800 hover:bg-surface-700 text-primary-300 border border-primary-500/30 font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-xs"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>How to Install</span>
              </button>
            )}

            <button
              onClick={() => setDismissed(true)}
              className="text-surface-200/70 hover:text-white p-1 rounded-md"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface-900 border border-surface-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowInstructions(false)}
              className="absolute top-4 right-4 text-surface-200 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Install SkillTrack on Mobile</h3>
                <p className="text-xs text-surface-200/70">Enable standalone mode & push reminders</p>
              </div>
            </div>

            {isIos ? (
              <div className="space-y-3.5 text-xs text-surface-200">
                <p className="text-primary-300 font-medium">Apple iOS (Safari) Instructions:</p>
                <div className="flex items-start gap-3 bg-surface-800/60 p-2.5 rounded-lg border border-surface-700/50">
                  <Share2 className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                  <span>1. Tap the <strong>Share</strong> button in Safari's bottom toolbar.</span>
                </div>
                <div className="flex items-start gap-3 bg-surface-800/60 p-2.5 rounded-lg border border-surface-700/50">
                  <PlusSquare className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                  <span>2. Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                </div>
                <div className="flex items-start gap-3 bg-surface-800/60 p-2.5 rounded-lg border border-surface-700/50">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>3. Tap <strong>Add</strong> at top right. Open the installed app from your home screen and enable notifications!</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs text-surface-200">
                <p className="text-primary-300 font-medium">Android (Chrome / Edge) Instructions:</p>
                <div className="flex items-start gap-3 bg-surface-800/60 p-2.5 rounded-lg border border-surface-700/50">
                  <div className="w-4 h-4 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-[10px] shrink-0 font-bold">1</div>
                  <span>Tap the three dots (⋮) menu in Chrome's top right corner.</span>
                </div>
                <div className="flex items-start gap-3 bg-surface-800/60 p-2.5 rounded-lg border border-surface-700/50">
                  <Download className="w-4 h-4 text-primary-400 shrink-0 mt-0.5" />
                  <span>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span>
                </div>
                <div className="flex items-start gap-3 bg-surface-800/60 p-2.5 rounded-lg border border-surface-700/50">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Confirm by tapping <strong>Install</strong>. SkillTrack will now run as a native mobile app!</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowInstructions(false)}
              className="mt-5 w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-xl text-xs transition-colors"
            >
              Got it, close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
