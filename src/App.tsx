import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { SignupPage } from './pages/SignupPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { UploadPage } from './pages/UploadPage.tsx';
import { MarketplacePage } from './pages/MarketplacePage.tsx';
import { ActivityPage } from './pages/ActivityPage.tsx';
import { CampusPage } from './pages/CampusPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { RequestsPage } from './pages/RequestsPage.tsx';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { currentUser, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    // Read path from window or fallback to '/'
    const hashOrPath = window.location.pathname;
    return hashOrPath && hashOrPath !== '/' ? hashOrPath : '/';
  });

  const navigate = (path: string) => {
    setCurrentPath(path);
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Protected route enforcement
  // Public: /, /login, /signup
  // Protected: /dashboard, /upload, /marketplace, /activity, /campus, /profile
  const isPublicRoute = ['/', '/login', '/signup'].includes(currentPath);

  useEffect(() => {
    if (!loading) {
      if (!currentUser && !isPublicRoute) {
        // Redirect unauthenticated users to login
        navigate('/login');
      } else if (currentUser && (currentPath === '/login' || currentPath === '/signup')) {
        // Redirect already authenticated users from login/signup to dashboard
        navigate('/dashboard');
      }
    }
  }, [currentUser, loading, currentPath, isPublicRoute]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-stone-300 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="text-sm font-semibold tracking-wide">Starting Waste2Worth...</span>
      </div>
    );
  }

  // Render view based on route
  const renderCurrentRoute = () => {
    if (!currentUser && !isPublicRoute) {
      return <LoginPage onNavigate={navigate} />;
    }

    switch (currentPath) {
      case '/':
        return <HomePage onNavigate={navigate} isAuthenticated={!!currentUser} />;
      case '/login':
        return <LoginPage onNavigate={navigate} />;
      case '/signup':
        return <SignupPage onNavigate={navigate} />;
      case '/dashboard':
        return <DashboardPage onNavigate={navigate} />;
      case '/upload':
        return <UploadPage onNavigate={navigate} />;
      case '/marketplace':
        return <MarketplacePage onNavigate={navigate} currentUserId={currentUser?.uid} />;
      case '/requests':
        return <RequestsPage onNavigate={navigate} />;
      case '/activity':
        return <ActivityPage onNavigate={navigate} />;
      case '/campus':
        return <CampusPage onNavigate={navigate} />;
      case '/profile':
        return <ProfilePage />;
      default:
        return <HomePage onNavigate={navigate} isAuthenticated={!!currentUser} />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar currentPath={currentPath} onNavigate={navigate} />
      <main className="flex-1">{renderCurrentRoute()}</main>
      <footer className="border-t border-stone-900 bg-stone-950 py-8 px-4 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Waste2Worth • Circular Economy & Resource Intelligence</p>
          <p className="text-stone-400 font-medium">
            &ldquo;Waste is not worthless. It is an opportunity.&rdquo;
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
