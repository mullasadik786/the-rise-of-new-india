import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { SupportedLang } from '../lib/i18n';

export interface RegionConfig {
  id: number;
  code: string;
  district: string;
  state: string;
  stateCode: string;
  languages: string[];
  departments: string[];
  isActive: boolean;
}

export interface AppUser {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  role: string;
  regionCode: string;
  preferredLanguage: string;
  dpdpConsentGiven: boolean;
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  dbUser: AppUser | null;
  idToken: string | null;
  loading: boolean;
  authError: string | null;
  regions: RegionConfig[];
  selectedRegion: string;
  setSelectedRegion: (code: string) => void;
  language: SupportedLang;
  setLanguage: (lang: SupportedLang) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<AppUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [regions, setRegions] = useState<RegionConfig[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('mp-indore');
  const [language, setLanguage] = useState<SupportedLang>('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const loadRegions = useCallback(async () => {
    try {
      const res = await fetch('/api/regions');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.regions)) {
          setRegions(data.regions);
        }
      }
    } catch {
      // fallback handled by UI
    }
  }, []);

  useEffect(() => {
    loadRegions();
  }, [loadRegions]);

  const syncBackendProfile = useCallback(async (token: string) => {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Profile sync failed' }));
      throw new Error(err.error || 'Profile sync failed');
    }
    const data = await res.json();
    setDbUser(data.user);
    if (data.user?.regionCode) setSelectedRegion(data.user.regionCode);
    if (data.user?.preferredLanguage === 'hi' || data.user?.preferredLanguage === 'te' || data.user?.preferredLanguage === 'en') {
      setLanguage(data.user.preferredLanguage);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setAuthError(null);
      if (!user) {
        setFirebaseUser(null);
        setDbUser(null);
        setIdToken(null);
        setLoading(false);
        return;
      }
      try {
        setFirebaseUser(user);
        const token = await user.getIdToken();
        setIdToken(token);
        await syncBackendProfile(token);
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Unable to sync session');
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [syncBackendProfile]);

  const loginWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      setIdToken(token);
      await syncBackendProfile(token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in could not be completed');
    }
  }, [syncBackendProfile]);

  const logout = useCallback(async () => {
    await signOut(auth);
    setDbUser(null);
    setIdToken(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!firebaseUser) return;
    const token = await firebaseUser.getIdToken(true);
    setIdToken(token);
    await syncBackendProfile(token);
  }, [firebaseUser, syncBackendProfile]);

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      let activeToken = idToken;
      if (firebaseUser) {
        activeToken = await firebaseUser.getIdToken();
        if (activeToken !== idToken) setIdToken(activeToken);
      }
      const headers = new Headers(options.headers || {});
      if (activeToken) {
        headers.set('Authorization', `Bearer ${activeToken}`);
      }
      if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      return fetch(url, { ...options, headers });
    },
    [firebaseUser, idToken]
  );

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        dbUser,
        idToken,
        loading,
        authError,
        regions,
        selectedRegion,
        setSelectedRegion,
        language,
        setLanguage,
        theme,
        toggleTheme,
        loginWithGoogle,
        logout,
        refreshProfile,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
