import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  Recycle,
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
  Loader2,
  KeyRound,
  CheckCircle2,
  UserPlus,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface LoginPageProps {
  onNavigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login, signup, loginWithGoogle, loginWithDemo, sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isInvalidCred, setIsInvalidCred] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Pre-fill email if redirected from signup or previous session
  useEffect(() => {
    const saved = sessionStorage.getItem('waste2worth_prefill_email');
    if (saved) {
      setEmail(saved);
      sessionStorage.removeItem('waste2worth_prefill_email');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsInvalidCred(false);
    setPopupBlocked(false);
    setIsUnauthorizedDomain(false);
    setResetSuccess(null);

    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
      onNavigate('/dashboard');
    } catch (err: any) {
      console.error('Firebase Login Error:', err);
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password'
      ) {
        setIsInvalidCred(true);
        setError('Incorrect password or no account found for this email address.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait a moment or reset your password.');
      } else if (err.code === 'auth/invalid-email') {
        setError('The provided email format is invalid.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error connecting to Firebase Authentication. Please check your internet connection.');
      } else {
        setError(err.message || 'Failed to log in. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSignup = async () => {
    if (!email.trim() || !password) return;
    if (password.length < 6) {
      setError('Password must be at least 6 characters to create a new account.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setIsInvalidCred(false);
      const name = email.split('@')[0] || 'Eco Member';
      await signup(name, email.trim(), password, 'Campus Network');
      onNavigate('/dashboard');
    } catch (err: any) {
      console.error('Auto Signup Error:', err);
      setError(err.message || 'Could not register new account with these credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsInvalidCred(false);
    setPopupBlocked(false);
    setIsUnauthorizedDomain(false);
    setResetSuccess(null);
    try {
      setGoogleLoading(true);
      await loginWithGoogle();
      onNavigate('/dashboard');
    } catch (err: any) {
      console.error('Google Sign-in Error:', err);
      if (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked')) {
        setPopupBlocked(true);
      } else if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setIsUnauthorizedDomain(true);
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Failed to sign in with Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDemoLogin = async (type: 'student' | 'partner') => {
    setError(null);
    setIsInvalidCred(false);
    setPopupBlocked(false);
    setIsUnauthorizedDomain(false);
    setResetSuccess(null);
    try {
      setDemoLoading(type);
      await loginWithDemo(type);
      onNavigate('/dashboard');
    } catch (err: any) {
      console.error('Demo Login Error:', err);
      setError(err.message || 'Failed to authenticate demo account.');
    } finally {
      setDemoLoading(null);
    }
  };

  const handleFillDemo = (type: 'student' | 'partner') => {
    if (type === 'student') {
      setEmail('alex.chen@greentech.edu');
      setPassword('EcoLeader2026!');
    } else {
      setEmail('sam.taylor@metropoly.edu');
      setPassword('Recycle2026!');
    }
    setIsInvalidCred(false);
    setError(null);
  };

  const handleSendReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first to receive a password reset link.');
      return;
    }
    try {
      setResetLoading(true);
      await sendPasswordReset(email.trim());
      setResetSuccess(`Password reset link sent to ${email.trim()}! Please check your inbox or spam folder.`);
      setError(null);
      setIsInvalidCred(false);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError('Failed to send reset email: ' + (err.message || 'Please verify the email format.'));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div id="login-page-container" className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-stone-950">
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 mx-auto flex items-center justify-center text-stone-950 font-bold shadow-lg shadow-emerald-950">
            <Recycle className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Welcome back</h2>
          <p className="text-sm text-stone-400">
            Sign in to manage your waste items and community contributions.
          </p>
        </div>

        {/* 1-Click Demo & Reviewer Accounts */}
        <div id="demo-accounts-card" className="bg-stone-950/90 border border-stone-800/90 rounded-xl p-3.5 space-y-2.5 shadow-inner">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              1-Click Demo &amp; Reviewer Accounts
            </span>
            <span className="text-emerald-400 font-medium text-[11px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
              No Popups
            </span>
          </div>
          <p className="text-[11px] text-stone-400 leading-tight">
            Instant sign-in for testing, multi-user exchanges, and reviewing circular actions.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
            <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/50 flex flex-col justify-between gap-2">
              <div>
                <div className="font-bold text-white text-xs flex items-center justify-between">
                  <span>Alex Chen</span>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-900/50 px-1.5 py-0.5 rounded">Student</span>
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5 font-mono truncate">alex.chen@greentech.edu</div>
              </div>
              <div className="flex items-center gap-1.5 pt-1 border-t border-emerald-800/30">
                <button
                  id="demo-student-login-btn"
                  type="button"
                  onClick={() => handleDemoLogin('student')}
                  disabled={!!demoLoading || loading || googleLoading}
                  className="flex-1 py-1 px-2 rounded bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                >
                  {demoLoading === 'student' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemo('student')}
                  className="py-1 px-2 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-medium transition-colors"
                >
                  Fill
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-teal-950/50 border border-teal-800/50 flex flex-col justify-between gap-2">
              <div>
                <div className="font-bold text-white text-xs flex items-center justify-between">
                  <span>Sam Taylor</span>
                  <span className="text-[10px] text-teal-400 font-mono bg-teal-900/50 px-1.5 py-0.5 rounded">Campus Lab</span>
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5 font-mono truncate">sam.taylor@metropoly.edu</div>
              </div>
              <div className="flex items-center gap-1.5 pt-1 border-t border-teal-800/30">
                <button
                  id="demo-partner-login-btn"
                  type="button"
                  onClick={() => handleDemoLogin('partner')}
                  disabled={!!demoLoading || loading || googleLoading}
                  className="flex-1 py-1 px-2 rounded bg-teal-500 hover:bg-teal-400 text-stone-950 text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                >
                  {demoLoading === 'partner' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemo('partner')}
                  className="py-1 px-2 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-medium transition-colors"
                >
                  Fill
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Google Quick Sign-In */}
        <button
          id="google-login-btn"
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading || !!demoLoading}
          className="w-full py-2.5 px-4 rounded-xl border border-stone-700 bg-stone-950 hover:bg-stone-800 text-stone-100 font-semibold transition-colors flex items-center justify-center gap-3 text-sm shadow-sm disabled:opacity-50"
        >
          {googleLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Connecting Google...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.4 7.36 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.41l4.04-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.6 1.24 6.59l4.04 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Google Popup Blocked Assistance Alert */}
        {popupBlocked && (
          <div id="google-popup-blocked-alert" className="p-4 rounded-xl bg-amber-950/70 border border-amber-800/80 text-amber-200 text-sm space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-100">Sign-In Popup Blocked by Browser</p>
                <p className="text-xs text-amber-300/90 mt-1 leading-relaxed">
                  Your browser blocked the Google authentication popup. You can open the app in a new tab where popups are enabled, sign in with email, or use the 1-click demo accounts above.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <a
                id="open-standalone-tab-btn"
                href={typeof window !== 'undefined' ? window.location.href : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex-1 py-2 px-3 rounded-lg font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in New Tab to Sign In</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setPopupBlocked(false);
                  document.getElementById('login-email-input')?.focus();
                }}
                className="w-full sm:w-auto py-2 px-3 rounded-lg font-semibold bg-stone-800 hover:bg-stone-700 text-amber-200 text-xs border border-amber-800/60 transition-colors"
              >
                Use Email Below
              </button>
            </div>
          </div>
        )}

        {/* Google Unauthorized Domain Assistance Alert */}
        {isUnauthorizedDomain && (
          <div id="google-unauthorized-domain-alert" className="p-4 rounded-xl bg-amber-950/70 border border-amber-800/80 text-amber-200 text-sm space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-100">Google OAuth Domain Notice</p>
                <p className="text-xs text-amber-300/90 mt-1 leading-relaxed">
                  Google OAuth restricts sign-ins to pre-approved domains. This deployed host (<span className="font-mono text-white underline">{typeof window !== 'undefined' ? window.location.hostname : 'preview URL'}</span>) has not yet been registered in Firebase Console &gt; Authentication &gt; Authorized Domains.
                </p>
                <p className="text-xs text-amber-200/90 mt-1 font-semibold">
                  Please use Email &amp; Password or 1-Click Demo Accounts below, which work on all deployment URLs!
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsUnauthorizedDomain(false);
                  handleDemoLogin('student');
                }}
                className="w-full sm:w-auto flex-1 py-2 px-3 rounded-lg font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sign In with Demo Student</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsUnauthorizedDomain(false);
                  document.getElementById('login-email-input')?.focus();
                }}
                className="w-full sm:w-auto py-2 px-3 rounded-lg font-semibold bg-stone-800 hover:bg-stone-700 text-amber-200 text-xs border border-amber-800/60 transition-colors"
              >
                Use Email Below
              </button>
            </div>
          </div>
        )}

        <div className="relative flex items-center justify-center">
          <div className="border-t border-stone-800 w-full"></div>
          <span className="bg-stone-900 px-3 text-xs uppercase tracking-wider text-stone-500 font-semibold absolute">
            Or sign in with email
          </span>
        </div>

        {/* Invalid Credential Assistance Alert */}
        {isInvalidCred && (
          <div id="login-invalid-alert" className="p-4 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-sm space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-100">Unable to Sign In</p>
                <p className="text-xs text-rose-300/90 mt-0.5">
                  The password did not match this account, or the email has not been registered yet.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              {password.length >= 6 ? (
                <button
                  id="invalid-auto-signup-btn"
                  type="button"
                  onClick={handleAutoSignup}
                  disabled={loading}
                  className="w-full sm:w-auto flex-1 py-2 px-3 rounded-lg font-bold bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>Create Account &amp; Log In</span>
                </button>
              ) : null}
              <button
                id="invalid-reset-btn"
                type="button"
                onClick={handleSendReset}
                disabled={resetLoading}
                className="w-full sm:w-auto py-2 px-3 rounded-lg font-semibold bg-rose-600 hover:bg-rose-500 text-white text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {resetLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                <span>Send Reset Link</span>
              </button>
              <button
                id="invalid-signup-btn"
                type="button"
                onClick={() => {
                  if (email.trim()) {
                    sessionStorage.setItem('waste2worth_prefill_email', email.trim());
                  }
                  onNavigate('/signup');
                }}
                className="w-full sm:w-auto py-2 px-3 rounded-lg font-semibold bg-stone-800 hover:bg-stone-700 text-rose-200 text-xs border border-rose-800/60 transition-colors flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up Page</span>
              </button>
            </div>
          </div>
        )}

        {/* General error alert */}
        {!isInvalidCred && error && (
          <div id="login-error-alert" className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* Reset link success banner */}
        {resetSuccess && (
          <div id="login-reset-success-alert" className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-700/80 text-emerald-200 text-sm flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>{resetSuccess}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="login-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setIsInvalidCred(false);
                }}
                placeholder="name@university.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
                Password
              </label>
              <button
                id="login-forgot-pwd-btn"
                type="button"
                onClick={handleSendReset}
                disabled={resetLoading}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-2"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="login-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setIsInvalidCred(false);
                }}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-colors"
              />
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3 px-4 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-stone-950 transition-colors flex items-center justify-center gap-2 text-sm shadow-md disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center text-sm text-stone-400 border-t border-stone-800">
          Don&apos;t have an account yet?{' '}
          <button
            id="login-to-signup-btn"
            type="button"
            onClick={() => {
              if (email.trim()) {
                sessionStorage.setItem('waste2worth_prefill_email', email.trim());
              }
              onNavigate('/signup');
            }}
            className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4 ml-1"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
};

