'use client';

import { useUser } from '@/contexts/UserContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface AuthWrapperProps {
  children: React.ReactNode;
}

// หน้าที่ไม่ต้องการ authentication
const PUBLIC_ROUTES = ['/'];

export const AuthWrapper = ({ children }: AuthWrapperProps) => {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    // ถ้าไม่ใช่หน้า public และไม่มี user ให้ redirect ไปหน้า login
    if (!isLoading && !user && !isPublicRoute) {
      router.push('/');
    }
  }, [user, isLoading, router, pathname, isPublicRoute]);

  // แสดง loading spinner สำหรับหน้าที่ต้อง auth
  if (isLoading && !isPublicRoute) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // ถ้าไม่ใช่หน้า public แต่ไม่มี user ก็ไม่แสดงอะไร (จะ redirect อยู่แล้ว)
  if (!user && !isPublicRoute) {
    return null;
  }

  return <>{children}</>;
};
