'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserMeResponse, AnonymousAccount } from '@/types/user';
import { apiService, type MyOfficialAccount } from '@/lib/api';

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
  const [user, setUser] = useState<User | null>(null);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [activeMode, setActiveMode] = useState<'PUBLIC' | 'ANONYMOUS' | null>(null);
  const [anonymousAccount, setAnonymousAccount] = useState<AnonymousAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [officialMode, setOfficialMode] = useState<OfficialAccountMode | null>(null);
  const [isSwitchingToOfficial, setIsSwitchingToOfficial] = useState(false);

  const fetchUser = async (silent: boolean = false) => {
    try {
      if (!silent) setIsLoading(true);
      setError(null);
      const data: UserMeResponse = await apiService.getCurrentUser();
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
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
      setUser(null);
      setActiveUser(null);
      setActiveMode(null);
      setAnonymousAccount(null);
      setOfficialMode(null);
    } finally {
      if (!silent) setIsLoading(false);
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
      const result = await apiService.exitOfficialAccount();
      setActiveUser(result.activeUser);
      setOfficialMode(null);
    } catch (err) {
      console.error('Failed to exit official mode:', err);
      setError(err instanceof Error ? err.message : 'Failed to exit official mode');
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

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
