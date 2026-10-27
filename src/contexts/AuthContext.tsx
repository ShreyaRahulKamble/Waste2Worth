import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../services/firebase.ts';
import { getUserProfile, createUserProfile } from '../services/db.ts';
import type { UserProfile } from '../types/index.ts';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (name: string, email: string, pass: string, college: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithDemo: (type?: 'student' | 'partner') => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const ensureUserProfile = async (
    user: User,
    fallbackName?: string,
    fallbackCollege?: string
  ): Promise<UserProfile> => {
    try {
      let profile = await getUserProfile(user.uid);
      if (!profile) {
        profile = await createUserProfile(user.uid, {
          name: fallbackName || user.displayName || user.email?.split('@')[0] || 'Eco Member',
          email: user.email || '',
          college: fallbackCollege || 'Campus Network',
        });
      }
      return profile;
    } catch (err) {
      console.warn('Could not sync profile with Firestore immediately, providing in-memory profile:', err);
      return {
        uid: user.uid,
        name: fallbackName || user.displayName || user.email?.split('@')[0] || 'Eco Member',
        email: user.email || '',
        college: fallbackCollege || 'Campus Network',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      const profile = await ensureUserProfile(auth.currentUser);
      setUserProfile(profile);
    } else {
      setUserProfile(null);
    }
  };

  useEffect(() => {
    // Check for any Google OAuth redirect result when running in standalone top-level window
    getRedirectResult(auth)
      .then(async (cred) => {
        if (cred?.user) {
          setCurrentUser(cred.user);
          const profile = await ensureUserProfile(cred.user);
          setUserProfile(profile);
        }
      })
      .catch((err) => {
        if (err?.code !== 'auth/popup-closed-by-user') {
          console.warn('Redirect auth handler warning:', err);
        }
      });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const profile = await ensureUserProfile(user);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    setCurrentUser(cred.user);
    const profile = await ensureUserProfile(cred.user);
    setUserProfile(profile);
  };

  const signup = async (name: string, email: string, pass: string, college: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }
    setCurrentUser(cred.user);
    const profile = await ensureUserProfile(cred.user, name.trim(), college.trim());
    setUserProfile(profile);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const cred = await signInWithPopup(auth, provider);
      setCurrentUser(cred.user);
      const profile = await ensureUserProfile(cred.user);
      setUserProfile(profile);
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked') {
        // If outside an iframe (top window), attempt redirect fallback seamlessly
        if (typeof window !== 'undefined' && window.self === window.top) {
          console.warn('Popup blocked in top-level window. Attempting redirect fallback...');
          await signInWithRedirect(auth, provider);
          return;
        }
      }
      throw err;
    }
  };

  const loginWithDemo = async (type: 'student' | 'partner' = 'student') => {
    const isStudent = type === 'student';
    const email = isStudent ? 'alex.chen@greentech.edu' : 'sam.taylor@metropoly.edu';
    const password = isStudent ? 'EcoLeader2026!' : 'Recycle2026!';
    const name = isStudent ? 'Alex Chen' : 'Sam Taylor';
    const college = isStudent ? 'Green Tech Institute' : 'Metro Polytechnic';

    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/invalid-credential' ||
        err?.code === 'auth/wrong-password'
      ) {
        // Create demo account if not already registered in Firebase Auth
        try {
          cred = await createUserWithEmailAndPassword(auth, email, password);
          if (cred.user) {
            await updateProfile(cred.user, { displayName: name });
          }
        } catch (createErr: any) {
          if (createErr?.code === 'auth/email-already-in-use') {
            throw new Error(`Demo account ${email} exists with custom password. Please use standard email login.`);
          }
          throw createErr;
        }
      } else {
        throw err;
      }
    }

    if (cred?.user) {
      setCurrentUser(cred.user);
      const profile = await ensureUserProfile(cred.user, name, college);
      setUserProfile(profile);
    }
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const logout = async () => {
    await fbSignOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        login,
        signup,
        loginWithGoogle,
        loginWithDemo,
        sendPasswordReset,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

