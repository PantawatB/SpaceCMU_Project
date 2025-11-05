"use client";

import Sidebar from "../../components/Sidebar";
import Image from "next/image";

export default function ProfileMainPage() {

  return (
    <div className="flex min-h-screen bg-white text-gray-800">
      {/* Sidebar */}
      <Sidebar />
      {/* Main Content */}
      <main className="flex-1 p-8">
        {/* Search bar */}
        <div className="mb-6">
          <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="8"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
                <line
                  x1="21"
                  y1="21"
                  x2="16.65"
                  y2="16.65"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-3 py-2 rounded-full bg-white text-sm placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
        <section className="flex-1 overflow-y-auto flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow relative overflow-hidden">
            {/* Cover Image */}
            <div className="h-40 w-full bg-linear-to-r from-pink-200 via-yellow-200 to-green-200 flex items-center justify-center relative">
              {/* Rainbow background can be replaced with SVG or image for more accuracy */}
            </div>
            {/* Profile Avatar - left aligned */}
            <div className="absolute left-10 top-28 flex items-center">
              <div className="rounded-full border-4 border-white p-1 bg-white">
                <Image
                  src="/tanjiro.jpg"
                  alt="Profile Avatar"
                  width={90}
                  height={90}
                  className="rounded-full"
                />
              </div>
              {/* Stats - right of avatar, vertically centered, adjust only stats position */}
              <div className="flex flex-col justify-center ml-6 relative" style={{ top: '25px' }}>
                <div className="flex gap-8">
                  <div className="text-center">
                    <span className="text-xl font-semibold">1.25k</span>
                    <span className="text-gray-500 ml-1">Friends</span>
                    <span className="text-gray-500 ml-4">|</span>
                    <span className="text-black-500 ml-4 font-semibold">65</span>
                    <span className="text-gray-500 ml-1">Engineers</span>
                  </div>
                  
                </div>
              </div>
            </div>
            {/* Name & Verified */}
            <div className="flex items-center mt-19 ml-8">
              <span className="text-2xl font-bold">Kamado Tanjiro</span>
              <svg
                className="w-6 h-6 text-blue-500 ml-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm3.93 6.36l-4.24 4.24a1 1 0 01-1.41 0l-2.12-2.12a1 1 0 111.41-1.41l1.41 1.41 3.54-3.54a1 1 0 111.41 1.41z" />
              </svg>
            </div>
            {/* Bio */}
            <div className="text-left text-gray-600 mt-2 px-8">
              A kind-hearted Demon Slayer who fights to protect humanity while seeking a cure for his sister Nezuko.
            </div>
            {/* Tabs */}
            <div className="flex justify-center mt-6 border-b border-gray-200">
              <button className="px-6 py-3 font-medium text-gray-700 bg-gray-100 rounded-t-xl">
                Reposts
              </button>
              <button className="px-6 py-3 font-medium text-gray-700">Friends</button>
              <button className="px-6 py-3 font-medium text-gray-700">
                Likes
              </button>
              <button className="px-6 py-3 font-medium text-gray-700">
                Saved
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
