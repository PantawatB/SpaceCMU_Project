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
  role: 'user' | 'admin' | 'god' | 'official_account';
  status: 'active' | 'inactive' | 'suspended' | 'banned';
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
  lastName?: string;
  avatarUrl: string;
  status?: 'active' | 'banned';
}

export interface OfficialAccountInfo {
  id: string;
  name: string;
  username: string;
  faculty: string;
  userId: string;
  avatarUrl: string | null;
  status?: 'active' | 'banned' | null;
}

export interface UserMeResponse {
  user: User;
  activeUser: User;
  activeMode: 'PUBLIC' | 'ANONYMOUS';
  anonymousAccount: AnonymousAccount;
  officialAccount: OfficialAccountInfo | null;
}
