'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSkillTrackStore, isValidEmail } from '@/lib/store';
import { isSupabaseClientConfigured } from '@/lib/supabase/client';
import {
  Zap,
  Mail,
  Lock,
  User,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Globe,
  ShieldCheck,
  Cloud,
  Database,
} from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail } = useSkillTrackStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleEmailBlur = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Email address is required.');
    } else if (!isValidEmail(trimmed)) {
      setEmailError('Please enter a valid email address (e.g., student@university.edu or user@gmail.com).');
    } else {
      setEmailError(null);
    }
  };

  const handlePasswordBlur = () => {
    if (!password) {
      setPasswordError('Password is required.');
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
    } else {
      setPasswordError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim().toLowerCase();

    // Strict validation
    if (!isValidEmail(trimmedEmail)) {
      setEmailError('Please enter a valid email address (e.g., student@university.edu or user@gmail.com).');
      return;
    }
    setEmailError(null);

    if (!password || password.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    setPasswordError(null);

    if (mode === 'signup' && !fullName.trim()) {
      setErrorMessage('Please enter your full name to create an account.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(trimmedEmail, password);
        setSuccessMessage('Credentials verified successfully! Loading your personal profile...');
        setTimeout(() => router.push('/profile'), 500);
      } else {
        await signUpWithEmail(fullName.trim(), trimmedEmail, password);
        setSuccessMessage('Account created and verified! Redirecting to your personal profile...');
        setTimeout(() => router.push('/profile'), 500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
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
            {mode === 'signin' ? 'Sign In to SkillTrack' : 'Create Your Account'}
          </h1>
          <p className="text-xs sm:text-sm text-surface-200/80 mt-1">
            {mode === 'signin'
              ? 'Enter your verified email and password to access your dashboard'
              : 'Register your email and password to create your account and profile'}
          </p>
        </div>

        {/* Live Supabase vs Verified Local Accounts Status Banner */}
        {isSupabaseClientConfigured ? (
          <div className="mb-5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
            <Cloud className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <div className="leading-relaxed">
              <span className="font-semibold block text-emerald-200">Supabase Cloud Authentication Active</span>
              Credentials and email sessions are validated securely against the Supabase database.
            </div>
          </div>
        ) : (
          <div className="mb-5 p-3 rounded-xl bg-surface-800/80 border border-surface-700/80 text-surface-200 text-xs flex items-start gap-2.5">
            <Database className="w-4 h-4 shrink-0 mt-0.5 text-primary-400" />
            <div className="leading-relaxed text-[11px]">
              <span className="font-bold text-white block">Strict Email & Credential Validation Enabled</span>
              Every email format is validated and accounts require password matching. To enable live Supabase verification emails in production, set your Supabase API keys in <code className="text-primary-300">.env.local</code>.
            </div>
          </div>
        )}

        {/* Status Alerts in English */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="flex-1 font-medium">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span className="flex-1 font-medium">{successMessage}</span>
          </div>
        )}

        {/* Form Mode Toggle */}
        <div className="grid grid-cols-2 gap-1 bg-surface-950/60 p-1 rounded-xl border border-surface-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
              setEmailError(null);
              setPasswordError(null);
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
              setEmailError(null);
              setPasswordError(null);
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

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {mode === 'signup' && (
            <div>
              <label className="block text-surface-200 font-medium mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-surface-200 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Mercer"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-950/60 border border-surface-700 text-white placeholder-surface-200/40 text-xs sm:text-sm focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-surface-200 font-medium mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-surface-200 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                onBlur={handleEmailBlur}
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-950/60 border text-white placeholder-surface-200/40 text-xs sm:text-sm focus:outline-none ${
                  emailError
                    ? 'border-rose-500 focus:border-rose-400'
                    : 'border-surface-700 focus:border-primary-500'
                }`}
              />
            </div>
            {emailError && (
              <p className="text-rose-400 text-[11px] mt-1 font-medium">{emailError}</p>
            )}
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
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                onBlur={handlePasswordBlur}
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-950/60 border text-white placeholder-surface-200/40 text-xs sm:text-sm focus:outline-none ${
                  passwordError
                    ? 'border-rose-500 focus:border-rose-400'
                    : 'border-surface-700 focus:border-primary-500'
                }`}
              />
            </div>
            {passwordError && (
              <p className="text-rose-400 text-[11px] mt-1 font-medium">{passwordError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 active:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary-600/30 transition-all mt-2"
          >
            <span>{isLoading ? 'Verifying...' : mode === 'signin' ? 'Sign In' : 'Create Verified Account'}</span>
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
