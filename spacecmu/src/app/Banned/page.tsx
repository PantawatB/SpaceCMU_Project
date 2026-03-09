'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function BannedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-gray-800 px-4">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <Image
          src="/SpaceCMUlogo1.png"
          alt="SpaceCMU Logo"
          width={80}
          height={80}
          className="mb-3"
        />
        <h1 className="text-2xl font-bold text-gray-800">SpaceCMU</h1>
      </div>

      {/* Ban icon */}
      <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mb-6">
        <svg
          className="w-12 h-12 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" strokeWidth="2" />
        </svg>
      </div>

      {/* Message */}
      <h2 className="text-3xl font-bold text-red-500 mb-3">บัญชีถูกระงับ</h2>
      <p className="text-gray-500 text-center max-w-sm mb-2">
        บัญชีของคุณถูกระงับจาก SpaceCMU
      </p>
      <p className="text-gray-400 text-sm text-center max-w-sm mb-8">
        ตัวตนสาธารณะและนิรนามของคุณถูกระงับทั้งคู่ เนื่องจากละเมิดเกณฑ์ชุมชน หากคิดว่าเป็นความผิดพลาด กรุณาติดต่อผู้ดูแลระบบ
      </p>

      {/* Back to home */}
      <Link
        href="/"
        className="px-6 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition text-sm"
      >
        กลับหน้าหลัก
      </Link>
    </div>
  );
}
