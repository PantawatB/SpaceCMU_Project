"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message") || "Unknown error";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-gray-800 p-8">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Login Error</h1>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl w-full mb-6">
        <p className="text-sm font-mono text-red-800 break-all">{decodeURIComponent(message)}</p>
      </div>
      <Link href="/" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
        กลับหน้าหลัก
      </Link>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
