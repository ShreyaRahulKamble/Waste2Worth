import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  Recycle,
  Mail,
  Lock,
  User,
  GraduationCap,
  AlertCircle,
  ArrowRight,
  Loader2,
  CheckCircle2,
  KeyRound,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface SignupPageProps {
  onNavigate: (path: string) => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onNavigate }) => {
  const { signup, loginWithGoogle, sendPasswordReset } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [college, setCollege] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isEmailInUse, setIsEmailInUse] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsEmailInUse(false);
    setPopupBlocked(false);
    setIsUnauthorizedDomain(false);
    setResetSuccess(null);

    if (!fullName.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please provide a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!college.trim()) {
      setError('Please specify your college or organization.');
      return;
    }

    try {
      setLoading(true);
      await signup(fullName, email, password, college);
      onNavigate('/dashboard');
    } catch (err: any) {
      console.error('Firebase Signup Error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setIsEmailInUse(true);
        setError(`An account with "${email.trim()}" already exists in the system.`);
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setError('The provided email format is invalid.');
      } else {
        setError(err.message || 'Could not complete registration. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    setIsEmailInUse(false);
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

  const handleSendReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email above to receive a reset link.');
      return;
    }
    try {
      setResetLoading(true);
      await sendPasswordReset(email.trim());
      setResetSuccess(`Password reset instructions sent to ${email.trim()}. Please check your inbox or spam folder.`);
      setError(null);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError('Could not send reset email: ' + (err.message || 'Please verify the email address.'));
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoToLogin = () => {
    if (email.trim()) {
      sessionStorage.setItem('waste2worth_prefill_email', email.trim());
    }
    onNavigate('/login');
  };

  return (
    <div id="signup-page-container" className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-stone-950">
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 mx-auto flex items-center justify-center text-stone-950 font-bold shadow-lg shadow-emerald-950">
            <Recycle className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Create your account</h2>
          <p className="text-sm text-stone-400">
            Join the circular network to divert waste, upcycle, and trade.
          </p>
        </div>

        {/* Google Quick Sign-Up */}
        <button
          id="google-signup-btn"
          type="button"
          onClick={handleGoogleSignup}
          disabled={googleLoading || loading}
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
          <div id="google-signup-popup-blocked-alert" className="p-4 rounded-xl bg-amber-950/70 border border-amber-800/80 text-amber-200 text-sm space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-100">Sign-In Popup Blocked by Browser</p>
                <p className="text-xs text-amber-300/90 mt-1 leading-relaxed">
                  Your browser blocked the Google authentication popup. You can open the app in a new tab where popups are enabled, sign up with email below, or use the 1-click demo accounts on the login page.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <a
                id="signup-open-standalone-tab-btn"
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
                onClick={handleGoToLogin}
                className="w-full sm:w-auto py-2 px-3 rounded-lg font-semibold bg-stone-800 hover:bg-stone-700 text-amber-200 text-xs border border-amber-800/60 transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Try Demo Accounts</span>
              </button>
            </div>
          </div>
        )}

        {/* Google Unauthorized Domain Assistance Alert */}
        {isUnauthorizedDomain && (
          <div id="google-signup-unauthorized-domain-alert" className="p-4 rounded-xl bg-amber-950/70 border border-amber-800/80 text-amber-200 text-sm space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-100">Google OAuth Domain Notice</p>
                <p className="text-xs text-amber-300/90 mt-1 leading-relaxed">
                  Google OAuth restricts sign-ups to authorized domains. This deployed host (<span className="font-mono text-white underline">{typeof window !== 'undefined' ? window.location.hostname : 'preview URL'}</span>) has not yet been registered in Firebase Console &gt; Authentication &gt; Authorized Domains.
                </p>
                <p className="text-xs text-amber-200/90 mt-1 font-semibold">
                  Please use Email Registration below or the 1-Click Demo Accounts on the login page!
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleGoToLogin}
                className="w-full sm:w-auto flex-1 py-2 px-3 rounded-lg font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Use Demo Accounts</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsUnauthorizedDomain(false);
                  document.getElementById('signup-fullname-input')?.focus();
                }}
                className="w-full sm:w-auto py-2 px-3 rounded-lg font-semibold bg-stone-800 hover:bg-stone-700 text-amber-200 text-xs border border-amber-800/60 transition-colors"
              >
                Register with Email
              </button>
            </div>
          </div>
        )}

        <div className="relative flex items-center justify-center">
          <div className="border-t border-stone-800 w-full"></div>
          <span className="bg-stone-900 px-3 text-xs uppercase tracking-wider text-stone-500 font-semibold absolute">
            Or register with email
          </span>
        </div>

        {/* Email already in use prompt */}
        {isEmailInUse && (
          <div id="email-in-use-alert" className="p-4 rounded-xl bg-amber-950/70 border border-amber-700/80 text-amber-200 text-sm space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-100">Account Already Exists</p>
                <p className="text-xs text-amber-300/90 mt-0.5">
                  An account registered to <span className="font-mono text-white underline">{email}</span> already exists.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                id="in-use-signin-btn"
                type="button"
                onClick={handleGoToLogin}
                className="w-full sm:w-auto flex-1 py-2 px-3 rounded-lg font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Sign In with this Email</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                id="in-use-reset-btn"
                type="button"
                onClick={handleSendReset}
                disabled={resetLoading}
                className="w-full sm:w-auto py-2 px-3 rounded-lg font-semibold bg-stone-800 hover:bg-stone-700 text-amber-200 text-xs border border-amber-700/50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {resetLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                <span>Reset Password</span>
              </button>
            </div>
          </div>
        )}

        {/* General error banner */}
        {!isEmailInUse && error && (
          <div id="signup-error-alert" className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* Reset link success banner */}
        {resetSuccess && (
          <div id="reset-success-alert" className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-700/80 text-emerald-200 text-sm flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>{resetSuccess}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                <User className="w-4 h-4" />
              </div>
              <input
                id="signup-name-input"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="signup-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setIsEmailInUse(false);
                }}
                placeholder="alex@university.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
              College / Organization
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                <GraduationCap className="w-4 h-4" />
              </div>
              <input
                id="signup-college-input"
                type="text"
                required
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="MIT / Berkeley Maker Lab"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Password (min. 6 characters)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="signup-password-input"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-colors"
              />
            </div>
          </div>

          <button
            id="signup-submit-btn"
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3 px-4 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-stone-950 transition-colors flex items-center justify-center gap-2 text-sm shadow-md disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center text-sm text-stone-400 border-t border-stone-800">
          Already registered?{' '}
          <button
            id="signup-to-login-btn"
            type="button"
            onClick={handleGoToLogin}
            className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4 ml-1"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};

