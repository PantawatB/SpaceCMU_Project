"use client";

import { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Chatbox from "../../components/Chatbox";
import Image from "next/image";

export default function FeedsMainPage() {
  const [showShareBar, setShowShareBar] = useState(true);
  const [showFeedFilter, setShowFeedFilter] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("Global");

  const filterOptions = [
    { id: "Global", label: "Global" },
    { id: "Friends", label: "Friends" },
    { id: "Announcements", label: "Announcements" },
    { id: "Events", label: "Events" },
    { id: "Questions", label: "Questions" },
    { id: "Marketplace", label: "Marketplace" },
  ];

  const handleFilterSelect = (filterId: string) => {
    setSelectedFilter(filterId);
    setShowFeedFilter(false);
  };

  return (
    <div className="flex h-screen bg-white text-gray-800">
      {/* Sidebar (Left) */}
      <Sidebar />
      {/* Main Content (Center) */}
      <main className="flex-1 pt-8 px-8 pb-0 flex flex-col gap-4 relative">
        {/* Search bar */}
        <div className="mb-2">
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
        {/* Feeds Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Feeds</h1>
            <span className="text-xl text-gray-400">|</span>
            <span className="text-lg font-semibold text-gray-700">
              {selectedFilter}
            </span>
          </div>
          {/* Filter Dropdown Button - 3 lines icon */}
          <div className="relative">
            <button
              onClick={() => setShowFeedFilter(!showFeedFilter)}
              className="flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6 text-gray-700"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showFeedFilter && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Select Feed Type
                </div>
                <div className="py-1">
                  {filterOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleFilterSelect(option.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition text-left ${
                        selectedFilter === option.id
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700"
                      }`}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                      {selectedFilter === option.id && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2.5}
                          stroke="currentColor"
                          className="w-4 h-4 ml-auto text-blue-600"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Feeds Section: scrollable only for posts */}
        <section className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
          {/* โพสต์ตัวอย่าง 10 โพสต์ */}
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className={"bg-gray-50 rounded-2xl p-6 shadow  relative"}
            >
              <div className="flex items-center gap-3 mb-2">
                <Image
                  src={i % 2 === 0 ? "/tanjiro.jpg" : "/noobcat.png"}
                  alt="avatar"
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
                <div>
                  <div className="font-bold">
                    {i % 2 === 0 ? "Kamado Tanjiro" : "Noobcat"}
                  </div>
                  <div className="text-xs text-gray-400">
                    {i % 2 === 0 ? "65,Engineering" : "Anonymous"}
                  </div>
                  <div className="text-xs text-gray-400">{i + 1} hours ago</div>
                </div>
              </div>
              <div className="mb-2 text-base font-semibold">
                {i % 2 === 0
                  ? "I love my family so much!"
                  : "Just chilling and enjoying life."}
              </div>
              <div className="flex gap-3 mb-2">
                <Image
                  src={
                    i % 2 === 0 ? "/tanjiro_with_family.webp" : "/cat-post.jpg"
                  }
                  alt="avatar"
                  width={480}
                  height={40}
                  className="object-cover"
                />
              </div>

              {/* Post actions */}
              <div className="flex gap-6 text-gray-500 text-base mt-6">
                <span className="text-pink-500 font-semibold">Like</span>
                <span>Comment</span>
                <span>Share</span>
              </div>
              <button className="absolute top-6 right-6 text-gray-400 text-2xl">
                ⋮
              </button>
            </div>
          ))}
        </section>
        {/* Share something bar - fixed bottom, larger size, toggle show/hide with arrow icon */}
        <div
          className={`fixed left-80 right-80 bottom-6 z-10 flex flex-col items-center ${
            showShareBar ? "" : "bg-transparent p-0 shadow-none"
          }`}
        >
          <button
            className="mb-2 text-2xl text-gray-500 bg-gray-200 rounded-full p-1 hover:bg-gray-300 flex items-center justify-center"
            onClick={() => setShowShareBar((prev) => !prev)}
            style={{ width: "40px", height: "40px" }}
            aria-label={showShareBar ? "Hide Share Bar" : "Show Share Bar"}
          >
            {showShareBar ? (
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="w-6 h-6"
              >
                <path d="M6 15l6-6 6 6" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="w-6 h-6"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            )}
          </button>
          {showShareBar && (
            <div className="bg-gray-50 rounded-xl shadow-lg px-8 py-5 flex flex-col gap-3 w-full max-w-3xl">
              <div className="flex items-center gap-3">
                <Image
                  src="/tanjiro.jpg"
                  alt="avatar"
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />

                <input
                  type="text"
                  placeholder="Share something"
                  className="flex-1 px-5 py-3 rounded-full bg-white text-gray-500 border-none outline-none text-lg"
                />
                <span className="text-2xl text-gray-400">😊</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-6">
                  <button className="flex items-center gap-2 text-gray-700 font-medium hover:text-black text-base">
                    <svg
                      width="24"
                      height="24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-6 h-6"
                    >
                      <rect x="4" y="7" width="16" height="13" rx="2" />
                      <path d="M4 7V5a2 2 0 012-2h12a2 2 0 012 2v2" />
                    </svg>
                    File
                  </button>
                  <button className="flex items-center gap-2 text-gray-700 font-medium hover:text-black text-base">
                    <svg
                      width="24"
                      height="24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-6 h-6"
                    >
                      <circle cx="12" cy="12" r="4" />
                      <rect x="4" y="4" width="16" height="16" rx="4" />
                    </svg>
                    Image
                  </button>
                  <button className="flex items-center gap-2 text-gray-700 font-medium hover:text-black text-base">
                    <svg
                      width="24"
                      height="24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-6 h-6"
                    >
                      <circle cx="12" cy="10" r="3" />
                      <path d="M12 13v7" />
                      <path d="M5 20h14" />
                    </svg>
                    Location
                  </button>
                  <button className="flex items-center gap-2 text-gray-700 font-medium hover:text-black text-base">
                    <svg
                      width="24"
                      height="24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-6 h-6"
                    >
                      <circle cx="12" cy="12" r="8" />
                      <path d="M12 2v20M2 12h20" />
                    </svg>
                    Public <span className="ml-1">▼</span>
                  </button>
                </div>
                <button className="bg-black text-white px-8 py-3 rounded-full font-semibold text-lg hover:bg-gray-800 transition">
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      {/* Right Section: Recent Active Friends (no border) */}
      <aside className="w-80 p-8 bg-white flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-bold mb-4">Recent Active Friends</h2>
          <ul className="space-y-4">
            <li className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div>
                <div className="font-medium">People 1</div>
                <div className="text-xs text-gray-400">Active now</div>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div>
                <div className="font-medium">People 2</div>
                <div className="text-xs text-gray-400">Active 2m ago</div>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div>
                <div className="font-medium">People 3</div>
                <div className="text-xs text-gray-400">Active 5m ago</div>
              </div>
            </li>
          </ul>
        </div>
      </aside>

      {/* Chatbox - Bottom Right */}
      <Chatbox />
    </div>
  );
}
