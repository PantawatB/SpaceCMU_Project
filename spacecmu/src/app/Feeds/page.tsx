"use client";

import { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Chatbox from "../../components/Chatbox";
import Image from "next/image";

export default function FeedsMainPage() {
  const [showFeedFilter, setShowFeedFilter] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("Global");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showShareBar, setShowShareBar] = useState(true);
  const [postText, setPostText] = useState("");
  const [postMode, setPostMode] = useState<string | null>(null);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<File[]>([]);

  const postModes = [
    { id: "Global", label: "Global" },
    { id: "Friends", label: "Friends" },
    { id: "Announcements", label: "Announcements" },
    { id: "Events", label: "Events" },
    { id: "Questions", label: "Questions" },
    { id: "Marketplace", label: "Marketplace" },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedImages(Array.from(e.target.files));
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedVideos(Array.from(e.target.files));
    }
  };

  const handleSendPost = () => {
    if (!postMode) return;
    
    // TODO: Send post to API
    console.log("Sending post:", {
      text: postText,
      mode: postMode,
      images: selectedImages,
      videos: selectedVideos,
    });
    
    // Reset form
    setPostText("");
    setPostMode(null);
    setSelectedImages([]);
    setSelectedVideos([]);
  };

  const canSendPost = postMode !== null && (postText.trim() !== "" || selectedImages.length > 0 || selectedVideos.length > 0);

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
    <div className="flex h-screen bg-white text-gray-800 overflow-hidden min-w-[375px]">
        {/* Mobile Sidebar Overlay */}
        {showMobileSidebar && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}
        
        {/* Sidebar (Left) - Hidden on mobile, slide-in on mobile when toggled */}
        <div className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:transform-none ${
          showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          <Sidebar />
        </div>
        
        {/* Main Content (Center) */}
        <main className="flex-1 pt-8 px-8 pb-0 flex flex-col gap-4 relative overflow-hidden">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition"
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
          <div className="flex items-center justify-between ">
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
          <section className="flex-1 overflow-y-auto  flex flex-col gap-6 pb-24">
            {/* โพสต์ตัวอย่าง 10 โพสต์ */}
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className={"bg-gray-50 rounded-2xl p-6 shadow relative"}
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
                    <div className="text-xs text-gray-400">
                      {i + 1} hours ago
                    </div>
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
          {/* Share something bar - fixed bottom with toggle */}
          <div className="fixed bottom-4 left-8 right-22 md:left-8 md:right-22 lg:left-72 lg:right-96 z-10 flex flex-col items-center">
            {/* Toggle Button */}
            <button
              className="mb-2 text-gray-500 bg-white/95 backdrop-blur-sm rounded-full p-2 hover:bg-gray-100 shadow-lg flex items-center justify-center transition-all duration-200"
              onClick={() => setShowShareBar((prev) => !prev)}
              style={{ width: "32px", height: "32px" }}
              aria-label={showShareBar ? "Hide Share Bar" : "Show Share Bar"}
            >
              {showShareBar ? (
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="w-5 h-5"
                >
                  <path d="M6 15l6-6 6 6" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="w-5 h-5"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              )}
            </button>

            {/* Share Bar Content */}
            {showShareBar && (
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 sm:p-5 w-full max-w-2xl">
                {/* Row 1: Avatar + Text Input */}
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <Image
                    src="/tanjiro.jpg"
                    alt="avatar"
                    width={40}
                    height={40}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shrink-0"
                  />
                  <input
                    type="text"
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder="What's on your mind?"
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-gray-50 text-gray-800 placeholder-gray-400 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white text-sm sm:text-base transition-all"
                  />
                </div>

                {/* Media Preview - Show when files selected */}
                {(selectedImages.length > 0 || selectedVideos.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3 max-h-20 sm:max-h-24 overflow-y-auto">
                    {selectedImages.map((img, idx) => (
                      <div key={`img-${idx}`} className="relative">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500 overflow-hidden">
                          <span className="truncate px-1 text-center text-[10px] sm:text-xs">📷 {img.name.slice(0, 3)}...</span>
                        </div>
                        <button
                          onClick={() => setSelectedImages(selectedImages.filter((_, i) => i !== idx))}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-xs hover:bg-red-600 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {selectedVideos.map((vid, idx) => (
                      <div key={`vid-${idx}`} className="relative">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500 overflow-hidden">
                          <span className="truncate px-1 text-center text-[10px] sm:text-xs">🎥 {vid.name.slice(0, 3)}...</span>
                        </div>
                        <button
                          onClick={() => setSelectedVideos(selectedVideos.filter((_, i) => i !== idx))}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-xs hover:bg-red-600 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Row 2: Action Buttons */}
                <div className="flex items-center justify-between gap-1 sm:gap-2 pt-2 sm:pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    {/* Image Upload */}
                    <label className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer transition-all group">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 group-hover:scale-110 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs sm:text-sm font-medium hidden xs:inline">Photo</span>
                    </label>

                    {/* Video Upload */}
                    <label className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer transition-all group">
                      <input
                        type="file"
                        accept="video/*"
                        multiple
                        onChange={handleVideoUpload}
                        className="hidden"
                      />
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 group-hover:scale-110 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs sm:text-sm font-medium hidden xs:inline">Video</span>
                    </label>

                    {/* Mode Selector */}
                    <div className="relative">
                      <button
                        onClick={() => setShowModeDropdown(!showModeDropdown)}
                        className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                          postMode
                            ? "bg-blue-50 text-blue-600 border border-blue-200"
                            : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className="truncate max-w-[80px] sm:max-w-none">{postMode || "Select Feed"}</span>
                        <svg
                          className={`w-2.5 h-2.5 sm:w-3 sm:h-3 transition-transform shrink-0 ${showModeDropdown ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Mode Dropdown */}
                      {showModeDropdown && (
                        <div className="absolute left-0 bottom-full mb-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-30 max-h-64 overflow-y-auto">
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Select Feed Type
                          </div>
                          {postModes.map((mode) => (
                            <button
                              key={mode.id}
                              onClick={() => {
                                setPostMode(mode.id);
                                setShowModeDropdown(false);
                              }}
                              className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition text-left ${
                                postMode === mode.id ? "bg-blue-50" : ""
                              }`}
                            >
                              <span className={`text-sm font-medium ${
                                postMode === mode.id ? "text-blue-600" : "text-gray-700"
                              }`}>
                                {mode.label}
                              </span>
                              {postMode === mode.id && (
                                <svg
                                  className="w-4 h-4 text-blue-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleSendPost}
                    disabled={!canSendPost}
                    className={`px-4 sm:px-7 py-1.5 sm:py-2 rounded-full font-semibold text-sm sm:text-base transition-all whitespace-nowrap ${
                      canSendPost
                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl hover:scale-105"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    Post
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
        {/* Right Section: Recent Active Friends (no border) - Hidden together with Sidebar (show at lg and up) */}
        <aside className="hidden lg:flex w-80 p-8 bg-white flex-col gap-6">
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
