import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

/**
 * Provides: session, user, profile (from GET /api/me), loading, profileError,
 * signIn(email, password) → profile, signOut(), refreshProfile().
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const profileFor = useRef(null); // user id the current profile belongs to

  const loadProfile = useCallback(async (userId) => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const { profile: loaded } = await api('/me');
      profileFor.current = userId;
      setProfile(loaded);
      return loaded;
    } catch (error) {
      profileFor.current = null;
      setProfile(null);
      setProfileError(error.message);
      throw error;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Session: initial value + every login, logout and token refresh.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });
    // Keep this callback synchronous: calling Supabase from inside it can deadlock.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Profile: load once per signed-in user; clear on sign-out.
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    if (!userId) {
      profileFor.current = null;
      setProfile(null);
      setProfileError(null);
      return;
    }
    if (profileFor.current !== userId) loadProfile(userId).catch(() => {});
  }, [userId, loadProfile]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setSession(data.session);
    return loadProfile(data.user.id);
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    profileFor.current = null;
    setSession(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(() => (userId ? loadProfile(userId) : Promise.resolve(null)), [userId, loadProfile]);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    profileError,
    // Still loading while the session is unknown, or a signed-in user's profile hasn't arrived yet.
    loading: sessionLoading || profileLoading || (!!userId && !profile && !profileError),
    signIn,
    signOut,
    refreshProfile,
  }), [session, profile, profileError, sessionLoading, profileLoading, userId, signIn, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
