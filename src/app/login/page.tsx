'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSkillTrackStore } from '@/lib/store';
import {
  Zap,
  Mail,
  Lock,
  ArrowRight,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Globe,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, signInAsGuest } = useSkillTrackStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
        setSuccessMessage('Signed in successfully! Redirecting to your dashboard...');
        setTimeout(() => router.push('/'), 600);
      } else {
        await signUpWithEmail(email.trim(), password);
        setSuccessMessage('Account created successfully! Redirecting...');
        setTimeout(() => router.push('/'), 600);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    signInAsGuest();
    setSuccessMessage('Entering SkillTrack as Guest...');
    setTimeout(() => router.push('/'), 400);
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center py-6 px-4">
      {/* English Language Banner */}
      <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-900 border border-primary-500/30 text-xs text-primary-300 shadow-md">
        <Globe className="w-3.5 h-3.5 text-primary-400" />
        <span>Language: <strong>English (US)</strong></span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      </div>

      <div className="bg-surface-900 border border-surface-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
        {/* Background Decorative Glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-primary-500/25">
            <Zap className="w-6 h-6 fill-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {mode === 'signin' ? 'Sign In to SkillTrack' : 'Create an Account'}
          </h1>
          <p className="text-xs sm:text-sm text-surface-200/80 mt-1">
            Personal Study & DSA Habit Tracker with Cloud Reminders
          </p>
        </div>

        {/* Status Alerts in English */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="flex-1 font-medium">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span className="flex-1 font-medium">{successMessage}</span>
          </div>
        )}

        {/* One-Click Instant Guest Access */}
        <div className="mb-5">
          <button
            type="button"
            onClick={handleGuestLogin}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>Instant One-Click Login (Guest Mode)</span>
          </button>
          <p className="text-[11px] text-surface-200/60 text-center mt-1.5">
            No password or registration required. Jump straight into the dashboard!
          </p>
        </div>

        <div className="relative flex py-2 items-center mb-5">
          <div className="flex-grow border-t border-surface-800"></div>
          <span className="flex-shrink mx-3 text-[11px] uppercase font-semibold text-surface-200/60 tracking-wider">
            Or sign in with email
          </span>
          <div className="flex-grow border-t border-surface-800"></div>
        </div>

        {/* Form Mode Toggle */}
        <div className="grid grid-cols-2 gap-1 bg-surface-950/60 p-1 rounded-xl border border-surface-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-surface-200 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-surface-200 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-surface-200 font-medium mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-surface-200 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-950/60 border border-surface-700 text-white placeholder-surface-200/40 text-xs sm:text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-surface-200 font-medium mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-surface-200 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-950/60 border border-surface-700 text-white placeholder-surface-200/40 text-xs sm:text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 active:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary-600/30 transition-all mt-2"
          >
            <span>{isLoading ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Create Free Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-surface-200/70">
          <Link href="/" className="hover:text-primary-400 transition-colors">
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
