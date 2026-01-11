'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserMeResponse } from '@/types/user';
import { apiService } from '@/lib/api';

interface UserContextType {
  user: User | null;
  anonymousUser: User | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [anonymousUser, setAnonymousUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data: UserMeResponse = await apiService.getCurrentUser();
      setUser(data.user);
      setAnonymousUser(data.anonymousUser);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
      setUser(null);
      setAnonymousUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
      setUser(null);
      setAnonymousUser(null);
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
    anonymousUser,
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
