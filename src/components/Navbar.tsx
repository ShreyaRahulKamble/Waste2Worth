import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  Recycle,
  LayoutDashboard,
  Upload,
  ShoppingBag,
  Inbox,
  Activity,
  GraduationCap,
  User,
  LogOut,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate }) => {
  const { currentUser, userProfile, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      onNavigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navItems = [
    { label: 'Home', path: '/', isPublic: true, icon: Recycle },
    { label: 'Dashboard', path: '/dashboard', isPublic: false, icon: LayoutDashboard },
    { label: 'Upload Waste', path: '/upload', isPublic: false, icon: Upload },
    { label: 'Marketplace', path: '/marketplace', isPublic: false, icon: ShoppingBag },
    { label: 'Requests', path: '/requests', isPublic: false, icon: Inbox },
    { label: 'My Activity', path: '/activity', isPublic: false, icon: Activity },
    { label: 'Campus & Community', path: '/campus', isPublic: false, icon: GraduationCap },
  ];

  const visibleItems = navItems.filter((item) => item.isPublic || currentUser);

  return (
    <nav id="main-navigation" className="sticky top-0 z-50 bg-stone-900/95 backdrop-blur-md border-b border-emerald-900/40 text-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-stone-950 shadow-md shadow-emerald-950/40">
              <Recycle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 bg-clip-text text-transparent">
                Waste2Worth
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-emerald-400/80 font-medium px-2 py-0.5 rounded-full border border-emerald-800/60 bg-emerald-950/40">
                AI Circular Economy
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              return (
                <button
                  key={item.path}
                  id={`nav-link-${item.path.replace('/', '') || 'home'}`}
                  onClick={() => onNavigate(item.path)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-stone-300 hover:text-white hover:bg-stone-800/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Action / Auth Profile */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3 pl-3 border-l border-stone-800">
                <button
                  id="nav-profile-btn"
                  onClick={() => onNavigate('/profile')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    currentPath === '/profile'
                      ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
                      : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-800/80 text-emerald-200 flex items-center justify-center font-bold text-xs">
                    {userProfile?.name?.charAt(0).toUpperCase() || currentUser.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate text-xs text-stone-200 font-semibold">
                    {userProfile?.name || 'Account'}
                  </span>
                </button>
                <button
                  id="nav-logout-btn"
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 text-stone-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="nav-login-btn"
                  onClick={() => onNavigate('/login')}
                  className="px-4 py-2 text-sm font-medium text-stone-300 hover:text-white transition-colors"
                >
                  Log in
                </button>
                <button
                  id="nav-signup-btn"
                  onClick={() => onNavigate('/signup')}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-stone-950 transition-colors shadow-sm"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              id="mobile-nav-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-menu-drawer" className="md:hidden border-t border-stone-800 bg-stone-900 px-4 pt-2 pb-6 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                id={`mobile-nav-${item.path.replace('/', '') || 'home'}`}
                onClick={() => {
                  onNavigate(item.path);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-4 mt-2 border-t border-stone-800">
            {currentUser ? (
              <div className="space-y-2">
                <button
                  id="mobile-profile-link"
                  onClick={() => {
                    onNavigate('/profile');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-stone-800 text-stone-200 text-sm font-medium"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-400" />
                    <span>{userProfile?.name || currentUser.email}</span>
                  </div>
                  <span className="text-xs text-stone-400">{userProfile?.college || 'Student'}</span>
                </button>
                <button
                  id="mobile-logout-btn"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-900/50 text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="mobile-login-btn"
                  onClick={() => {
                    onNavigate('/login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 text-center text-sm font-medium text-stone-200 bg-stone-800 rounded-lg hover:bg-stone-700"
                >
                  Log in
                </button>
                <button
                  id="mobile-signup-btn"
                  onClick={() => {
                    onNavigate('/signup');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 text-center text-sm font-semibold text-stone-950 bg-emerald-500 rounded-lg hover:bg-emerald-400"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
