"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";import { useUser } from "@/contexts/UserContext";
import { apiService } from "@/lib/api";

/** แปลง **ข้อความ** ให้เป็น <strong> และ >>ข้อความ ให้เป็นบรรทัดย่อหน้า */
function renderBoldText(text: string) {
  // แยกตาม newline ก่อน เพื่อจัดการ >> ได้ทีละบรรทัด
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    const indented = line.startsWith('>>');
    const content = indented ? line.slice(2) : line;
    // แยก bold ภายในบรรทัด
    const parts = content.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i} className="font-extrabold text-gray-900">{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>
    );
    return (
      <span key={lineIdx} className="block" style={indented ? { textIndent: '1.25rem' } : undefined}>
        {parts}
      </span>
    );
  });
}

export interface SidebarMenuItem {
  name: string;
  icon: React.ReactNode;
  link?: string;
}

interface SidebarProps {
  menuItems?: SidebarMenuItem[]; // ทำให้เป็น optional
  hideHamburger?: boolean; // ซ่อนปุ่ม hamburger บน mobile (เช่น เมื่ออยู่ในหน้าแชทและเลือกห้องแล้ว)
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

export default function Sidebar({ menuItems, hideHamburger = false }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, activeUser, activeMode, anonymousAccount, logout: logoutFromContext, officialMode, exitOfficialMode, isSwitchingToOfficial } = useUser();
  
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showBanPopup, setShowBanPopup] = useState(false);
  const [bannedAccountLabel, setBannedAccountLabel] = useState('');
  const [reportForm, setReportForm] = useState({
    name: "",
    issue: "",
    attachedFiles: [] as File[],
  });
  const [reportSubmitting, setReportSubmitting] = useState(false);

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
        "SpaceCMU คือ แพลตฟอร์มโซเชียลมีเดีย สำหรับนักศึกษาและบุคลากร มหาวิทยาลัยเชียงใหม่ \nโดยใช้การยืนยันตัวตนผ่าน CMU Account \n ดังนั้น มีแค่บุคคลากรและนักศึกษาของ CMU เท่านั้นที่สามารถเข้าร่วมได้",
      image: "/Spacecmu-Slide1.png",
    },
    {
      title: "คำอธิบายระบบ",
      content:
        "SpaceCMU จะแบ่งตัวตนการใช้งานออกเป็น 3 รูปแบบ \n ได้แก่ Public, Anonymous และ Official Account สำหรับหน่วยงานต่างๆ ภายในมหาวิทยาลัย ซึ่งหากท่านต้องการลงทะเบียนเป็น Official Account กรุณาติดต่อทีมพัฒนา สามารถติดต่อผู้พัฒนาได้ที่ Slide สุดท้ายของการสอนใช้งาน",
      image: "/Slide2.png",
      image2: "/Slide2-1.png"
    },
    {
      title: "Setting",
      content:
        "ที่เมนู Setting ท่านสามารถจัดการโปรไฟล์ของท่าน ได้ตามต้องการ อาทิเช่น เปลี่ยนรูปโปรไฟล์, เปลี่ยนชื่อ, Bio และสามารถสลับโหมดการใช้งานได้ที่เมนู Sidebar ทางซ้าย ด้านบนปุ่ม Logout",
      note: "⚠️ Profile Public จะไม่สามารถเปลี่ยนชื่อได้ เพื่อคงเอกลักษณ์ของโหมด Public ไว้ หากท่านต้องการความเป็นส่วนตัวสามารถใช้โหมด Anonymous แทนโหมด Public ได้ ⚠️",
      image: "/Slide3.png",
      image2: "/Slide3-1.png",
    },
    {
      title: "Profile",
      content: "ท่านสามารถดูโปรไฟล์ที่กำลังใช้งานได้ที่นี่ รวมไปถึงโพสต์และข้อมูลต่างๆ อาทิเช่น โพสต์ที่เคยโพสต์หรือ สินค้าที่ท่านลงขายใน Market เพื่อนของท่าน หรือ โพสต์ต่างๆที่เคยมีส่วนร่วม จะถูกแสดงที่นี่",
      image: "/Slide4.png",
    },
    {
      title: "Feeds",
      content: "หน้า Feeds เป็นหน้าหลักที่รวบรวมโพสต์ต่างๆจากผู้ใช้งานคนอื่นๆ ตามหมวดหมู่ต่างๆ ที่ท่านเลือกมาแสดง จะถูกแสดงที่นี่ ท่านสามารถกดไลค์ คอมเมนต์ รีโพสต์ หรือ แชร์โพสต์ต่างๆให้เพื่อนๆของท่านได้ ผ่าน ShareBar ที่ส่วนด้านล่างของหน้าต่าง ซึ่งจะอธิบายต่อไป",
      image: "/Slide5.png",
    },
    {
      title: "ShareBar",
      content: "ShareBar เป็นส่วนที่ช่วยให้ท่านสามารถแชร์โพสต์ต่างๆ ท่านสามารถพิมพ์ข้อความ หรืออัพโหลดรูปภาพไปยัง Feeds ต่างๆได้ผ่านส่วนนี้ และเลือกประเภทของ Feeds ที่ท่านต้องการจะแชร์ได้จากที่นี่ และสามารถกดลูกศรเพื่อซ่อนส่วน ShareBar ได้",
      note: "⚠️ ท่านจำเป็นต้องเลือกประเภทของ Feeds ที่ท่านต้องการจะแชร์โพสต์ของท่านด้วย หากท่านไม่เลือกประเภทของ Feeds โพสต์ของท่านจะไม่สามารถถูกแชร์ได้ ⚠️",
      image: "/Slide6.png",
      image2: "/Slide6-1.png",
    },
    {
      title: "Feeds Types",
      content: "**SpaceCMU** ขอแจ้งให้ทราบถึงวัตถุประสงค์ของการแบ่งประเภท Feeds ดังนี้ \n **Global :** สำหรับแชร์โพสต์ซึ่งต้องการให้ทุกคนในระบบเห็น โพสต์ของท่าน \n **Friends :** มีเพียงเพื่อนของท่านเท่านั้นที่จะเห็นโพสต์ในส่วนนี้ \n **Announcement :** สำหรับโพสต์ที่เป็นประกาศสำคัญ จะถูกรวบรวมไว้ที่นี่ เพื่อให้ทุกคนสามารถเข้าถึงได้ง่ายขึ้น \n **Events :** สำหรับโพสต์ที่เกี่ยวข้องกับกิจกรรมต่างๆ ที่จะเกิดขึ้นภายในมหาวิทยาลัยเชียงใหม่ \n **Question :** สำหรับโพสต์ที่เป็นคำถามต่างๆ ที่ท่านอยากจะถามเพื่อนๆ หรือคนในระบบ เพื่อขอความช่วยเหลือหรือคำแนะนำต่างๆ \n **Marketplace :** สำหรับโพสต์ที่เกี่ยวข้องกับการซื้อขายสินค้าและบริการต่างๆ ที่ท่านต้องการจะขายหรือขอซื้อจากเพื่อนๆในระบบ \n **Shops / ฝากร้านขายของ :** สำหรับโพสต์ที่เกี่ยวข้องกับการโปรโมทร้านค้าหรือบริการต่างๆ ที่ท่านต้องการจะโปรโมทให้เพื่อนๆในระบบได้เห็น",
      image: "/Slide7.png",
    },
    {
      title: "Post Interactions",
      content: "เมื่อมีโพสต์ที่ท่านสนใจ ท่านสามารถกด Like Comment Repost Share หรือ Save โพสต์ต่างๆได้ ผ่านปุ่ม Interactions ต่างๆ ที่ส่วนด้านล่างของหน้าต่าง \n>> รวมไปถึงการแก้ไขหรือการลบโพสต์ของท่านเองได้ผ่านปุ่ม Edit และ Delete ที่จะปรากฏขึ้นเมื่อท่านเป็นเจ้าของโพสต์นั้นๆ หรือ หากท่านพบโพสต์ที่ไม่เหมาะสม ท่านสามารถกด Report เพื่อรายงานโพสต์นั้นๆให้กับทีมพัฒนาได้ทราบ",
      image: "/Post.png",
      image2: "/Post2.png",
    },
    {
      title: "Notifications",
      content: "ท่านสามารถดูการแจ้งเตือนต่างๆ ที่เกี่ยวข้องกับโพสต์หรือกิจกรรมของท่านได้ที่นี่ รวมไปถึงประกาศจากทีมพัฒนา และข่าวสารต่างๆที่เกี่ยวข้องกับมหาวิทยาลัยเชียงใหม่",
      note: "ท่านสามารถกดที่การแจ้งเตือนต่างๆเพื่อดูรายละเอียดเพิ่มเติมได้",
      image: "/Noti.png",
      image2: "/Noti2.png",
    },
    {
      title: "Market",
      content: "ท่านสามารถลงขายสินค้าต่างๆของท่านได้ที่หน้า Market และหากสนใจสินค้า ท่านสามารถติดต่อผู้ขายได้ผ่านทาง Direct Message ได้โดยตรง \n>> **Market ของ SpaceCMU ถูก Backup ด้วย CMU Account ดังนั้น หากท่านโดนโกงท่านสามารถติดต่อทีมพัฒนาเพื่อขอความช่วยเหลือได้ เนื่องจาก Market ของ SpaceCMU เชื่อมต่อกับ CMU Account โดยตรง โอกาสที่จะตามตัวผู้กระทำผิดได้มีค่อนข้างสูงมาก**",
      note: "⚠️ หน้า Market Account ที่เป็น Anonymous จะไม่สามารถใช้งาน Market ได้ เมื่อมีการเข้าถึงหน้า Market ระบบจะบังคับให้ท่านเปลี่ยนไปใช้งานในโหมด Public อัตโนมัติ หากบัญชีของท่านถูกระงับ ท่านจะไม่สามารถใช้งาน Market ได้อีกต่อไป ⚠️",
      image: "/Market.png",
      image2: "/Market2.png",
    },
    {
      title: "คำแนะนำสำหรับการใช้งาน Market",
      content: "หากท่านสนใจสินค้า ท่านสามารถติดต่อผู้ขายได้ผ่านทาง Direct Message ได้โดยตรง \n หากท่านเป็นผู้ขายสินค้าท่านสามารถทำเครื่องหมายว่าขายแล้ว หรือ ลบสินค้าของท่านออกจาก ระบบได้",
      image: "/Item.png",
      image2: "/Item2.png",
    },
    {
      title: "Chat",
      content: "ท่านสามารถพูดคุยกับเพื่อนๆของท่านได้ที่นี่ ผ่านการสร้างห้องแชทใหม่ รายชื่อที่แสดงส่วน Suggested เป็นเพื่อนที่ระบบแนะนำให้ท่าน หรือท่านสามารถค้นหาเพื่อนที่ท่านต้องการจะคุยด้วยได้ผ่านช่องค้นหา **หากท่านเลือก 1 คนจะเป็นการสร้าง แชทส่วนตัว แต่ถ้าหากท่านเลือกหลายคนจะเป็นการสร้างกลุ่มแชท โดยอัตโนมัติ **",
      image: "/Chat.png",
      image2: "/Chatdetail.png",
    },
    {
      title: "Friends",
      content: "ท่านสามารถเรียกดูคำขอเป็นเพื่อน ค้นหาเพื่อนๆของท่าน หรือดูจาก People you may know ที่ระบบแนะนำเพื่อนให้ท่านได้ที่นี่ ท่านสามารถค้นหาและกดส่งคำขอเป็นเพื่อน หรือค้นหาโปรไฟล์คนอื่นๆได้ผ่านช่องค้นหา \n>> นอกจากนี้ ท่านยังสามารถขอเป็นเพื่อน ส่งข้อความ หรือ ติดตามเพื่อนของคุณได้ผ่านทางช่องทางนี้",
      note: "⚠️ หากท่านติดตามเพื่อนของท่าน ทุกโพสต์ของเพื่อนหรือทุกคนที่ท่านติดตามจะปรากฎผ่านหน้า Feeds ประเภท Following ของท่านโดยอัตโนมัติ ⚠️",
      image: "/Friends.png",
      image2: "/Friends2.png",
    },
    {
      title: "Calendar",
      content: "ท่านสามารถดูปฏิทินกิจกรรมต่างๆ ของท่านได้ที่นี่ โดยรายละเอียดกิจกรรมต่างๆจะแสดงผลดังนี้ \n กิจกรรมที่ท่านเปลี่ยนสถานะเป็น เสร็จสิ้น(success) จะถูกแสดงเป็น **สีเขียว** \n กิจกรรมที่ผ่านไปแล้ว จะถูกแสดงเป็น **สีเทา** \n กิจกรรมที่กำลังจะเกิดขึ้น จะถูกแสดงเป็น **สีแดง**",
      note: "หน้า Feeds ประเภท Events จะมีคุณสมบัติพิเศษ คือ ท่านสามารถกด Add to Calendar เพื่อ note วันจัดกิจกรรมต่างๆที่ท่านสนใจ จะถูกนำมาแสดงในปฏิทินของท่านอัตโนมัติ และจะถูกแสดงเป็น **สีม่วง**",
      image: "/Calendar.png",
      image2: "/Calendar2.png",
    },
    {
      title: "แจ้งปัญหา",
      content: "หากพบปัญหา กรุณาแจ้งให้ทีมพัฒนาทราบ",
      image: "/cmu.png",
    },
  ];

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", reportForm.name.trim());
      formData.append("issue", reportForm.issue.trim());
      reportForm.attachedFiles.forEach((file) => formData.append("media", file));
      await apiService.submitReport(formData);
      alert("ส่งรายงานปัญหาเรียบร้อยแล้ว ขอบคุณสำหรับการแจ้ง!");
      setShowTutorial(false);
      setTutorialStep(0);
      setReportForm({ name: "", issue: "", attachedFiles: [] });
    } catch {
      alert("เกิดข้อผิดพลาดในการส่งรายงาน กรุณาลองใหม่อีกครั้ง");
    } finally {
      setReportSubmitting(false);
    }
  };

  // Switch mode handler
  const handleSwitchMode = async (newMode: "PUBLIC" | "ANONYMOUS") => {
    if (isSwitchingMode || activeMode === newMode) return;

    setIsSwitchingMode(true);
    
    try {
      await apiService.switchMode(newMode);
      window.location.reload();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '';

      if (errMsg === 'ACCOUNT_BANNED') {
        // Expected — account is banned, show popup, stay on current mode
        const label = newMode === 'PUBLIC' ? 'Public' : 'Anonymous';
        setBannedAccountLabel(label);
        setShowBanPopup(true);
      } else {
        // Unexpected error — log and show toast
        console.error('Failed to switch mode:', err);
        setErrorMessage(errMsg || 'ไม่สามารถเปลี่ยนโหมดได้ กรุณาลองใหม่อีกครั้ง');
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 3000);
      }
    } finally {
      setIsSwitchingMode(false);
    }
  };

  // Auto-detect if current active account is banned and force-switch to the other one
  useEffect(() => {
    if (!activeMode || isSwitchingMode) return;

    const publicBanned = user?.status === 'banned';
    const anonBanned = anonymousAccount?.status === 'banned';

    if (activeMode === 'PUBLIC' && publicBanned) {
      setBannedAccountLabel('Public');
      setShowBanPopup(true);
      // Silently switch to Anonymous (switchMode already uses silent fetch)
      if (!anonBanned) {
        apiService.switchMode('ANONYMOUS')
          .then(() => window.location.reload())
          .catch(() => { /* anonymous also banned — stay put */ });
      }
    } else if (activeMode === 'ANONYMOUS' && anonBanned) {
      setBannedAccountLabel('Anonymous');
      setShowBanPopup(true);
      if (!publicBanned) {
        apiService.switchMode('PUBLIC')
          .then(() => window.location.reload())
          .catch(() => { /* public also banned — stay put */ });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode, user?.status, anonymousAccount?.status]);

  // Logout handler
  const handleLogout = async () => {
    await logoutFromContext();
  };

  // Handle menu item click (especially for Market page)
  const handleMenuItemClick = () => {
    // Close sidebar on mobile
    setIsSidebarOpen(false);
    // Market page handles mode switch + yellow toast + ban overlay itself
  };

  return (
    <>
      {/* Hamburger Menu Button for Mobile - Only shown when sidebar is closed and not hidden by parent */}
      {!isSidebarOpen && !hideHamburger && (
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
          className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
          style={{ minHeight: '100dvh' }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-dvh
          w-64 min-w-[256px] max-w-[256px]
          p-6 flex flex-col
          bg-white
          transition-transform duration-300 ease-in-out
          z-50
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ height: '100dvh' }}
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

        {/* ── TOP: Logo + Profile (fixed, ไม่ scroll) ── */}
        <div className="shrink-0">
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
            className="ml-1 sm:ml-2 w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center border border-black/60 shadow-sm hover:shadow active:shadow-inner transition-all duration-200 group"
            title="Tutorial & Help"
          >
            <span className="text-gray-600 group-hover:text-gray-800 text-sm font-bold">
              ?
            </span>
          </button>
        </div>
        {/* Profile Section */}
        <div className="flex gap-4 sm:gap-6 items-start justify-center mb-6 sm:mb-8 relative min-h-[90px] sm:min-h-[100px]">
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
              <div className="mt-2 text-sm font-bold text-gray-900 truncate max-w-[170px] text-center flex items-center gap-1 justify-center">
                {officialMode.name}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4 text-blue-500 shrink-0"
                  aria-label="Verified official account"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                    clipRule="evenodd"
                  />
                </svg>
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
                    name: user?.firstName || profile.name,
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
                  <div className="mt-2 text-sm font-semibold text-gray-800 truncate max-w-[100px] text-center">
                    {displayData.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate max-w-[100px] text-center">{displayData.username}</div>
                </div>
              );
            })
          )}
        </div>
        </div>{/* end TOP */}

        {/* ── MIDDLE: Menu (scroll ได้เฉพาะตรงนี้) ── */}
        <div className="flex-1 overflow-y-auto min-h-0 py-1">
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
                  onClick={() => handleMenuItemClick()}
                  className={`flex items-center gap-3 w-full rounded-lg px-3 py-2 transition font-medium text-left ${
                    pathname === item.link
                      ? "bg-white text-black shadow-md border border-gray-200 font-semibold"
                      : "text-gray-500 hover:text-black hover:bg-gray-100"
                  }`}
                >
                  <span className="w-5 h-5 flex items-center justify-center shrink-0">
                    {item.icon}
                  </span>
                  <span className={pathname === item.link ? "text-base" : "text-sm"}>
                    {item.name}
                  </span>
                </button>
              ) : (
                <Link
                  href={item.link}
                  key={item.name}
                  onClick={() => handleMenuItemClick()}
                  className={`flex items-center gap-3 w-full rounded-lg px-3 py-2 transition font-medium text-left ${
                    pathname === item.link
                      ? "bg-white text-black shadow-md border border-gray-200 font-semibold"
                      : "text-gray-500 hover:text-black hover:bg-gray-100"
                  }`}
                >
                  <span className="w-5 h-5 flex items-center justify-center shrink-0">
                    {item.icon}
                  </span>
                  <span className={pathname === item.link ? "text-base" : "text-sm"}>
                    {item.name}
                  </span>
                </Link>
              )
            ) : (
              <button
                key={item.name}
                className="flex items-center gap-3 w-full rounded-lg px-3 py-2 transition font-medium text-left text-gray-500 hover:text-black hover:bg-gray-100"
              >
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  {item.icon}
                </span>
                <span className="text-sm">{item.name}</span>
              </button>
            );
          })}
        </nav>
        </div>{/* end MIDDLE */}

        {/* ── BOTTOM: Toggle + Logout (fixed, ไม่ scroll) ── */}
        <div className="shrink-0 pt-4">
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
              className={`flex-1 py-2 text-center font-semibold transition-all duration-300 text-sm ${
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
        </div>{/* end BOTTOM */}

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
                <div className="text-left mb-6">
                  <div className="text-xl font-bold text-gray-800 mb-3 text-center">
                    {tutorialSteps[tutorialStep].title}
                  </div>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line text-left">
                    {renderBoldText(tutorialSteps[tutorialStep].content)}
                  </p>
                  {tutorialSteps[tutorialStep].note && (
                    <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-left">
                      {renderBoldText(tutorialSteps[tutorialStep].note)}
                    </p>
                  )}
                  {tutorialSteps[tutorialStep].image && (
                    <div className="mb-4 mt-4 flex flex-col items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={tutorialSteps[tutorialStep].image}
                        alt={tutorialSteps[tutorialStep].title}
                        width={400}
                        height={300}
                        className="rounded-xl object-cover shadow-md max-w-full"
                      />
                      {tutorialSteps[tutorialStep].image2 && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={tutorialSteps[tutorialStep].image2}
                          alt={`${tutorialSteps[tutorialStep].title} 2`}
                          width={400}
                          height={300}
                          className="rounded-xl object-cover shadow-md max-w-full"
                        />
                      )}
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

                <div className="flex justify-between items-center">
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTutorialStep(tutorialSteps.length - 1)}
                      className="px-4 py-2.5 text-gray-400 hover:text-gray-600 rounded-xl font-medium transition-colors text-sm underline underline-offset-2"
                    >
                      แจ้งปัญหา
                    </button>
                    <button
                      onClick={() => setTutorialStep(tutorialStep + 1)}
                      className="px-5 py-2.5 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
                    >
                      ถัดไป
                    </button>
                  </div>
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
                      onChange={(e) => setReportForm({ ...reportForm, name: e.target.value.slice(0, 100) })}
                      maxLength={100}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-200 focus:border-gray-500 outline-none transition-colors bg-white text-gray-900 placeholder-gray-400"
                      placeholder="ชื่อของคุณ"
                    />
                    <p className={`text-right text-[11px] mt-1 ${reportForm.name.length >= 90 ? "text-amber-500" : "text-gray-400"}`}>
                      {reportForm.name.length}/100
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      รายละเอียดปัญหา *
                    </label>
                    <textarea
                      value={reportForm.issue}
                      onChange={(e) => setReportForm({ ...reportForm, issue: e.target.value.slice(0, 1000) })}
                      required
                      maxLength={1000}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-200 focus:border-gray-500 outline-none transition-colors resize-none bg-white text-gray-900 placeholder-gray-400"
                      placeholder="อธิบายปัญหาหรือข้อเสนอแนะ..."
                    />
                    <p className={`text-right text-[11px] mt-1 ${reportForm.issue.length >= 900 ? "text-amber-500" : "text-gray-400"}`}>
                      {reportForm.issue.length}/1000
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      แนบรูปภาพ / วีดีโอ (ไม่บังคับ · เพิ่มได้หลายไฟล์)
                    </label>

                    {/* Preview grid */}
                    {reportForm.attachedFiles.length > 0 && (
                      <div className="mb-3 grid grid-cols-3 gap-2">
                        {reportForm.attachedFiles.map((file, idx) => (
                          <div key={idx} className="relative group rounded-xl overflow-hidden bg-gray-100 aspect-square">
                            {file.type.startsWith("video/") ? (
                              <video
                                src={URL.createObjectURL(file)}
                                className="w-full h-full object-cover"
                                muted
                              />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`preview-${idx}`}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setReportForm({
                                  ...reportForm,
                                  attachedFiles: reportForm.attachedFiles.filter((_, i) => i !== idx),
                                })
                              }
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                            {file.type.startsWith("video/") && (
                              <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1 rounded">VID</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Drop zone */}
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={(e) => {
                          const newFiles = Array.from(e.target.files ?? []);
                          setReportForm({
                            ...reportForm,
                            attachedFiles: [...reportForm.attachedFiles, ...newFiles].slice(0, 10),
                          });
                          e.target.value = "";
                        }}
                        className="hidden"
                        id="file-upload-report"
                      />
                      <label htmlFor="file-upload-report" className="cursor-pointer flex flex-col items-center space-y-2">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div className="text-sm text-gray-500">
                          <span className="font-medium text-gray-600">คลิกเพื่อเพิ่มรูปภาพหรือวีดีโอ</span>
                          <p className="text-xs mt-1">PNG, JPG, GIF, MP4, MOV · สูงสุด 10 ไฟล์ · 50 MB ต่อไฟล์</p>
                          {reportForm.attachedFiles.length > 0 && (
                            <p className="text-xs text-gray-700 mt-0.5 font-medium">{reportForm.attachedFiles.length} ไฟล์ที่เลือก</p>
                          )}
                        </div>
                      </label>
                    </div>
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
                      disabled={reportSubmitting}
                      className="px-5 py-2.5 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {reportSubmitting && (
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      )}
                      {reportSubmitting ? "กำลังส่ง..." : "ส่งรายงาน"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    , document.body)}

    {/* Ban Popup Modal */}
    {showBanPopup && createPortal(
      <div className="fixed inset-0 z-99998 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-red-100 max-w-sm w-full p-7 flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-base font-bold text-slate-900">ไม่สามารถใช้งานได้</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              ขออภัย account <span className="font-semibold text-red-600">{bannedAccountLabel}</span> ของท่านถูก Ban จากระบบ
              ซึ่งไม่สามารถใช้งานตัวตนดังกล่าวได้
            </p>
          </div>
          <button
            onClick={() => setShowBanPopup(false)}
            className="mt-1 w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            รับทราบ
          </button>
        </div>
      </div>,
      document.body
    )}

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
