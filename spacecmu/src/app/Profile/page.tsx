"use client";

import Sidebar from "../../components/Sidebar";
import Chatbox from "../../components/Chatbox";
import PostCard from "../../components/PostCard";
import TokenErrorPopup from "../../components/TokenErrorPopup";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { API_CONFIG } from "@/lib/config";

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

export default function ProfileMainPage() {
  const { activeUser } = useUser();
  const [activeTab, setActiveTab] = useState("Posts");
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [repostedPosts, setRepostedPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTokenErrorPopup, setShowTokenErrorPopup] = useState(false);

  // Global token error listener
  useEffect(() => {
    const handleTokenError = () => {
      setShowTokenErrorPopup(true);
    };

    window.addEventListener('tokenError', handleTokenError);
    
    return () => {
      window.removeEventListener('tokenError', handleTokenError);
    };
  }, []);

  // Fetch user's posts when "Posts" tab is active
  useEffect(() => {
    const fetchMyPosts = async () => {
      if (activeTab !== 'Posts' || !activeUser) return;

      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `${API_CONFIG.BASE_URL}/api/posts/me`,
          {
            credentials: 'include',
          }
        );

        if (!response.ok) {
          // Check for token errors
          if (response.status === 401) {
            const errorData = await response.json().catch(() => ({}));
            if (errorData.message === "No token provided" || errorData.message?.includes("token")) {
              setShowTokenErrorPopup(true);
              return;
            }
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('My posts raw response:', data);
        console.log('First post structure:', data[0]);
        
        // The response might be an array of posts or an object with posts property
        let postsData = Array.isArray(data) ? data : (data.posts || []);
        
        // Make sure each post has the author property
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postsData = postsData.map((post: any) => ({
          ...post,
          author: post.author || {
            firstName: null,
            lastName: null,
            avatarUrl: null
          }
        }));
        
        console.log('Processed my posts:', postsData);
        setMyPosts(postsData);
      } catch (err) {
        console.error('Error fetching my posts:', err);
        // Check if it's a token error
        if (err instanceof Error && err.message.includes("token")) {
          setShowTokenErrorPopup(true);
        } else {
          setError('Failed to load posts');
        }
        setMyPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMyPosts();
  }, [activeTab, activeUser]);

  // Fetch liked posts when "Liked" tab is active
  useEffect(() => {
    const fetchLikedPosts = async () => {
      if (activeTab !== 'Liked' || !activeUser) return;

      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `${API_CONFIG.BASE_URL}/api/posts/liked/me`,
          {
            credentials: 'include',
          }
        );

        if (!response.ok) {
          // Check for token errors
          if (response.status === 401) {
            const errorData = await response.json().catch(() => ({}));
            if (errorData.message === "No token provided" || errorData.message?.includes("token")) {
              setShowTokenErrorPopup(true);
              return;
            }
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Liked posts raw response:', data);
        console.log('First post structure:', data[0]);
        
        // The response might be an array of posts or an object with posts property
        let postsData = Array.isArray(data) ? data : (data.posts || []);
        
        // Make sure each post has the author property
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postsData = postsData.map((post: any) => ({
          ...post,
          author: post.author || {
            firstName: null,
            lastName: null,
            avatarUrl: null
          }
        }));
        
        console.log('Processed posts:', postsData);
        setLikedPosts(postsData);
      } catch (err) {
        console.error('Error fetching liked posts:', err);
        // Check if it's a token error
        if (err instanceof Error && err.message.includes("token")) {
          setShowTokenErrorPopup(true);
        } else {
          setError('Failed to load liked posts');
        }
        setLikedPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLikedPosts();
  }, [activeTab, activeUser]);

  // Fetch reposted posts when "Reposts" tab is active
  useEffect(() => {
    const fetchRepostedPosts = async () => {
      if (activeTab !== 'Reposts' || !activeUser) return;

      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `${API_CONFIG.BASE_URL}/api/posts/reposted/me`,
          {
            credentials: 'include',
          }
        );

        if (!response.ok) {
          // Check for token errors
          if (response.status === 401) {
            const errorData = await response.json().catch(() => ({}));
            if (errorData.message === "No token provided" || errorData.message?.includes("token")) {
              setShowTokenErrorPopup(true);
              return;
            }
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Reposted posts raw response:', data);
        console.log('First reposted post structure:', data[0]);
        
        // The response might be an array of posts or an object with posts property
        let postsData = Array.isArray(data) ? data : (data.posts || []);
        
        // Make sure each post has the author property
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postsData = postsData.map((post: any) => ({
          ...post,
          author: post.author || {
            firstName: null,
            lastName: null,
            avatarUrl: null
          }
        }));
        
        console.log('Processed reposted posts:', postsData);
        setRepostedPosts(postsData);
      } catch (err) {
        console.error('Error fetching reposted posts:', err);
        // Check if it's a token error
        if (err instanceof Error && err.message.includes("token")) {
          setShowTokenErrorPopup(true);
        } else {
          setError('Failed to load reposted posts');
        }
        setRepostedPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRepostedPosts();
  }, [activeTab, activeUser]);

  // Fetch saved posts when "Saved" tab is active
  useEffect(() => {
    const fetchSavedPosts = async () => {
      if (activeTab !== 'Saved' || !activeUser) return;

      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `${API_CONFIG.BASE_URL}/api/posts/saved/me`,
          {
            credentials: 'include',
          }
        );

        if (!response.ok) {
          // Check for token errors
          if (response.status === 401) {
            const errorData = await response.json().catch(() => ({}));
            if (errorData.message === "No token provided" || errorData.message?.includes("token")) {
              setShowTokenErrorPopup(true);
              return;
            }
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Saved posts raw response:', data);
        console.log('First saved post structure:', data[0]);
        
        // The response might be an array of posts or an object with posts property
        let postsData = Array.isArray(data) ? data : (data.posts || []);
        
        // Make sure each post has the author property
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postsData = postsData.map((post: any) => ({
          ...post,
          author: post.author || {
            firstName: null,
            lastName: null,
            avatarUrl: null
          }
        }));
        
        console.log('Processed saved posts:', postsData);
        setSavedPosts(postsData);
      } catch (err) {
        console.error('Error fetching saved posts:', err);
        // Check if it's a token error
        if (err instanceof Error && err.message.includes("token")) {
          setShowTokenErrorPopup(true);
        } else {
          setError('Failed to load saved posts');
        }
        setSavedPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedPosts();
  }, [activeTab, activeUser]);

  if (!activeUser) return null;

  // Get display name
  const displayName = `${activeUser.firstName} ${activeUser.lastName}`;
  // Get avatar URL with fallback
  const avatarUrl = activeUser.avatarUrl || "/tanjiro.jpg";
  // Get bio with fallback
  const bio = activeUser.bio || "This user has no bio yet.";
  // Get faculty display
  const facultyDisplay = activeUser.faculty || "Unknown";

  // Handle like count update
  const handleLikeUpdate = (postId: number, newLikeCount: number) => {
    setMyPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, likeCount: newLikeCount }
          : post
      )
    );
    setLikedPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, likeCount: newLikeCount }
          : post
      )
    );
    setRepostedPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, likeCount: newLikeCount }
          : post
      )
    );
    setSavedPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, likeCount: newLikeCount }
          : post
      )
    );
  };

  // Handle repost count update
  const handleRepostUpdate = (postId: number, newRepostCount: number) => {
    setMyPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, repostCount: newRepostCount }
          : post
      )
    );
    setLikedPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, repostCount: newRepostCount }
          : post
      )
    );
    setRepostedPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, repostCount: newRepostCount }
          : post
      )
    );
    setSavedPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, repostCount: newRepostCount }
          : post
      )
    );
  };

  // Handle save update (refresh saved posts list)
  const handleSaveUpdate = () => {
    // Optionally refresh the saved posts list
    if (activeTab === 'Saved' && activeUser) {
      // Trigger a re-fetch by toggling state or calling fetch directly
      console.log('Post save status updated');
    }
  };

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
              <div className="h-40 w-full relative">
                {activeUser.bannerUrl ? (
                  <Image
                    src={activeUser.bannerUrl}
                    alt="Profile Banner"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-linear-to-r from-pink-200 via-yellow-200 to-green-200" />
                )}
              </div>
              {/* Profile Avatar - left aligned */}
              <div className="absolute left-10 top-28 flex items-center">
                <div className="rounded-full border-4 border-white p-1 bg-white">
                  <Image
                    src={avatarUrl}
                    alt="Profile Avatar"
                    width={90}
                    height={90}
                    className="rounded-full object-cover"
                  />
                </div>
                {/* Stats - right of avatar, vertically centered, adjust only stats position */}
                <div
                  className="flex flex-col justify-center ml-6 relative"
                  style={{ top: "25px" }}
                >
                  <div className="flex gap-8">
                    <div className="text-center">
                      <span className="text-xl font-semibold">{activeUser.friendsCount}</span>
                      <span className="text-gray-500 ml-1">Friends</span>
                      <span className="text-gray-500 ml-4">|</span>
                      <span className="text-black-500 ml-4 font-semibold">
                        {facultyDisplay}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Name & Verified */}
              <div className="flex items-center mt-19 ml-8">
                <span className="text-2xl font-bold">{displayName}</span>
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
                {bio}
              </div>
              {/* Tabs */}
              <div className="flex justify-center mt-6 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("Posts")}
                  className={`px-6 py-3 font-medium flex items-center gap-2 ${
                    activeTab === "Posts"
                      ? "text-blue-600 bg-blue-50 rounded-t-xl border-b-2 border-blue-600"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6"
                  >
                    {/* กระดาษ */}
                    <path d="M6 3h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />

                    {/* เส้นข้อความด้านซ้าย */}
                    <path d="M8 7h5" />
                    <path d="M8 10h5" />
                    <path d="M8 13h5" />
                    <path d="M8 17h8" />
                  </svg>
                  Posts
                </button>
                <button
                  onClick={() => setActiveTab("Your Market Items")}
                  className={`px-6 py-3 font-medium flex items-center gap-2 ${
                    activeTab === "Your Market Items"
                      ? "text-blue-600 bg-blue-50 rounded-t-xl border-b-2 border-blue-600"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  Market Items
                </button>
                <button
                  onClick={() => setActiveTab("Friends")}
                  className={`px-6 py-3 font-medium flex items-center gap-2 ${
                    activeTab === "Friends"
                      ? "text-blue-600 bg-blue-50 rounded-t-xl border-b-2 border-blue-600"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4"
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
                  Friends
                </button>
                <button
                  onClick={() => setActiveTab("Reposts")}
                  className={`px-6 py-3 font-medium flex items-center gap-2 ${
                    activeTab === "Reposts"
                      ? "text-blue-600 bg-blue-50 rounded-t-xl border-b-2 border-blue-600"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Reposts
                </button>
                <button
                  onClick={() => setActiveTab("Liked")}
                  className={`px-6 py-3 font-medium flex items-center gap-2 ${
                    activeTab === "Liked"
                      ? "text-blue-600 bg-blue-50 rounded-t-xl border-b-2 border-blue-600"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  Liked
                </button>
                <button
                  onClick={() => setActiveTab("Saved")}
                  className={`px-6 py-3 font-medium flex items-center gap-2 ${
                    activeTab === "Saved"
                      ? "text-blue-600 bg-blue-50 rounded-t-xl border-b-2 border-blue-600"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                  Saved
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-2xl shadow p-6">
              {activeTab === "Posts" && (
                <div className="max-w-[1400px] mx-left">
                  {/* Loading State */}
                  {loading && (
                    <div className="text-center py-12">
                      <div className="text-gray-500">Loading posts...</div>
                    </div>
                  )}

                  {/* Error State */}
                  {error && (
                    <div className="text-center py-12">
                      <div className="text-red-500">{error}</div>
                    </div>
                  )}

                  {/* No Posts */}
                  {!loading && !error && myPosts.length === 0 && (
                    <div className="text-center py-12">
                      <svg
                        className="w-16 h-16 text-gray-300 mx-auto mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {/* กระดาษ */}
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 3h9a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z"
                        />

                        {/* เส้นข้อความ */}
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7h5M8 10h5M8 13h5M8 17h8"
                        />
                      </svg>

                      <p className="text-gray-500 text-lg">
                        คุณยังไม่ได้โพสต์อะไรเลย
                      </p>
                      <p className="text-gray-400 text-sm mt-2">
                        แชร์ความคิดหรือภาพของคุณให้เพื่อนๆ ได้ดู
                      </p>
                    </div>
                  )}

                  {/* Display Posts */}
                  {!loading && !error && myPosts.length > 0 && (
                    <div className="space-y-4">
                      {myPosts.map((post) => (
                        <PostCard 
                          key={post.id} 
                          post={post} 
                          onLikeUpdate={handleLikeUpdate}
                          onRepostUpdate={handleRepostUpdate}
                          onSaveUpdate={handleSaveUpdate}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Your Market Items" && (
                <div className="text-center py-12">
                  <svg
                    className="w-16 h-16 text-gray-300 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  <p className="text-gray-500 text-lg">คุณยังไม่มีสินค้าในตลาด</p>
                  <p className="text-gray-400 text-sm mt-2">
                    ลงขายสินค้าของคุณเพื่อให้เพื่อนๆ ได้เห็น
                  </p>
                </div>
              )}

              {activeTab === "Friends" && (
                <div className="text-center py-12">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-16 h-16 text-gray-300 mx-auto mb-4"
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
                  <p className="text-gray-500 text-lg">รายการเพื่อนของคุณ</p>
                  <p className="text-gray-400 text-sm mt-2">
                    คุณมีเพื่อน {activeUser.friendsCount} คน
                  </p>
                </div>
              )}

              {activeTab === "Reposts" && (
                <div className="max-w-[1400px] mx-left">
                  {/* Loading State */}
                  {loading && (
                    <div className="text-center py-12">
                      <div className="text-gray-500">Loading reposted posts...</div>
                    </div>
                  )}

                  {/* Error State */}
                  {error && (
                    <div className="text-center py-12">
                      <div className="text-red-500">{error}</div>
                    </div>
                  )}

                  {/* No Reposted Posts */}
                  {!loading && !error && repostedPosts.length === 0 && (
                    <div className="text-center py-12">
                      <svg
                        className="w-16 h-16 text-gray-300 mx-auto mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <p className="text-gray-500 text-lg">
                        คุณยังไม่ได้รีโพสต์อะไรเลย
                      </p>
                      <p className="text-gray-400 text-sm mt-2">
                        แชร์โพสต์ที่คุณชอบให้เพื่อนๆ ได้เห็น
                      </p>
                    </div>
                  )}

                  {/* Display Reposted Posts */}
                  {!loading && !error && repostedPosts.length > 0 && (
                    <div className="space-y-4">
                      {repostedPosts.map((post) => (
                        <PostCard 
                          key={post.id} 
                          post={post} 
                          onLikeUpdate={handleLikeUpdate}
                          onRepostUpdate={handleRepostUpdate}
                          onSaveUpdate={handleSaveUpdate}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Liked" && (
                <div className="max-w-[1400px] mx-left">
                  {/* Loading State */}
                  {loading && (
                    <div className="text-center py-12">
                      <div className="text-gray-500">Loading liked posts...</div>
                    </div>
                  )}

                  {/* Error State */}
                  {error && (
                    <div className="text-center py-12">
                      <div className="text-red-500">{error}</div>
                    </div>
                  )}

                  {/* No Liked Posts */}
                  {!loading && !error && likedPosts.length === 0 && (
                    <div className="text-center py-12">
                      <svg
                        className="w-16 h-16 text-gray-300 mx-auto mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                      <p className="text-gray-500 text-lg">
                        คุณยังไม่ได้ไลก์โพสต์ไหนเลย
                      </p>
                      <p className="text-gray-400 text-sm mt-2">
                        กดไลก์โพสต์ที่คุณชอบเพื่อเก็บไว้ดูอีกครั้ง
                      </p>
                    </div>
                  )}

                  {/* Display Liked Posts */}
                  {!loading && !error && likedPosts.length > 0 && (
                    <div className="space-y-4">
                      {likedPosts.map((post) => (
                        <PostCard 
                          key={post.id} 
                          post={post} 
                          onLikeUpdate={handleLikeUpdate}
                          onRepostUpdate={handleRepostUpdate}
                          onSaveUpdate={handleSaveUpdate}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Saved" && (
                <div className="max-w-[1400px] mx-left">
                  {/* Loading State */}
                  {loading && (
                    <div className="text-center py-12">
                      <div className="text-gray-500">Loading saved posts...</div>
                    </div>
                  )}

                  {/* Error State */}
                  {error && (
                    <div className="text-center py-12">
                      <div className="text-red-500">{error}</div>
                    </div>
                  )}

                  {/* No Saved Posts */}
                  {!loading && !error && savedPosts.length === 0 && (
                    <div className="text-center py-12">
                      <svg
                        className="w-16 h-16 text-gray-300 mx-auto mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                        />
                      </svg>
                      <p className="text-gray-500 text-lg">
                        คุณยังไม่ได้บันทึกอะไรไว้
                      </p>
                      <p className="text-gray-400 text-sm mt-2">
                        บันทึกโพสต์ที่สำคัญเพื่อดูอีกครั้งในภายหลัง
                      </p>
                    </div>
                  )}

                  {/* Display Saved Posts */}
                  {!loading && !error && savedPosts.length > 0 && (
                    <div className="space-y-4">
                      {savedPosts.map((post) => (
                        <PostCard 
                          key={post.id} 
                          post={post} 
                          onLikeUpdate={handleLikeUpdate}
                          onRepostUpdate={handleRepostUpdate}
                          onSaveUpdate={handleSaveUpdate}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>

        {/* Chatbox - Bottom Right */}
        <Chatbox />

        {/* Token Error Popup */}
        <TokenErrorPopup 
          isOpen={showTokenErrorPopup} 
          onClose={() => setShowTokenErrorPopup(false)} 
        />
      </div>
  );
}
