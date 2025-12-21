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
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [reportForm, setReportForm] = useState({
    name: "",
    issue: "",
    attachedFile: null as File | null,
  });

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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
          />
        </svg>
      ),
      link: "/Admin",
    },
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
      image: "/tanjiro.jpg",
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

      {/* Tutorial Popup */}
      {showTutorial && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 relative shadow-xl border border-gray-200">
            <button
              onClick={() => {
                setShowTutorial(false);
                setTutorialStep(0);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {tutorialStep < tutorialSteps.length - 1 ? (
              // Tutorial Steps
              <div>
                <div className="text-center mb-6">
                  <div className="text-lg font-bold text-gray-800 mb-2">
                    {tutorialSteps[tutorialStep].title}
                  </div>

                  <p className="text-gray-600 leading-relaxed">
                    {tutorialSteps[tutorialStep].content}
                  </p>
                  {/* ที่สำหรับตั้งค่ารูปภาพในแต่ละหัวข้อ tutorialStep */}
                  {tutorialSteps[tutorialStep].image && (
                    <div className="mb-4 mt-3 flex justify-center">
                      <Image
                        src={tutorialSteps[tutorialStep].image}
                        alt={tutorialSteps[tutorialStep].title}
                        width={300}
                        height={300}
                        className="rounded-lg object-cover shadow-md"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-center mb-4">
                  <div className="flex space-x-2">
                    {tutorialSteps.slice(0, -1).map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${
                          index === tutorialStep ? "bg-gray-800" : "bg-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() =>
                      setTutorialStep(Math.max(0, tutorialStep - 1))
                    }
                    disabled={tutorialStep === 0}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      tutorialStep === 0
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-gray-800 hover:text-gray-900 hover:bg-gray-300 bg-gray-200"
                    }`}
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    onClick={() => setTutorialStep(tutorialStep + 1)}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            ) : (
              // Report Form
              <div>
                <div className="text-center mb-6">
                  <div className="text-lg font-bold text-gray-800 mb-2">
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
                      onChange={(e) =>
                        setReportForm({ ...reportForm, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-gray-500 outline-none transition-colors"
                      placeholder="ชื่อของคุณ"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      รายละเอียดปัญหา *
                    </label>
                    <textarea
                      value={reportForm.issue}
                      onChange={(e) =>
                        setReportForm({ ...reportForm, issue: e.target.value })
                      }
                      required
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-200 focus:border-gray-500 outline-none transition-colors resize-none"
                      placeholder="อธิบายปัญหาหรือข้อเสนอแนะ..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      แนบไฟล์รูปภาพ (ไม่บังคับ)
                    </label>

                    {reportForm.attachedFile ? (
                      // Show preview when file is selected
                      <div className="space-y-3">
                        <div className="border-2 border-gray-300 rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">
                              รูปภาพที่เลือก:
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setReportForm({
                                  ...reportForm,
                                  attachedFile: null,
                                })
                              }
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title="ลบรูปภาพ"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>

                          <div className="flex flex-col items-center space-y-2">
                            <div className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={URL.createObjectURL(
                                  reportForm.attachedFile
                                )}
                                alt="Preview"
                                className="w-32 h-32 object-cover rounded-lg shadow-sm"
                              />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium text-gray-700">
                                {reportForm.attachedFile.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(
                                  reportForm.attachedFile.size /
                                  1024 /
                                  1024
                                ).toFixed(2)}{" "}
                                MB
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-gray-400 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setReportForm({
                                ...reportForm,
                                attachedFile: file,
                              });
                            }}
                            className="hidden"
                            id="file-upload-replace"
                          />
                          <label
                            htmlFor="file-upload-replace"
                            className="cursor-pointer flex flex-col items-center space-y-1"
                          >
                            <svg
                              className="w-6 h-6 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                              />
                            </svg>
                            <span className="text-sm font-medium text-gray-600">
                              เปลี่ยนรูปภาพ
                            </span>
                          </label>
                        </div>
                      </div>
                    ) : (
                      // Show upload area when no file selected
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setReportForm({
                              ...reportForm,
                              attachedFile: file,
                            });
                          }}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer flex flex-col items-center space-y-2"
                        >
                          <svg
                            className="w-8 h-8 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <div className="text-sm text-gray-500">
                            <span className="font-medium text-gray-600">
                              คลิกเพื่อเลือกรูปภาพ
                            </span>
                            <p className="text-xs mt-1">
                              PNG, JPG, GIF (ขนาดไม่เกิน 5MB)
                            </p>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setTutorialStep(tutorialStep - 1)}
                      className="px-4 py-2 text-gray-800 hover:text-gray-900 hover:bg-gray-300 bg-gray-200 rounded-lg font-semibold transition-colors"
                    >
                      ย้อนกลับ
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                    >
                      ส่งรายงาน
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
