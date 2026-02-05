"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import TokenErrorPopup from "@/components/TokenErrorPopup";

interface TokenErrorContextType {
  showTokenError: () => void;
}

const TokenErrorContext = createContext<TokenErrorContextType | undefined>(undefined);

// หน้าที่ไม่ต้องการ authentication (ไม่แสดง popup error)
const PUBLIC_ROUTES = ['/', '/login', '/register', '/auth'];

export function TokenErrorProvider({ children }: { children: ReactNode }) {
  const [isTokenErrorOpen, setIsTokenErrorOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleTokenError = () => {
      // ตรวจสอบว่าอยู่ในหน้า public หรือไม่
      const isPublicRoute = PUBLIC_ROUTES.some(route => 
        pathname === route || pathname.startsWith('/auth')
      );
      
      // ถ้าอยู่ในหน้า public ไม่ต้องแสดง popup
      if (!isPublicRoute) {
        setIsTokenErrorOpen(true);
      }
    };

    // Listen for custom token error events
    window.addEventListener('tokenError', handleTokenError);
    
    return () => {
      window.removeEventListener('tokenError', handleTokenError);
    };
  }, [pathname]);

  const showTokenError = () => {
    setIsTokenErrorOpen(true);
  };

  return (
    <TokenErrorContext.Provider value={{ showTokenError }}>
      {children}
      <TokenErrorPopup 
        isOpen={isTokenErrorOpen} 
        onClose={() => setIsTokenErrorOpen(false)} 
      />
    </TokenErrorContext.Provider>
  );
}

export function useTokenError() {
  const context = useContext(TokenErrorContext);
  if (context === undefined) {
    throw new Error("useTokenError must be used within a TokenErrorProvider");
  }
  return context;
}
