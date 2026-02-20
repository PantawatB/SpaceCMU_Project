export interface NotificationSettings {
  sms: boolean;
  push: boolean;
  email: boolean;
}

export interface PrivacySettings {
  showEmail: boolean;
  allowMessages: boolean;
  profileVisible: boolean;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  studentId: string | null;
  faculty: string | null;
  major: string | null;
  year: number | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  friendsCount: number;
  role: 'user' | 'admin' | 'god';
  status: 'active' | 'inactive' | 'suspended';
  lastActiveAt: string | null;
  notificationSettings: NotificationSettings;
  privacySettings: PrivacySettings;
  theme: 'light' | 'dark';
  language: string;
  isAnonymous: boolean;
  parentUserId: string | null;
  createdAt: string;
  updatedAt: string;
  anonymousUserId?: string;
  friendshipStatus?: 'none' | 'friends' | 'pending' | 'blocked';
  isPendingFrom?: 'me' | 'them';
  mutualFriendsCount?: number;
}

export interface AnonymousAccount {
  id: string;
  username: string;
  firstName: string;
  avatarUrl: string;
}

export interface UserMeResponse {
  user: User;
  activeUser: User;
  activeMode: 'PUBLIC' | 'ANONYMOUS';
  anonymousAccount: AnonymousAccount;
}
