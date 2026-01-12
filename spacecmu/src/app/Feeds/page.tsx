"use client";

import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Chatbox from "../../components/Chatbox";
import PostCard from "../../components/PostCard";
import Image from "next/image";
import { API_CONFIG } from "@/lib/config";
import { useUser } from "@/contexts/UserContext";

interface PostMedia {
  id: number;
  postId: number;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  order: number;
  fileSize: number | null;
}

interface Post {
  id: number;
  userId: number;
  content: string;
  category: string;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  createdAt: string;
  author?: {
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  media?: PostMedia[];
}

export default function FeedsMainPage() {
  const { activeUser } = useUser();
  const [showFeedFilter, setShowFeedFilter] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("Global");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showShareBar, setShowShareBar] = useState(true);
  const [postText, setPostText] = useState("");
  const [postMode, setPostMode] = useState<string | null>(null);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
  const [showReportPopup, setShowReportPopup] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportMood, setReportMood] = useState<'happy' | 'sad' | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch posts when selectedFilter changes
  useEffect(() => {
    const fetchPosts = async () => {
      // Only fetch for Global category
      if (selectedFilter !== 'Global') {
        setPosts([]);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `${API_CONFIG.BASE_URL}/api/posts?category=${selectedFilter}&limit=20`,
          {
            credentials: 'include',
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Handle both array response and object with posts property
        const postsArray = Array.isArray(data) ? data : data.posts || [];
        setPosts(postsArray);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError('Failed to load posts');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [selectedFilter]);

  const postModes = [
    { id: "Global", label: "Global" },
    { id: "Friends", label: "Friends" },
    { id: "Announcements", label: "Announcements" },
    { id: "Events", label: "Events" },
    { id: "Questions", label: "Questions" },
    { id: "Marketplace", label: "Marketplace" },
    { id: "Shops", label: "Shops" },
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

  const handleSendPost = async () => {
    if (!postMode) return;
    
    try {
      // Create FormData for multipart/form-data
      const formData = new FormData();
      
      // Add text content and category
      formData.append('content', postText);
      formData.append('category', postMode);
      
      // Add all images
      selectedImages.forEach((image) => {
        formData.append('media', image);
      });
      
      // Add all videos
      selectedVideos.forEach((video) => {
        formData.append('media', video);
      });
      
      // Send to API
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/posts/media`, {
        method: 'POST',
        credentials: 'include', // Important: Include cookies for authentication
        body: formData,
        // Don't set Content-Type header - browser will set it automatically with boundary
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Post created successfully:', result);
      alert('Post created successfully!');
      
      // Reset form
      setPostText("");
      setPostMode(null);
      setSelectedImages([]);
      setSelectedVideos([]);
      
      // Refresh feed to show new post
      if (selectedFilter === 'Global') {
        const response = await fetch(
          `${API_CONFIG.BASE_URL}/api/posts?category=${selectedFilter}&limit=20`,
          {
            credentials: 'include',
          }
        );
        if (response.ok) {
          const data = await response.json();
          const postsArray = Array.isArray(data) ? data : data.posts || [];
          setPosts(postsArray);
        }
      }
      
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    }
  };

  const canSendPost = postMode !== null && (postText.trim() !== "" || selectedImages.length > 0 || selectedVideos.length > 0);

  const filterOptions = [
    { id: "Global", label: "Global" },
    { id: "Friends", label: "Friends" },
    { id: "Announcements", label: "Announcements" },
    { id: "Events", label: "Events" },
    { id: "Questions", label: "Questions" },
    { id: "Marketplace", label: "Marketplace" },
    { id: "Shops", label: "Shops" },
  ];

  const handleFilterSelect = (filterId: string) => {
    setSelectedFilter(filterId);
    setShowFeedFilter(false);
  };

  // Handle like count update
  const handleLikeUpdate = (postId: number, newLikeCount: number) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, likeCount: newLikeCount }
          : post
      )
    );
  };

  // Handle repost count update
  const handleRepostUpdate = (postId: number, newRepostCount: number) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, repostCount: newRepostCount }
          : post
      )
    );
  };

  // Handle save update
  const handleSaveUpdate = () => {
    console.log('Post save status updated');
  };

  // Mock posts (เก็บไว้สำหรับ reference)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockPosts = [...Array(10)].map((_, i) => ({
    id: i,
    author: {
      name: i % 2 === 0 ? "Kamado Tanjiro" : "Noobcat",
      info: i % 2 === 0 ? "65,Engineering" : "Anonymous",
      avatar: i % 2 === 0 ? "/tanjiro.jpg" : "/noobcat.png",
    },
    content: i % 2 === 0 ? "I love my family so much!" : "Just chilling and enjoying life.",
    image: i % 2 === 0 ? "/tanjiro_with_family.webp" : "/cat-post.jpg",
    timeAgo: `${i + 1} hours ago`,
  }));

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
            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-500">Loading posts...</div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="flex justify-center items-center py-12">
                <div className="text-red-500">{error}</div>
              </div>
            )}

            {/* No Posts Message */}
            {!loading && !error && posts.length === 0 && selectedFilter === 'Global' && (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-500">No posts available</div>
              </div>
            )}

            {/* Other Categories Message */}
            {!loading && selectedFilter !== 'Global' && (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-500">Feature coming soon for {selectedFilter} category</div>
              </div>
            )}

            {/* Real Posts from API (for Global category) */}
            {!loading && !error && selectedFilter === 'Global' && posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                onLikeUpdate={handleLikeUpdate}
                onRepostUpdate={handleRepostUpdate}
                onSaveUpdate={handleSaveUpdate}
              />
            ))}
          </section>
          
          {/* Report Popup */}
          {showReportPopup && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowReportPopup(false)}>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
                <h1 className="text-2xl font-bold capitalize text-slate-400 mb-4">
                  Feedback
                </h1>
                
                <textarea 
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  className="w-full min-h-28 resize-none bg-slate-100 p-3 outline-none ring-2 ring-slate-200 duration-300 placeholder:text-slate-400 focus:ring-slate-400 rounded-md text-slate-600 mb-3" 
                  placeholder="What's Your Feedback?" 
                />
                
                <div className="flex gap-3 mb-3">
                  <button 
                    onClick={() => setReportMood('happy')}
                    className={`flex items-center justify-center bg-slate-100 p-3 ring-2 ring-slate-200 duration-300 focus:ring-slate-400 rounded-md ${reportMood === 'happy' ? 'ring-slate-400' : ''}`}
                  >
                    <svg viewBox="0 0 512 512" height="20px" xmlns="http://www.w3.org/2000/svg" className="fill-slate-500">
                      <path d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm177.6 62.1C192.8 334.5 218.8 352 256 352s63.2-17.5 78.4-33.9c9-9.7 24.2-10.4 33.9-1.4s10.4 24.2 1.4 33.9c-22 23.8-60 49.4-113.6 49.4s-91.7-25.5-113.6-49.4c-9-9.7-8.4-24.9 1.4-33.9s24.9-8.4 33.9 1.4zm40-89.3l0 0 0 0-.2-.2c-.2-.2-.4-.5-.7-.9c-.6-.8-1.6-2-2.8-3.4c-2.5-2.8-6-6.6-10.2-10.3c-8.8-7.8-18.8-14-27.7-14s-18.9 6.2-27.7 14c-4.2 3.7-7.7 7.5-10.2 10.3c-1.2 1.4-2.2 2.6-2.8 3.4c-.3 .4-.6 .7-.7 .9l-.2 .2 0 0 0 0 0 0c-2.1 2.8-5.7 3.9-8.9 2.8s-5.5-4.1-5.5-7.6c0-17.9 6.7-35.6 16.6-48.8c9.8-13 23.9-23.2 39.4-23.2s29.6 10.2 39.4 23.2c9.9 13.2 16.6 30.9 16.6 48.8c0 3.4-2.2 6.5-5.5 7.6s-6.9 0-8.9-2.8l0 0 0 0zm160 0l0 0-.2-.2c-.2-.2-.4-.5-.7-.9c-.6-.8-1.6-2-2.8-3.4c-2.5-2.8-6-6.6-10.2-10.3c-8.8-7.8-18.8-14-27.7-14s-18.9 6.2-27.7 14c-4.2 3.7-7.7 7.5-10.2 10.3c-1.2 1.4-2.2 2.6-2.8 3.4c-.3 .4-.6 .7-.7 .9l-.2 .2 0 0 0 0 0 0c-2.1 2.8-5.7 3.9-8.9 2.8s-5.5-4.1-5.5-7.6c0-17.9 6.7-35.6 16.6-48.8c9.8-13 23.9-23.2 39.4-23.2s29.6 10.2 39.4 23.2c9.9 13.2 16.6 30.9 16.6 48.8c0 3.4-2.2 6.5-5.5 7.6s-6.9 0-8.9-2.8l0 0 0 0 0 0z" />
                    </svg>
                  </button>
                  
                  <button 
                    onClick={() => setReportMood('sad')}
                    className={`flex items-center justify-center bg-slate-100 p-3 ring-2 ring-slate-200 duration-300 focus:ring-slate-400 rounded-md ${reportMood === 'sad' ? 'ring-slate-400' : ''}`}
                  >
                    <svg viewBox="0 0 512 512" height="20px" xmlns="http://www.w3.org/2000/svg" className="fill-slate-500">
                      <path d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zM174.6 384.1c-4.5 12.5-18.2 18.9-30.7 14.4s-18.9-18.2-14.4-30.7C146.9 319.4 198.9 288 256 288s109.1 31.4 126.6 79.9c4.5 12.5-2 26.2-14.4 30.7s-26.2-2-30.7-14.4C328.2 358.5 297.2 336 256 336s-72.2 22.5-81.4 48.1zM144.4 208a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm192-32a32 32 0 1 1 0 64 32 32 0 1 1 0-64z" />
                    </svg>
                  </button>
                  
                  <div className="flex-1" />
                  
                  <button 
                    onClick={() => {
                      // TODO: Submit report
                      console.log("Submitting report:", { text: reportText, mood: reportMood });
                      setReportText("");
                      setReportMood(null);
                      setShowReportPopup(false);
                    }}
                    className="flex items-center justify-center bg-slate-100 px-4 py-3 ring-2 ring-slate-200 duration-300 hover:ring-slate-400 rounded-md"
                  >
                    <svg viewBox="0 0 512 512" height="20px" xmlns="http://www.w3.org/2000/svg" className="fill-slate-500">
                      <path d="M16.1 260.2c-22.6 12.9-20.5 47.3 3.6 57.3L160 376V479.3c0 18.1 14.6 32.7 32.7 32.7c9.7 0 18.9-4.3 25.1-11.8l62-74.3 123.9 51.6c18.9 7.9 40.8-4.5 43.9-24.7l64-416c1.9-12.1-3.4-24.3-13.5-31.2s-23.3-7.5-34-1.4l-448 256zm52.1 25.5L409.7 90.6 190.1 336l1.2 1L68.2 285.7zM403.3 425.4L236.7 355.9 450.8 116.6 403.3 425.4z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
          
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
                    src={activeUser?.avatarUrl || "/noobcat.png"}
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
                        <span className="truncate max-w-20 sm:max-w-none">{postMode || "Select Feed"}</span>
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
