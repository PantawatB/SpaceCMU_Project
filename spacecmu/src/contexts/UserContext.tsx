'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserMeResponse, AnonymousAccount } from '@/types/user';
import { apiService } from '@/lib/api';

interface UserContextType {
  user: User | null;
  activeUser: User | null;
  activeMode: 'PUBLIC' | 'ANONYMOUS' | null;
  anonymousAccount: AnonymousAccount | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: (silent?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [activeMode, setActiveMode] = useState<'PUBLIC' | 'ANONYMOUS' | null>(null);
  const [anonymousAccount, setAnonymousAccount] = useState<AnonymousAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);
      const data: UserMeResponse = await apiService.getCurrentUser();
      setUser(data.user);
      setActiveUser(data.activeUser);
      setActiveMode(data.activeMode);
      setAnonymousAccount(data.anonymousAccount);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
      setUser(null);
      setActiveUser(null);
      setActiveMode(null);
      setAnonymousAccount(null);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
      setUser(null);
      setActiveUser(null);
      setActiveMode(null);
      setAnonymousAccount(null);
      // Redirect to home page
      window.location.href = '/';
    } catch (err) {
      console.error('Failed to logout:', err);
      setError(err instanceof Error ? err.message : 'Failed to logout');
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
