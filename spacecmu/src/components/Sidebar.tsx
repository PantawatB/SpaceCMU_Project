"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";import { useUser } from "@/contexts/UserContext";
import { apiService } from "@/lib/api";

export interface SidebarMenuItem {
  name: string;
  icon: React.ReactNode;
  link?: string;
}

interface SidebarProps {
  menuItems?: SidebarMenuItem[]; // ทำให้เป็น optional
}

const DEFAULT_AVATAR = "/default-avatar.svg";

const profiles = [
  {
    type: "PUBLIC" as const,
    name: "User",
    username: "@user",
    avatar: DEFAULT_AVATAR,
    bg: "bg-gradient-to-tr from-purple-400 via-cyan-300 to-yellow-300",
  },
  {
    type: "ANONYMOUS" as const,
    name: "Anonymous",
    username: "@anonymous",
    avatar: DEFAULT_AVATAR,
    bg: "bg-gray-400",
  },
];

export default function Sidebar({ menuItems }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, activeUser, activeMode, anonymousAccount, refreshUser, logout: logoutFromContext, officialMode, exitOfficialMode, isSwitchingToOfficial } = useUser();
  
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [reportForm, setReportForm] = useState({
    name: "",
    issue: "",
    attachedFile: null as File | null,
  });

  // Determine active profile index based on activeMode
  const activeProfile = activeMode === "ANONYMOUS" ? 1 : 0;

  // Default menu items ถ้าไม่ได้ส่งมา
  const defaultMenuItems: SidebarMenuItem[] = [
    {
      name: "Profile",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <circle
            cx="12"
            cy="8"
            r="4"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <path
            stroke="currentColor"
            strokeWidth="2"
            d="M4 20c0-4 4-6 8-6s8 2 8 6"
            fill="none"
          />
        </svg>
      ),
      link: "/Profile",
    },
    {
      name: "Feeds",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          {/* กระดาษ */}
          <path d="M6 3h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          {/* เส้นข้อความด้านซ้าย */}
          <path d="M8 7h5" />
          <path d="M8 10h5" />
          <path d="M8 13h5" />
          <path d="M8 17h8" />
        </svg>
      ),
      link: "/Feeds",
    },
    {
      name: "Market",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <circle
            cx="8"
            cy="21"
            r="1"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx="19"
            cy="21"
            r="1"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <path
            stroke="currentColor"
            strokeWidth="2"
            d="M2.05 2.05h2l2.66 12.42a2 2 0 002 1.58h9.78a2 2 0 001.95-1.57l1.65-7.43H5.12"
            fill="none"
          />
        </svg>
      ),
      link: "/Market",
    },
    {
      name: "Chat",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
      link: "/Chat",
    },
    {
      name: "Friends",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <circle
            cx="8"
            cy="8"
            r="3"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx="16"
            cy="8"
            r="3"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <path
            stroke="currentColor"
            strokeWidth="2"
            d="M2 20c0-3 3-5 6-5s6 2 6 5"
            fill="none"
          />
          <path
            stroke="currentColor"
            strokeWidth="2"
            d="M12 20c0-3 3-5 6-5s6 2 6 5"
            fill="none"
          />
        </svg>
      ),
      link: "/Friends",
    },
    {
      name: "Calendar",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          className="w-5 h-5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />

          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="16" y1="2" x2="16" y2="6" />

          <line x1="3" y1="10" x2="21" y2="10" />

          {/* inner bars */}
          <line x1="7" y1="14" x2="17" y2="14" />
          <line x1="7" y1="17" x2="12" y2="17" />
        </svg>
      ),
      link: "/Calendar",
    },
    {
      name: "Setting",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <circle
            cx="12"
            cy="12"
            r="3"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <path
            stroke="currentColor"
            strokeWidth="2"
            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h.09a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51h.09a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.09a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
          />
        </svg>
      ),
      link: "/Setting",
    },
    ...(activeUser?.role === "admin" || activeUser?.role === "god"
      ? [
          {
            name: "Admin",
            icon: (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
                />
              </svg>
            ),
            link: "/Admin",
          },
        ]
      : []),
    ...(activeUser?.role === "god"
      ? [
          {
            name: "God",
            icon: (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3l1.5 4.5H18l-3.75 2.7 1.5 4.5L12 12l-3.75 2.7 1.5-4.5L6 7.5h4.5L12 3z"
                />
                <circle cx="12" cy="20" r="1.5" fill="currentColor" stroke="none" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.5c0-1.657 1.343-2.5 3-2.5s3 .843 3 2.5" />
              </svg>
            ),
            link: "/God",
          },
        ]
      : []),
  ];

  const currentMenuItems = menuItems || defaultMenuItems;

  const tutorialSteps = [
    {
      title: "ยินดีต้อนรับสู่ SpaceCMU!",
      content:
        "แพลตฟอร์มโซเชียลมีเดีย สำหรับนักศึกษาและบุคลากร มหาวิทยาลัยเชียงใหม่ ที่จะช่วยให้คุณเชื่อมต่อกับเพื่อนๆ และแชร์ประสบการณ์ต่างๆ",
      image: "/SpaceCMUlogo1.png",
    },
    {
      title: "Profile",
      content:
        "จัดการโปรไฟล์ของคุณ เปลี่ยนสถานะเป็น Public หรือ Anonymous ได้ตามต้องการ",
      image: "/default-avatar.svg",
    },
    {
      title: "Feeds",
      content: "ดูโพสต์และการอัปเดตจากเพื่อนๆ พร้อมกับแชร์เรื่องราวของคุณเอง",
      image: "/cat-post.jpg",
    },
    {
      title: "Market",
      content: "ตลาดออนไลน์สำหรับซื้อขายสิ่งของระหว่างนักศึกษา",
      image: "/shoe.webp",
    },
    {
      title: "Friends",
      content: "ค้นหาและเชื่อมต่อกับเพื่อนๆ นักศึกษา CMU",
      image: "/tanjiro_with_family.webp",
    },
    {
      title: "Calendar",
      content: "จัดการตารางเรียน กิจกรรม และนัดหมายต่างๆ ในรูปแบบปฏิทิน",
      image: "/cmu.png",
    },
    {
      title: "แจ้งปัญหา",
      content: "หากพบปัญหาหรือต้องการแนะนำ กรุณาแจ้งให้ทีมพัฒนาทราบ",
      image: "/cmu.png",
    },
  ];

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ส่งข้อมูลไปยัง backend หรือ email service
    console.log("Report submitted:", reportForm);
    alert("ส่งรายงานปัญหาเรียบร้อยแล้ว ขอบคุณสำหรับการแจ้ง!");
    setShowTutorial(false);
    setReportForm({ name: "", issue: "", attachedFile: null });
  };

  // Switch mode handler
  const handleSwitchMode = async (newMode: "PUBLIC" | "ANONYMOUS") => {
    if (isSwitchingMode || activeMode === newMode) return;

    setIsSwitchingMode(true);
    
    try {
      await apiService.switchMode(newMode);
      // Reload the page so all page-level state (chat rooms, messages, etc.) refreshes
      window.location.reload();
    } catch (err) {
      console.error('Failed to switch mode:', err);
      
      // Show error toast
      const message = err instanceof Error ? err.message : 'ไม่สามารถเปลี่ยนโหมดได้ กรุณาลองใหม่อีกครั้ง';
      setErrorMessage(message);
      setShowErrorToast(true);
      
      // Auto hide toast after 3 seconds
      setTimeout(() => {
        setShowErrorToast(false);
      }, 3000);
      
      // UI will automatically revert because refreshUser() was not successful
      // The activeMode state remains unchanged
    } finally {
      setIsSwitchingMode(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await logoutFromContext();
  };

  // Handle menu item click (especially for Market page)
  const handleMenuItemClick = async (item: SidebarMenuItem) => {
    // Close sidebar on mobile
    setIsSidebarOpen(false);

    // If navigating to Market and in ANONYMOUS mode, show warning and switch
    if (item.name === "Market" && activeMode === "ANONYMOUS") {
      try {
        // Show warning toast
        setErrorMessage('ไม่สามารถใช้งาน Market ในโหมด Anonymous ระบบจะเปลี่ยนเป็นโหมด Public');
        setShowErrorToast(true);
        
        // Auto hide toast after 4 seconds
        setTimeout(() => {
          setShowErrorToast(false);
        }, 4000);

        // Switch to PUBLIC mode
        await apiService.switchMode("PUBLIC");
        await refreshUser(true); // Silent refresh
      } catch (err) {
        console.error('Failed to switch to PUBLIC mode:', err);
      }
    }
  };

  return (
    <>
      {/* Hamburger Menu Button for Mobile - Only shown when sidebar is closed */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-all"
          aria-label="Open menu"
        >
          <svg
            className="w-6 h-6 text-gray-800"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}

      {/* Backdrop for Mobile */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen
          w-64 min-w-[256px] max-w-[256px]
          p-6 flex flex-col justify-between
          bg-white
          transition-transform duration-300 ease-in-out
          z-40
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Close Button - Curved tab design (Mobile only, shown only when sidebar is open) */}
        {isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden absolute -right-11 top-0 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 shadow-lg border border-gray-200 transition-all duration-300 group overflow-hidden"
            style={{
              width: '44px',
              height: '100px',
              borderTopRightRadius: '30px',
              borderBottomRightRadius: '30px',
              borderLeft: 'none',
              borderTopLeftRadius: '0',
              borderBottomLeftRadius: '0',
            }}
            aria-label="Close menu"
          >
            <div className="flex items-center justify-center h-full pl-2">
              <svg
                className="w-5 h-5 transform transition-transform group-hover:scale-110"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </div>
          </button>
        )}

        <div>
        {/* Logo */}
        <div className="flex items-center gap-2 mb-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/SpaceCMUlogo1.png"
            alt="SpaceCMU Logo"
            width={40}
            height={40}
            className="object-contain"
          />
          <span className="text-xl font-bold text-gray-800">SpaceCMU</span>
          <button
            onClick={() => setShowTutorial(true)}
            className="ml-2 w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center border border-black/60 shadow-sm hover:shadow active:shadow-inner transition-all duration-200 group"
            title="Tutorial & Help"
          >
            <span className="text-gray-600 group-hover:text-gray-800 text-sm font-bold">
              ?
            </span>
          </button>
        </div>
        {/* Profile Section */}
        <div className="flex gap-4 items-center mb-8 relative min-h-[100px]">
          {/* ── Official Mode: single merged avatar ── */}
          {officialMode && !isSwitchingToOfficial ? (
            <div className="flex flex-col items-center w-full">
              <div className="relative w-14 h-14 shrink-0">
                <div className="w-14 h-14 rounded-full overflow-hidden shadow-lg bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={officialMode.avatarUrl ? (apiService.getImageUrl(officialMode.avatarUrl) ?? DEFAULT_AVATAR) : DEFAULT_AVATAR}
                    alt={officialMode.name}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                  />
                </div>
                <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow" />
              </div>
              <div className="mt-2 text-sm font-bold text-gray-900 truncate max-w-[170px] text-center">
                {officialMode.name}
              </div>
              <div className="text-xs text-indigo-500 font-medium">@{officialMode.username}</div>
              <div className="mt-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                Official Mode
              </div>
            </div>
          ) : officialMode && isSwitchingToOfficial ? (
            /* ── Switching animation: Public + Anonymous bubble รวมกันเป็น Official ── */
            <div className="relative flex items-center justify-center w-full h-[120px] overflow-visible">
              {/* Public avatar — เริ่มซ้าย, ลอยเข้ากลาง แล้ว fade */}
              <div
                className="absolute flex flex-col items-center"
                style={{ animation: "mergeLeft 1.2s cubic-bezier(0.4,0,0.2,1) forwards" }}
              >
                <div className="w-14 h-14 rounded-full bg-linear-to-tr from-purple-400 via-cyan-300 to-yellow-300 p-[3px] shadow-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={apiService.getImageUrl(user?.avatarUrl) ?? DEFAULT_AVATAR}
                    alt="public"
                    className="w-full h-full rounded-full object-cover border-2 border-white"
                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                  />
                </div>
              </div>
              {/* Anonymous avatar — เริ่มขวา, ลอยเข้ากลาง แล้ว fade */}
              <div
                className="absolute flex flex-col items-center"
                style={{ animation: "mergeRight 1.2s cubic-bezier(0.4,0,0.2,1) forwards" }}
              >
                <div className="w-14 h-14 rounded-full bg-gray-400 p-[3px] shadow-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={apiService.getImageUrl(anonymousAccount?.avatarUrl) ?? DEFAULT_AVATAR}
                    alt="anonymous"
                    className="w-full h-full rounded-full object-cover border-2 border-white"
                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                  />
                </div>
              </div>
              {/* Burst flash at center — indigo/purple */}
              <div
                className="absolute w-14 h-14 rounded-full opacity-0"
                style={{
                  background: "radial-gradient(circle, #818cf8 0%, #a855f7 60%, transparent 100%)",
                  animation: "burstCenter 1.2s ease-in-out forwards",
                }}
              />
            </div>
          ) : (
            /* ── Normal: 2 profile bubbles ── */
            profiles.map((profile, idx) => {
              const isPublic = idx === 0;
              const displayData = isPublic
                ? {
                    name: user ? `${user.firstName} ${user.lastName}` : profile.name,
                    username: user?.username ? `@${user.username}` : profile.username,
                    avatar: apiService.getImageUrl(user?.avatarUrl) ?? DEFAULT_AVATAR,
                  }
                : {
                    name: anonymousAccount?.firstName || profile.name,
                    username: anonymousAccount?.username ? `@${anonymousAccount.username}` : profile.username,
                    avatar: apiService.getImageUrl(anonymousAccount?.avatarUrl) ?? DEFAULT_AVATAR,
                  };

              return (
                <div
                  key={profile.type}
                  className={`flex flex-col items-center transition-all duration-300 ${
                    activeProfile === idx ? "" : "opacity-50 grayscale"
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center relative ${profile.bg} shadow-lg`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={displayData.avatar}
                      alt={displayData.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white"
                      onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                    />
                    {activeProfile === idx && (
                      <span className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow"></span>
                    )}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-gray-800">
                    {displayData.name}
                  </div>
                  <div className="text-xs text-gray-500">{displayData.username}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Menu */}
        <nav className="space-y-3">
          {currentMenuItems.map((item) => {
            // Check if this is Friends menu and we're already viewing a user profile
            const isFriendsWithUserId = item.name === "Friends" && pathname === "/Friends" && searchParams.get('userId');
            
            return item.link ? (
              isFriendsWithUserId ? (
                // Render as button instead of Link to prevent navigation
                <button
                  key={item.name}
                  onClick={() => handleMenuItemClick(item)}
                  className={`flex items-center gap-3 w-full rounded-lg px-3 py-2 transition font-medium text-left ${
                    pathname === item.link
                      ? "bg-white text-black shadow-md border border-gray-200 font-semibold"
                      : "text-gray-500 hover:text-black hover:bg-gray-100"
                  }`}
                >
                  <span className="w-5 h-5 flex items-center justify-center">
                    {item.icon}
                  </span>
                  <span
                    className={pathname === item.link ? "text-base" : "text-sm"}
                  >
                    {item.name}
                  </span>
                </button>
              ) : (
                <Link
                  href={item.link}
                  key={item.name}
                  onClick={() => handleMenuItemClick(item)}
                  className={`flex items-center gap-3 w-full rounded-lg px-3 py-2 transition font-medium text-left ${
                    pathname === item.link
                      ? "bg-white text-black shadow-md border border-gray-200 font-semibold"
                      : "text-gray-500 hover:text-black hover:bg-gray-100"
                  }`}
                >
                  <span className="w-5 h-5 flex items-center justify-center">
                    {item.icon}
                  </span>
                  <span
                    className={pathname === item.link ? "text-base" : "text-sm"}
                  >
                    {item.name}
                  </span>
                </Link>
              )
            ) : (
              <button
                key={item.name}
                className="flex items-center gap-3 w-full rounded-lg px-3 py-2 transition font-medium text-left text-gray-500 hover:text-black hover:bg-gray-100"
              >
                <span className="w-5 h-5 flex items-center justify-center">
                  {item.icon}
                </span>
                <span className="text-sm">{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>
      <div className="pt-6">
        {/* Official mode: big "Return to main account" button */}
        {officialMode ? (
          <button
            onClick={async () => { await exitOfficialMode(); window.location.reload(); }}
            className="w-full flex items-center gap-2.5 justify-center rounded-xl px-3 py-3 mb-3 font-bold text-sm transition-all
              bg-slate-800 text-white shadow-md hover:bg-slate-700 active:scale-[0.98]"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            กลับไปที่ Account หลัก
          </button>
        ) : (
          /* Toggle Profile Button */
          <div className="flex mb-6 rounded-lg overflow-hidden border border-gray-200">
            <button
              className={`flex-1 py-2 text-center font-semibold transition-all duration-300 ${
                activeProfile === 0
                  ? "bg-white text-black"
                  : "bg-gray-200 text-gray-500"
              } ${isSwitchingMode ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={() => handleSwitchMode("PUBLIC")}
              disabled={isSwitchingMode || activeMode === "PUBLIC"}
            >
              {isSwitchingMode && activeMode !== "PUBLIC" ? (
                <span className="inline-block animate-spin">⏳</span>
              ) : (
                "Public"
              )}
            </button>
            <button
              className={`flex-1 py-2 text-center font-semibold transition-all duration-300 ${
                activeProfile === 1
                  ? "bg-white text-black"
                  : "bg-gray-200 text-gray-500"
              } ${isSwitchingMode ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={() => handleSwitchMode("ANONYMOUS")}
              disabled={isSwitchingMode || activeMode === "ANONYMOUS"}
            >
              {isSwitchingMode && activeMode !== "ANONYMOUS" ? (
                <span className="inline-block animate-spin">⏳</span>
              ) : (
                "Anonymous"
              )}
            </button>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 justify-center bg-black text-white rounded-lg px-3 py-2 font-semibold hover:bg-gray-800"
        >
          <span className="w-5 h-5 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="white"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              {/* ประตู */}
              <path d="M4 3h8a2 2 0 012 2v14a2 2 0 01-2 2H4" />
              {/* ลูกบิด */}
              <circle cx="10" cy="12" r="0.5" fill="white" />
              {/* ลูกศรออก */}
              <path d="M14 12h7" />
              <path d="M18 9l3 3-3 3" />
            </svg>
          </span>
          <span className="text-base">Logout</span>
        </button>
      </div>

    </aside>

    {/* Tutorial Popup - rendered via Portal directly into document.body */}
    {showTutorial && createPortal(
      <div className="fixed inset-0 bg-black/10 backdrop-blur-md flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
        <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative shadow-2xl border border-gray-200 flex flex-col">
          <button
            onClick={() => {
              setShowTutorial(false);
              setTutorialStep(0);
            }}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-8">
            {tutorialStep < tutorialSteps.length - 1 ? (
              // Tutorial Steps
              <div>
                <div className="text-center mb-6">
                  <div className="text-xl font-bold text-gray-800 mb-3">
                    {tutorialSteps[tutorialStep].title}
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    {tutorialSteps[tutorialStep].content}
                  </p>
                  {tutorialSteps[tutorialStep].image && (
                    <div className="mb-4 mt-4 flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={tutorialSteps[tutorialStep].image}
                        alt={tutorialSteps[tutorialStep].title}
                        width={400}
                        height={300}
                        className="rounded-xl object-cover shadow-md max-w-full"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-center mb-6">
                  <div className="flex space-x-2">
                    {tutorialSteps.slice(0, -1).map((_, index) => (
                      <div
                        key={index}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          index === tutorialStep ? "bg-gray-800 scale-125" : "bg-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setTutorialStep(Math.max(0, tutorialStep - 1))}
                    disabled={tutorialStep === 0}
                    className={`px-5 py-2.5 rounded-xl font-semibold transition-colors ${
                      tutorialStep === 0
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-gray-800 hover:text-gray-900 hover:bg-gray-300 bg-gray-200"
                    }`}
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    onClick={() => setTutorialStep(tutorialStep + 1)}
                    className="px-5 py-2.5 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            ) : (
              // Report Form
              <div>
                <div className="text-center mb-6">
                  <div className="text-xl font-bold text-gray-800 mb-2">
                    แจ้งปัญหาหรือแนะนำ
                  </div>
                  <p className="text-gray-600">
                    หากพบปัญหาหรือมีข้อเสนอแนะ กรุณาแจ้งให้เราทราบ
                  </p>
                </div>

                <form onSubmit={handleReportSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ชื่อ (ไม่บังคับ)
                    </label>
                    <input
                      type="text"
                      value={reportForm.name}
                      onChange={(e) => setReportForm({ ...reportForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-200 focus:border-gray-500 outline-none transition-colors"
                      placeholder="ชื่อของคุณ"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      รายละเอียดปัญหา *
                    </label>
                    <textarea
                      value={reportForm.issue}
                      onChange={(e) => setReportForm({ ...reportForm, issue: e.target.value })}
                      required
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-200 focus:border-gray-500 outline-none transition-colors resize-none"
                      placeholder="อธิบายปัญหาหรือข้อเสนอแนะ..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      แนบไฟล์รูปภาพ (ไม่บังคับ)
                    </label>

                    {reportForm.attachedFile ? (
                      <div className="space-y-3">
                        <div className="border-2 border-gray-300 rounded-xl p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">รูปภาพที่เลือก:</span>
                            <button
                              type="button"
                              onClick={() => setReportForm({ ...reportForm, attachedFile: null })}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title="ลบรูปภาพ"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex flex-col items-center space-y-2">
                            <div className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={URL.createObjectURL(reportForm.attachedFile)}
                                alt="Preview"
                                className="w-32 h-32 object-cover rounded-lg shadow-sm"
                              />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium text-gray-700">{reportForm.attachedFile.name}</p>
                              <p className="text-xs text-gray-500">{(reportForm.attachedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                        </div>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-3 text-center hover:border-gray-400 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => { const file = e.target.files?.[0] || null; setReportForm({ ...reportForm, attachedFile: file }); }}
                            className="hidden"
                            id="file-upload-replace"
                          />
                          <label htmlFor="file-upload-replace" className="cursor-pointer flex flex-col items-center space-y-1">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span className="text-sm font-medium text-gray-600">เปลี่ยนรูปภาพ</span>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => { const file = e.target.files?.[0] || null; setReportForm({ ...reportForm, attachedFile: file }); }}
                          className="hidden"
                          id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center space-y-2">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <div className="text-sm text-gray-500">
                            <span className="font-medium text-gray-600">คลิกเพื่อเลือกรูปภาพ</span>
                            <p className="text-xs mt-1">PNG, JPG, GIF (ขนาดไม่เกิน 5MB)</p>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setTutorialStep(tutorialStep - 1)}
                      className="px-5 py-2.5 text-gray-800 hover:text-gray-900 hover:bg-gray-300 bg-gray-200 rounded-xl font-semibold transition-colors"
                    >
                      ย้อนกลับ
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
                    >
                      ส่งรายงาน
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    , document.body)}

    {/* Error Toast */}
    {showErrorToast && (
      <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
        <div className="relative w-[330px] h-20 rounded-lg bg-white shadow-[rgba(149,157,165,0.2)_0px_8px_24px] overflow-hidden flex items-center justify-around gap-4 px-4 py-2.5">
          {/* Wave Background - Red version */}
          <svg 
            className="absolute left-[-31px] top-8 w-20 rotate-90 fill-[#fc0c0c3a]" 
            viewBox="0 0 1440 320" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M0,256L11.4,240C22.9,224,46,192,69,192C91.4,192,114,224,137,234.7C160,245,183,235,206,213.3C228.6,192,251,160,274,149.3C297.1,139,320,149,343,181.3C365.7,213,389,267,411,282.7C434.3,299,457,277,480,250.7C502.9,224,526,192,549,181.3C571.4,171,594,181,617,208C640,235,663,277,686,256C708.6,235,731,149,754,122.7C777.1,96,800,128,823,165.3C845.7,203,869,245,891,224C914.3,203,937,117,960,112C982.9,107,1006,181,1029,197.3C1051.4,213,1074,171,1097,144C1120,117,1143,107,1166,133.3C1188.6,160,1211,224,1234,218.7C1257.1,213,1280,139,1303,133.3C1325.7,128,1349,192,1371,192C1394.3,192,1417,128,1429,96L1440,64L1440,320L1428.6,320C1417.1,320,1394,320,1371,320C1348.6,320,1326,320,1303,320C1280,320,1257,320,1234,320C1211.4,320,1189,320,1166,320C1142.9,320,1120,320,1097,320C1074.3,320,1051,320,1029,320C1005.7,320,983,320,960,320C937.1,320,914,320,891,320C868.6,320,846,320,823,320C800,320,777,320,754,320C731.4,320,709,320,686,320C662.9,320,640,320,617,320C594.3,320,571,320,549,320C525.7,320,503,320,480,320C457.1,320,434,320,411,320C388.6,320,366,320,343,320C320,320,297,320,274,320C251.4,320,229,320,206,320C182.9,320,160,320,137,320C114.3,320,91,320,69,320C45.7,320,23,320,11,320L0,320Z" 
              fillOpacity={1} 
            />
          </svg>

          {/* Icon Container - Red Error Icon */}
          <div className="relative w-[35px] h-[35px] flex justify-center items-center bg-[#fc0c0c48] rounded-full ml-2 shrink-0">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 512 512" 
              strokeWidth={0} 
              fill="currentColor" 
              className="w-[17px] h-[17px] text-[#d10d0d]"
            >
              <path d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c-9.4 9.4-9.4 24.6 0 33.9l47 47-47 47c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l47-47 47 47c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-47-47 47-47c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-47 47-47-47c-9.4-9.4-24.6-9.4-33.9 0z" />
            </svg>
          </div>

          {/* Message Text */}
          <div className="flex flex-col justify-center items-start grow">
            <p className="m-0 text-[#d10d0d] text-[17px] font-bold cursor-default">
              เกิดข้อผิดพลาด
            </p>
            <p className="m-0 text-sm text-[#555] cursor-default">
              {errorMessage}
            </p>
          </div>

          {/* Close Icon */}
          <button
            onClick={() => setShowErrorToast(false)}
            className="shrink-0"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 15 15" 
              strokeWidth={0} 
              fill="none" 
              className="w-[18px] h-[18px] text-[#555] cursor-pointer hover:text-[#333] transition-colors"
            >
              <path 
                fill="currentColor" 
                d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" 
                clipRule="evenodd" 
                fillRule="evenodd" 
              />
            </svg>
          </button>
        </div>
      </div>
    )}
    </>
  );
}
