"use client";

import Sidebar from "../../components/Sidebar";
import Chatbox from "../../components/Chatbox";
import React from "react";
import Image from "next/image";

// Friend card component
interface FriendCardProps {
  name: string;
  bio: string;
  followed: boolean;
  onFollow: () => void;
  onRemove: () => void;
}
function FriendCard({ name, bio, followed, onFollow, onRemove }: FriendCardProps) {
  return (
    <div className="relative rounded-xl overflow-hidden flex flex-col items-center shadow-lg bg-white font-Roboto-light mb-6 w-full">
      <div className="h-16 sm:h-20 md:h-24 w-full bg-gray-500"></div>
      <div className="top-24 z-10 flex items-center flex-col gap-2 sm:gap-3 md:gap-4 px-3 sm:px-4 md:px-5 py-3 sm:py-4 md:py-5">
        <div className="-mt-10 sm:-mt-12 md:-mt-16">
          <Image
            src="/tanjiro.jpg"
            alt="Profile Avatar"
            width={60}
            height={60}
            className="rounded-full border-2 border-white shadow sm:w-[65px] sm:h-[65px] md:w-[75px] md:h-[75px]"
          />
        </div>
        <div className="flex items-center flex-col">
          <p title="name" className="text-black font-Roboto-md text-sm sm:text-base">
            {name}
          </p>
          <p title="bio" className="text-xs text-gray-500 font-medium text-center">
            {bio}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            className={`bg-gray-600 transition-all gradient text-xs sm:text-sm md:text-[15px] text-white px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1 ${followed ? "" : "opacity-50"}`}
            onClick={onFollow}
          >
            {followed ? "Accept" : "Friend"}
          </button>
          <button
            className="bg-gray-200/65 hover:bg-gray-200 transition-colors p-1.5 sm:p-2 rounded-full"
            onClick={onRemove}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-4 h-4 sm:w-5 sm:h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function HorizontalScrollSection({ title, items }: { title: string; items: FriendCardProps[] }) {
  const [startIdx, setStartIdx] = React.useState(0);
  const visibleCount = 4;
  const canGoBack = startIdx > 0;
  const canGoNext = startIdx + visibleCount < items.length;
  const visibleItems = items.slice(startIdx, startIdx + visibleCount);
  return (
    <section className="mb-10 relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-semibold">{title}</h2>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setStartIdx(Math.max(0, startIdx - visibleCount))}
            className={`p-1.5 sm:p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors ${!canGoBack ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!canGoBack}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            onClick={() => setStartIdx(Math.min(items.length - visibleCount, startIdx + visibleCount))}
            className={`p-1.5 sm:p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors ${!canGoNext ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!canGoNext}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
        {visibleItems.map((f, idx) => (
          <div key={idx} className="max-w-xs mx-auto sm:mx-0 w-full">
            <FriendCard {...f} />
          </div>
        ))}
      </div>
    </section>
  );
}

// Mock data
const friendRequests: FriendCardProps[] = [
  {
    name: "People 1",
    bio: "In the business of making things happen",
    followed: true,
    onFollow: () => {},
    onRemove: () => {},
  },
  {
    name: "People 2",
    bio: "Coffee lover & developer",
    followed: false,
    onFollow: () => {},
    onRemove: () => {},
  },
  {
    name: "People 3",
    bio: "Frontend wizard & cat lover",
    followed: false,
    onFollow: () => {},
    onRemove: () => {},
  },
  {
    name: "People 4",
    bio: "Backend engineer, runner",
    followed: true,
    onFollow: () => {},
    onRemove: () => {},
  },
  {
    name: "Anna Ivanova",
    bio: "UX/UI designer, traveler",
    followed: false,
    onFollow: () => {},
    onRemove: () => {},
  },
];
const peopleYouMayKnow: FriendCardProps[] = [
  {
    name: "People 5",
    bio: "Design is my passion",
    followed: false,
    onFollow: () => {},
    onRemove: () => {},
  },
  {
    name: "People 6",
    bio: "Always learning",
    followed: false,
    onFollow: () => {},
    onRemove: () => {},
  },
  {
    name: "People 7",
    bio: "Fullstack developer",
    followed: false,
    onFollow: () => {},
    onRemove: () => {},
  },
  {
    name: "People 8",
    bio: "Marketing & growth hacker",
    followed: false,
    onFollow: () => {},
    onRemove: () => {},
  },
  {
    name: "Tomás García",
    bio: "React Native expert",
    followed: false,
    onFollow: () => {},
    onRemove: () => {},
  },
];

export default function FriendsMainPage() {

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
        <div className="flex flex-col">
          <HorizontalScrollSection title="Friend Requests" items={friendRequests} />
          <HorizontalScrollSection title="People you may know" items={peopleYouMayKnow} />
        </div>
      </main>

      {/* Chatbox - Bottom Right */}
      <Chatbox />
    </div>
  );
}
