"use client";

import { useRouter } from "next/navigation";

interface TokenErrorPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TokenErrorPopup({ isOpen, onClose }: TokenErrorPopupProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    router.push('/login');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 relative animate-[fadeIn_0.3s_ease-in-out]">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <svg
            className="w-5 h-5 text-gray-500"
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

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            ขออภัย
          </h2>

          {/* Message */}
          <p className="text-gray-700 mb-2 text-base leading-relaxed">
            Token หมดอายุ
          </p>
          <p className="text-gray-700 mb-6 text-base leading-relaxed">
            กรุณาล็อกอินใหม่
          </p>

          {/* Sad Face Icon */}
          <div className="mb-8">
            <svg
              className="w-24 h-24 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                strokeWidth="1.5"
                className="stroke-gray-300"
              />
              {/* Eyes */}
              <circle cx="9" cy="9" r="1" className="fill-gray-400" />
              <circle cx="15" cy="9" r="1" className="fill-gray-400" />
              {/* Sad mouth */}
              <path
                d="M8 15 Q12 13 16 15"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="stroke-gray-400"
                fill="none"
              />
            </svg>
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="w-full py-3 px-6 bg-gray-400 hover:bg-gray-500 text-white font-medium rounded-xl transition-colors shadow-md"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
