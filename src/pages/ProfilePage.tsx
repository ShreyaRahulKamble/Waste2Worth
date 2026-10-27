import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { updateUserProfile } from '../services/db.ts';
import {
  User,
  Mail,
  GraduationCap,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { currentUser, userProfile, refreshProfile } = useAuth();

  const [name, setName] = useState(userProfile?.name || '');
  const [college, setCollege] = useState(userProfile?.college || '');
  const [bio, setBio] = useState(userProfile?.bio || '');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setSaving(true);
      setMessage(null);
      await updateUserProfile(currentUser.uid, {
        name: name.trim(),
        college: college.trim(),
        bio: bio.trim(),
      });
      await refreshProfile();
      setMessage({ type: 'success', text: 'Profile successfully updated in Firestore!' });
    } catch (err: any) {
      console.error('Update profile error:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="profile-page-container" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
          <span>Account Settings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">User Profile</h1>
        <p className="text-sm text-stone-400 mt-1">
          Manage your verified campus details and public circular profile.
        </p>
      </div>

      {message && (
        <div
          id="profile-status-alert"
          className={`p-4 rounded-xl border text-sm flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/40 border-rose-800 text-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 sm:p-8 space-y-6">
        {/* Profile Card Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-stone-800">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-stone-950 font-black text-2xl shadow-lg shadow-emerald-950">
            {userProfile?.name?.charAt(0).toUpperCase() || currentUser?.email?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{userProfile?.name || 'Member'}</h2>
            <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
              <Mail className="w-3.5 h-3.5" />
              <span>{userProfile?.email || currentUser?.email}</span>
            </div>
            <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-semibold">
              <Shield className="w-3 h-3" />
              <span>Verified Firebase UID: {currentUser?.uid.slice(0, 8)}...</span>
            </div>
          </div>
        </div>

        {/* Update Form */}
        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                <User className="w-4 h-4" />
              </div>
              <input
                id="profile-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
              College / University / Organization
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                <GraduationCap className="w-4 h-4" />
              </div>
              <input
                id="profile-college-input"
                type="text"
                required
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Short Bio or Campus Role
            </label>
            <textarea
              id="profile-bio-input"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Mechanical engineering sophomore interested in scrap electronics and 3D printing."
              className="w-full px-4 py-2.5 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              id="profile-save-btn"
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-sm transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
