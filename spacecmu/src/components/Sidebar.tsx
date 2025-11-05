"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

export interface SidebarMenuItem {
  name: string;
  icon: React.ReactNode;
  link?: string;
}

interface SidebarProps {
  menuItems?: SidebarMenuItem[]; // ทำให้เป็น optional
}

const profiles = [
  {
    type: "Public",
    name: "Kamado Tanjiro",
    username: "@6506xxxxx",
    avatar: "/tanjiro.jpg",
    bg: "bg-gradient-to-tr from-purple-400 via-cyan-300 to-yellow-300",
  },
  {
    type: "Anonymous",
    name: "Noobcat",
    username: "@anonymous",
    avatar: "/noobcat.png",
    bg: "bg-gray-400",
  },
];

export default function Sidebar({ menuItems }: SidebarProps) {
  const pathname = usePathname();
  const [activeProfile, setActiveProfile] = useState(0);

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
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <rect
            x="4"
            y="6"
            width="16"
            height="12"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
          <path
            stroke="currentColor"
            strokeWidth="2"
            d="M4 10h16"
            fill="none"
          />
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
          <path
            stroke="currentColor"
            strokeWidth="2"
            d="M3 9l1 10a2 2 0 002 2h12a2 2 0 002-2l1-10"
            fill="none"
          />
          <path
            stroke="currentColor"
            strokeWidth="2"
            d="M5 9V7a7 7 0 0114 0v2"
            fill="none"
          />
        </svg>
      ),
      link: "/Market",
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      link: "/Admin",
    },
  ];

  const currentMenuItems = menuItems || defaultMenuItems;

  return (
    <aside className="w-64 p-6 flex flex-col justify-between h-screen bg-white">
      <div>
        {/* Logo */}
        <div className="flex items-center gap-2 mb-7">
          <Image
            src="/SpaceCMUlogo1.png"
            alt="SpaceCMU Logo"
            width={40}
            height={40}
            className="object-contain"
          />
          <span className="text-xl font-bold text-gray-800">SpaceCMU</span>
        </div>
        {/* Profile Section */}
        <div className="flex gap-4 items-center mb-8">
          {profiles.map((profile, idx) => (
            <div
              key={profile.type}
              className={`flex flex-col items-center transition-all duration-300 ${
                activeProfile === idx ? "" : "opacity-50 grayscale"
              }`}
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center relative ${profile.bg} shadow-lg`}
              >
                <Image
                  src={profile.avatar}
                  alt={profile.name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white"
                  priority
                />
                {activeProfile === idx && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow"></span>
                )}
              </div>
              <div className="mt-2 text-sm font-semibold text-gray-800">
                {profile.name}
              </div>
              <div className="text-xs text-gray-500">{profile.username}</div>
            </div>
          ))}
        </div>

        {/* Menu */}
        <nav className="space-y-3">
          {currentMenuItems.map((item) =>
            item.link ? (
              <Link
                href={item.link}
                key={item.name}
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
            )
          )}
        </nav>
      </div>
      <div className="pt-6">
        {/* Toggle Profile Button */}
        <div className="flex mb-6 rounded-lg overflow-hidden border border-gray-200">
          <button
            className={`flex-1 py-2 text-center font-semibold transition-all duration-300 ${
              activeProfile === 0
                ? "bg-white text-black"
                : "bg-gray-200 text-gray-500"
            }`}
            onClick={() => setActiveProfile(0)}
          >
            Public
          </button>
          <button
            className={`flex-1 py-2 text-center font-semibold transition-all duration-300 ${
              activeProfile === 1
                ? "bg-white text-black"
                : "bg-gray-200 text-gray-500"
            }`}
            onClick={() => setActiveProfile(1)}
          >
            Anonymous
          </button>
        </div>
        
        <button className="w-full flex items-center gap-3 justify-center bg-black text-white rounded-lg px-3 py-2 font-semibold hover:bg-gray-800">
          <span className="w-5 h-5 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                stroke="currentColor"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7"
              />
              <path
                stroke="currentColor"
                strokeWidth="2"
                d="M3 12a9 9 0 0118 0 9 9 0 01-18 0z"
              />
            </svg>
          </span>
          <span className="text-base">Logout</span>
        </button>
      </div>
    </aside>
  );
}
