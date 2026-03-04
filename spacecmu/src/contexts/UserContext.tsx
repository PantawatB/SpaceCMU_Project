'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { User, UserMeResponse, AnonymousAccount } from '@/types/user';
import { apiService, type MyOfficialAccount } from '@/lib/api';

// หน้าที่ไม่ต้อง fetch user (ไม่มี session)
const PUBLIC_ROUTES = ['/', '/Banned'];

export interface OfficialAccountMode {
  accountId: string;
  name: string;
  username: string;
  avatarLetter: string;
  faculty: string;
  avatarUrl?: string | null;
}

interface UserContextType {
  user: User | null;
  activeUser: User | null;
  activeMode: 'PUBLIC' | 'ANONYMOUS' | null;
  anonymousAccount: AnonymousAccount | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: (silent?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  officialMode: OfficialAccountMode | null;
  switchToOfficial: (acc: MyOfficialAccount) => Promise<void>;
  exitOfficialMode: () => Promise<void>;
  isSwitchingToOfficial: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  const [user, setUser] = useState<User | null>(null);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [activeMode, setActiveMode] = useState<'PUBLIC' | 'ANONYMOUS' | null>(null);
  const [anonymousAccount, setAnonymousAccount] = useState<AnonymousAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [officialMode, setOfficialMode] = useState<OfficialAccountMode | null>(null);
  const [isSwitchingToOfficial, setIsSwitchingToOfficial] = useState(false);

  // Flag to stop all further API calls once we've decided to redirect to /Banned
  const isBanRedirectingRef = useRef(false);

  const fetchUser = async (silent: boolean = false) => {
    // Don't fire any more requests if we're already redirecting to /Banned
    if (isBanRedirectingRef.current) return;

    try {
      if (!silent) setIsLoading(true);
      setError(null);
      const data: UserMeResponse = await apiService.getCurrentUser();

      // If a ban-redirect happened while we were awaiting, bail out silently
      if (isBanRedirectingRef.current) return;

      setUser(data.user);
      setActiveUser(data.activeUser);
      setActiveMode(data.activeMode);
      setAnonymousAccount(data.anonymousAccount);
      if (data.officialAccount) {
        setOfficialMode({
          accountId: data.officialAccount.id,
          name: data.officialAccount.name,
          username: data.officialAccount.username,
          avatarLetter: data.officialAccount.name[0].toUpperCase(),
          faculty: data.officialAccount.faculty,
          avatarUrl: data.officialAccount.avatarUrl,
        });
      } else {
        setOfficialMode(null);
      }

      // ──────────────────────────────────────────────────────────────
      // Ban check 1: if BOTH public & anonymous are banned → force logout
      // ──────────────────────────────────────────────────────────────
      const publicBanned = data.user?.status === 'banned';
      const anonBanned = data.anonymousAccount?.status === 'banned';
      if (publicBanned && anonBanned) {
        // Set flag FIRST so the polling interval's next tick (if any) is a no-op
        isBanRedirectingRef.current = true;
        // Clear all state
        setUser(null);
        setActiveUser(null);
        setActiveMode(null);
        setAnonymousAccount(null);
        setOfficialMode(null);
        try { await apiService.logout(); } catch { /* ignore */ }
        window.location.href = '/Banned';
        return;
      }

      // ──────────────────────────────────────────────────────────────
      // Ban check 2: if currently in official account mode and it got banned
      // → exit official mode silently and reload
      // ──────────────────────────────────────────────────────────────
      if (data.officialAccount?.status === 'banned') {
        setOfficialMode(null);
        try { await apiService.exitOfficialAccount(); } catch { /* ignore */ }
        window.location.reload();
        return;
      }
    } catch (err) {
      // If we're already redirecting to /Banned, swallow every error silently —
      // 401 "No token provided" is expected because the session was just destroyed.
      if (isBanRedirectingRef.current) return;

      // For silent polls (interval), swallow 401 errors silently too — they just
      // mean the user's session expired normally; no need to spam the console or
      // trigger the TokenError popup.
      if (silent && err instanceof Error && err.message === 'No token provided') return;

      console.error('Failed to fetch user:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
      setUser(null);
      setActiveUser(null);
      setActiveMode(null);
      setAnonymousAccount(null);
      setOfficialMode(null);
    } finally {
      if (!silent && !isBanRedirectingRef.current) setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
      setUser(null);
      setActiveUser(null);
      setActiveMode(null);
      setAnonymousAccount(null);
      setOfficialMode(null);
      window.location.href = '/';
    } catch (err) {
      console.error('Failed to logout:', err);
      setError(err instanceof Error ? err.message : 'Failed to logout');
    }
  };

  const switchToOfficial = async (acc: MyOfficialAccount) => {
    setIsSwitchingToOfficial(true);
    try {
      const result = await apiService.switchToOfficialAccount(acc.id);
      setActiveUser(result.activeUser);
      setOfficialMode({
        accountId: acc.id,
        name: acc.name,
        username: acc.username,
        avatarLetter: acc.name[0].toUpperCase(),
        faculty: acc.faculty,
        avatarUrl: acc.avatarUrl ?? null,
      });
    } catch (err) {
      console.error('Failed to switch to official:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch to official account');
    } finally {
      setTimeout(() => setIsSwitchingToOfficial(false), 1400);
    }
  };

  const exitOfficialMode = async () => {
    try {
      await apiService.exitOfficialAccount();
      // Refresh all user data to restore correct activeMode (PUBLIC/ANONYMOUS) and activeUser
      await fetchUser(true);
    } catch (err) {
      console.error('Failed to exit official mode:', err);
      setError(err instanceof Error ? err.message : 'Failed to exit official mode');
    }
  };

  useEffect(() => {
    // ไม่ fetch บนหน้า public (/, /Banned) — ไม่มี session อยู่แล้ว
    if (isPublicRoute) {
      setIsLoading(false);
      return;
    }
    fetchUser();
  }, [isPublicRoute]);

  // ──────────────────────────────────────────────────────────────────────
  // Periodic ban check: re-fetch /api/auth/me every 30 s while logged in.
  // This detects a ban that was applied server-side without requiring the
  // user to refresh the page.
  // Uses getCurrentUserSilent() so a post-ban 401 never triggers the
  // "Token expired" popup or console errors.
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || isPublicRoute) return; // Only poll when authenticated and not on public pages

    const interval = setInterval(async () => {
      if (isBanRedirectingRef.current) {
        clearInterval(interval);
        return;
      }
      // Use the silent variant — swallows 401 tokenError events entirely
      try {
        const data = await apiService.getCurrentUserSilent();
        if (isBanRedirectingRef.current) return;

        // ── 1. Both user identities banned → logout + /Banned ──
        const publicBanned = data.user?.status === 'banned';
        const anonBanned = data.anonymousAccount?.status === 'banned';
        if (publicBanned && anonBanned) {
          isBanRedirectingRef.current = true;
          clearInterval(interval);
          setUser(null);
          setActiveUser(null);
          setActiveMode(null);
          setAnonymousAccount(null);
          setOfficialMode(null);
          try { await apiService.logout(); } catch { /* ignore */ }
          window.location.href = '/Banned';
          return;
        }

        // ── 2. Currently in official account mode and it got banned ──
        if (data.officialAccount?.status === 'banned') {
          // Exit official mode silently → backend clears officialAccountId from session
          try { await apiService.exitOfficialAccount(); } catch { /* ignore */ }
          // Reload so the page reflects the restored PUBLIC/ANONYMOUS mode
          window.location.reload();
          return;
        }
      } catch {
        // 401 after ban-logout — swallow silently, the ref guard stops retries
      }
    }, 30_000); // 30 seconds

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!user]); // restart interval when login/logout happens

  const value: UserContextType = {
    user,
    activeUser,
    activeMode,
    anonymousAccount,
    isLoading,
    error,
    refreshUser: fetchUser,
    logout,
    officialMode,
    switchToOfficial,
    exitOfficialMode,
    isSwitchingToOfficial,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
