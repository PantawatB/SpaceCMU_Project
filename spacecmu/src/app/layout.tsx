import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/contexts/UserContext";
import { TokenErrorProvider } from "@/contexts/TokenErrorContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { AuthWrapper } from "@/components/AuthWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SpaceCMU",
  description: "Social media platform for CMU students and staff",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SpaceCMU",
  },
  icons: {
    apple: [
      { url: "/SpaceCMUlogo1.png", sizes: "192x192", type: "image/png" },
      { url: "/SpaceCMUlogo2.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* PWA / Apple Home Screen */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SpaceCMU" />
        <link rel="apple-touch-icon" href="/SpaceCMUlogo1.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/SpaceCMUlogo1.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/SpaceCMUlogo2.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <UserProvider>
          <TokenErrorProvider>
            <ToastProvider>
              <AuthWrapper>
                {children}
              </AuthWrapper>
            </ToastProvider>
          </TokenErrorProvider>
        </UserProvider>
      </body>
    </html>
  );
}
