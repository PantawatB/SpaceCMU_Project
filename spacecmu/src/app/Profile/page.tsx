"use client";

import Sidebar from "../../components/Sidebar";
import Chatbox from "../../components/Chatbox";
import PostCard from "../../components/PostCard";
import MarketCard from "../../components/MarketCard";
import TokenErrorPopup from "../../components/TokenErrorPopup";
import { useState, useEffect } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { API_CONFIG } from "@/lib/config";
import { apiService } from "@/lib/api";

interface PostMedia {
  id: number;
  postId: number;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  order: number;
  fileSize: number | null;
}

interface Post {
  id: string;
  userId: string;
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

interface Friend {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  friendsCount: number | null;
}

interface MarketItemSeller {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

interface MarketItemAPI {
  id: string;
  title: string;
  description: string;
  price: string;
  imageUrl: string | null;
  imageUrls: string | null;
  status: string;
  createdAt: string;
  seller: MarketItemSeller;
  category: string | null;
}

function openDirectChatEvent(userId: string) {
  window.dispatchEvent(new CustomEvent("openDirectChat", { detail: userId }));
}

function FriendProfileCard({
  friend,
  friendName,
  friendImgSrc,
  friendBannerSrc,
  onUnfriend,
}: {
  friend: Friend;
  friendName: string;
  friendImgSrc: string;
  friendBannerSrc: string | null;
  onUnfriend: (id: string) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<"unfriend" | null>(null);
  const [confirm, setConfirm] = React.useState(false);

  const handleUnfriend = async () => {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
      return;
    }
    setLoading("unfriend");
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/friends/${friend.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        onUnfriend(friend.id);
      }
    } catch (err) {
      console.error("Error removing friend:", err);
    } finally {
      setLoading(null);
      setConfirm(false);
    }
  };

  return (
    <div className="relative rounded-2xl shadow-md bg-white w-full flex flex-col">
      {/* Cover banner */}
      <div className="h-28 sm:h-32 w-full shrink-0 rounded-t-2xl overflow-hidden bg-linear-to-r from-pink-200 via-yellow-200 to-green-200">
        {friendBannerSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={friendBannerSrc}
            alt="banner"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col items-center px-4 pb-5 pt-0 w-full">
        {/* Avatar overlapping banner */}
        <div className="-mt-10 sm:-mt-12 mb-3 shrink-0 z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={friendImgSrc}
            alt={friendName}
            className="rounded-full border-[3px] border-white shadow-md w-16 h-16 sm:w-20 sm:h-20 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = "/default-avatar.svg"; }}
          />
        </div>

        {/* Name */}
        <p className="text-gray-900 font-semibold text-sm sm:text-base text-center truncate w-full px-2 leading-tight">
          {friendName}
        </p>

        {/* Username */}
        {friend.username && (
          <p className="text-xs text-gray-400 text-center mt-0.5">
            @{friend.username}
          </p>
        )}

        {/* Bio */}
        <p className="text-xs sm:text-sm text-gray-500 text-center line-clamp-2 w-full px-2 mt-1 mb-4 leading-relaxed min-h-10 overflow-hidden">
          {friend.bio || <span className="italic text-gray-300">No bio yet</span>}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full justify-center">
          {/* Unfriend */}
          <button
            disabled={loading !== null}
            onClick={handleUnfriend}
            className={`flex-1 min-w-0 text-sm font-medium py-2 px-2 rounded-full transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1 truncate ${
              confirm
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-red-100 text-red-800 hover:bg-red-200 hover:text-red-600"
            }`}
          >
            {loading === "unfriend" ? (
              <svg className="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : confirm ? "Confirm?" : "Unfriend"}
          </button>
          {/* View Profile */}
          <button
            disabled={loading !== null}
            title="View Profile"
            onClick={() => router.push(`/Friends?userId=${friend.id}`)}
            className="flex-1 min-w-0 text-sm font-medium py-2 px-2 rounded-full transition-all bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="truncate">View Profile</span>
          </button>
          {/* Chat */}
          <button
            disabled={loading !== null}
            title="Chat"
            onClick={() => openDirectChatEvent(friend.id)}
            className="w-9 h-9 shrink-0 rounded-full transition-all bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfileMainPage() {
  const { activeUser } = useUser();
  const [activeTab, setActiveTab] = useState("Posts");
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [repostedPosts, setRepostedPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTokenErrorPopup, setShowTokenErrorPopup] = useState(false);
  const [myMarketItems, setMyMarketItems] = useState<MarketItemAPI[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [selectedMarketItem, setSelectedMarketItem] = useState<MarketItemAPI | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  // Fetch friends list when "Friends" tab is active
  useEffect(() => {
    const fetchFriends = async () => {
      if (activeTab !== 'Friends' || !activeUser) return;
      setFriendsLoading(true);
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/friends/me`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setFriends(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error fetching friends:', err);
        setFriends([]);
      } finally {
        setFriendsLoading(false);
      }
    };
    fetchFriends();
  }, [activeTab, activeUser]);

  // Fetch my market items when "Your Market Items" tab is active
  useEffect(() => {
    const fetchMyMarketItems = async () => {
      if (activeTab !== 'Your Market Items' || !activeUser) return;
      setMarketLoading(true);
      setMarketError(null);
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/market/items/me`, {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setMyMarketItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching my market items:', err);
        setMarketError('ไม่สามารถโหลดรายการสินค้าได้');
        setMyMarketItems([]);
      } finally {
        setMarketLoading(false);
      }
    };
    fetchMyMarketItems();
  }, [activeTab, activeUser]);

  if (!activeUser) return null;

  // Get display name
  const displayName = `${activeUser.firstName} ${activeUser.lastName}`;
  // Get avatar URL with fallback
  const avatarUrl = apiService.getImageUrl(activeUser.avatarUrl) || "/default-avatar.svg";
  // Get banner URL
  const bannerUrl = apiService.getImageUrl(activeUser.bannerUrl);
  // Get bio with fallback
  const bio = activeUser.bio || "This user has no bio yet.";
  // Get faculty display
  const facultyDisplay = activeUser.faculty || "Unknown";

  // Handle like count update
  const handleLikeUpdate = (postId: string, newLikeCount: number) => {
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
  const handleRepostUpdate = (postId: string, newRepostCount: number) => {
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

  // Handle post delete — remove from all local post lists
  const handlePostDelete = (postId: string) => {
    setMyPosts((prev) => prev.filter((p) => p.id !== postId));
    setLikedPosts((prev) => prev.filter((p) => p.id !== postId));
    setRepostedPosts((prev) => prev.filter((p) => p.id !== postId));
    setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div className="flex min-h-screen bg-white text-gray-800">
        {/* Sidebar */}
        <Sidebar />
        {/* Main Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8">
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
                {bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bannerUrl}
                    alt="Profile Banner"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-linear-to-r from-pink-200 via-yellow-200 to-green-200" />
                )}
              </div>
              {/* Profile Avatar - left aligned */}
              <div className="absolute left-4 sm:left-10 top-24 sm:top-28 flex items-center">
                <div className="rounded-full border-4 border-white p-1 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl}
                    alt="Profile Avatar"
                    className="w-16 h-16 sm:w-[90px] sm:h-[90px] rounded-full object-cover"
                  />
                </div>
                {/* Stats - right of avatar */}
                <div
                  className="flex flex-col justify-center ml-3 sm:ml-6 relative"
                  style={{ top: "25px" }}
                >
                  <div className="flex gap-2 sm:gap-8 flex-wrap">
                    <div className="text-center flex items-center gap-1 sm:gap-0 flex-wrap">
                      <span className="text-base sm:text-xl font-semibold">{activeUser.friendsCount}</span>
                      <span className="text-gray-500 text-sm sm:text-base ml-1">Friends</span>
                      <span className="text-gray-500 ml-2 sm:ml-4 hidden sm:inline">|</span>
                      <span className="text-black font-semibold text-sm sm:text-base ml-2 sm:ml-4 hidden sm:inline">
                        {facultyDisplay}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Name & Verified */}
              <div className="flex items-center mt-16 sm:mt-19 ml-4 sm:ml-8 flex-wrap gap-x-2">
                <span className="text-lg sm:text-2xl font-bold wrap-break-word">{displayName}</span>
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm3.93 6.36l-4.24 4.24a1 1 0 01-1.41 0l-2.12-2.12a1 1 0 111.41-1.41l1.41 1.41 3.54-3.54a1 1 0 111.41 1.41z" />
                </svg>
              </div>
              {/* Faculty on mobile (shown below name) */}
              <div className="ml-4 sm:hidden mt-0.5">
                <span className="text-gray-500 text-xs">{facultyDisplay}</span>
              </div>
              {/* Bio */}
              <div className="text-left text-gray-600 mt-2 px-4 sm:px-8">
                {bio}
              </div>
              {/* Tabs */}
              <div className="flex justify-center mt-6 border-b border-gray-200 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setActiveTab("Posts")}
                  className={`px-4 sm:px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap shrink-0 ${
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
                    className="w-4 h-4"
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
                  className={`px-4 sm:px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap shrink-0 ${
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
                  className={`px-4 sm:px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap shrink-0 ${
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
                  className={`px-4 sm:px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap shrink-0 ${
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
                  className={`px-4 sm:px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap shrink-0 ${
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
                  className={`px-4 sm:px-6 py-3 font-medium flex items-center gap-2 whitespace-nowrap shrink-0 ${
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
            <div className="bg-white rounded-2xl shadow p-4 sm:p-6 min-w-0 overflow-hidden">
              {activeTab === "Posts" && (
                <div className="w-full min-w-0">
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
                          onPostDelete={handlePostDelete}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Your Market Items" && (
                <div>
                  {/* Loading */}
                  {marketLoading && (
                    <div className="text-center py-12">
                      <div className="text-gray-500">กำลังโหลดสินค้า...</div>
                    </div>
                  )}

                  {/* Error */}
                  {marketError && (
                    <div className="text-center py-12">
                      <div className="text-red-500">{marketError}</div>
                    </div>
                  )}

                  {/* Empty state */}
                  {!marketLoading && !marketError && myMarketItems.length === 0 && (
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

                  {/* Market Items Grid */}
                  {!marketLoading && !marketError && myMarketItems.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                      {myMarketItems.map((item) => {
                        const imageUrl = item.imageUrl
                          ? item.imageUrl.startsWith('http')
                            ? item.imageUrl
                            : `${API_CONFIG.BASE_URL}${item.imageUrl}`
                          : undefined;
                        const sellerAvatarUrl = item.seller.avatarUrl
                          ? item.seller.avatarUrl.startsWith('http')
                            ? item.seller.avatarUrl
                            : `${API_CONFIG.BASE_URL}${item.seller.avatarUrl}`
                          : "/default-avatar.svg";
                        return (
                          <MarketCard
                            key={item.id}
                            price={`฿${parseFloat(item.price).toFixed(0)}`}
                            title={item.title}
                            jobTitle={item.description}
                            image={imageUrl}
                            sellerName={`${item.seller.firstName} ${item.seller.lastName}`}
                            sellerImage={sellerAvatarUrl}
                            onViewClick={() => {
                              setSelectedMarketItem(item);
                              setCurrentImageIndex(0);
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Friends" && (
                <div className="py-2">
                  {/* Loading */}
                  {friendsLoading && (
                    <div className="flex justify-center py-16">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600" />
                    </div>
                  )}

                  {/* Empty state — same style as other tabs */}
                  {!friendsLoading && friends.length === 0 && (
                    <div className="text-center py-12">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-16 h-16 text-gray-300 mx-auto mb-4"
                      >
                        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
                        <circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
                        <path stroke="currentColor" strokeWidth="2" d="M2 20c0-3 3-5 6-5s6 2 6 5" fill="none" />
                        <path stroke="currentColor" strokeWidth="2" d="M12 20c0-3 3-5 6-5s6 2 6 5" fill="none" />
                      </svg>
                      <p className="text-gray-500 text-lg">รายการเพื่อนของคุณ</p>
                      <p className="text-gray-400 text-sm mt-2">
                        คุณมีเพื่อน {activeUser.friendsCount} คน
                      </p>
                    </div>
                  )}

                  {/* Friends grid — same card as FriendCard on the Friends page */}
                  {!friendsLoading && friends.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {friends.map((friend) => {
                        const friendImgSrc = friend.avatarUrl ? apiService.getImageUrl(friend.avatarUrl) || "/default-avatar.svg" : "/default-avatar.svg";
                        const friendBannerSrc = friend.bannerUrl ? apiService.getImageUrl(friend.bannerUrl) : null;
                        const friendName = `${friend.firstName ?? ''} ${friend.lastName ?? ''}`.trim() || 'Unknown';
                        return (
                          <FriendProfileCard
                            key={friend.id}
                            friend={friend}
                            friendName={friendName}
                            friendImgSrc={friendImgSrc}
                            friendBannerSrc={friendBannerSrc}
                            onUnfriend={(id) => setFriends((prev) => prev.filter((f) => f.id !== id))}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Reposts" && (
                <div className="w-full min-w-0">
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
                          onPostDelete={handlePostDelete}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Liked" && (
                <div className="w-full min-w-0">
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
                          onPostDelete={handlePostDelete}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Saved" && (
                <div className="w-full min-w-0">
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
                          onPostDelete={handlePostDelete}
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

        {/* Market Item Detail Popup */}
        {selectedMarketItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => { setSelectedMarketItem(null); setCurrentImageIndex(0); }}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-[900px] max-h-[85vh] overflow-hidden">
              {/* Close Button */}
              <button
                onClick={() => { setSelectedMarketItem(null); setCurrentImageIndex(0); }}
                className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors bg-white rounded-full p-2 shadow-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex flex-col md:flex-row h-full overflow-y-auto">
                {/* Left — Images */}
                <div className="w-full md:w-1/2 bg-gray-50 p-8 flex items-center justify-center relative">
                  <div className="w-full aspect-square max-w-md bg-white rounded-2xl overflow-hidden shadow-md relative flex items-center justify-center">
                    {(() => {
                      let images: string[] = [];
                      if (selectedMarketItem.imageUrls) {
                        try {
                          const parsed = JSON.parse(selectedMarketItem.imageUrls);
                          images = Array.isArray(parsed) ? parsed : [];
                        } catch { /* ignore */ }
                      }
                      if (images.length === 0 && selectedMarketItem.imageUrl) {
                        images = [selectedMarketItem.imageUrl];
                      }
                      const total = images.length;
                      const currentUrl = images[currentImageIndex] || null;

                      if (currentUrl) {
                        const fullUrl = currentUrl.startsWith('http') ? currentUrl : `${API_CONFIG.BASE_URL}${currentUrl}`;
                        return (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={fullUrl} alt={selectedMarketItem.title} className="w-full h-full object-contain" />
                            {total > 1 && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((p) => (p === 0 ? total - 1 : p - 1)); }}
                                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2.5 shadow-lg transition-all hover:scale-110 z-10"
                                >
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((p) => (p === total - 1 ? 0 : p + 1)); }}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2.5 shadow-lg transition-all hover:scale-110 z-10"
                                >
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm z-10">
                                  {currentImageIndex + 1} / {total}
                                </div>
                              </>
                            )}
                          </>
                        );
                      }
                      return (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <svg className="w-32 h-32 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Right — Details */}
                <div className="w-full md:w-1/2 p-8 flex flex-col">
                  <div className="mb-6">
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">{selectedMarketItem.title}</h2>
                    <span className="text-4xl font-bold text-orange-600">฿{parseFloat(selectedMarketItem.price).toFixed(0)}</span>
                  </div>

                  <div className="border-t border-gray-200 my-4" />

                  <div className="mb-6 flex-1">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">รายละเอียดสินค้า</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">{selectedMarketItem.description}</p>
                  </div>

                  {selectedMarketItem.category && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">หมวดหมู่</h3>
                      <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">{selectedMarketItem.category}</span>
                    </div>
                  )}

                  <div className="border-t border-gray-200 my-4" />

                  {/* Seller info */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">ผู้ขาย</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedMarketItem.seller.avatarUrl
                            ? selectedMarketItem.seller.avatarUrl.startsWith('http')
                              ? selectedMarketItem.seller.avatarUrl
                              : `${API_CONFIG.BASE_URL}${selectedMarketItem.seller.avatarUrl}`
                            : "/default-avatar.svg"}
                          alt={`${selectedMarketItem.seller.firstName} ${selectedMarketItem.seller.lastName}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{selectedMarketItem.seller.firstName} {selectedMarketItem.seller.lastName}</p>
                        <p className="text-sm text-gray-500">ผู้ขาย (คุณ)</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-xs text-gray-400">
                      โพสต์เมื่อ {new Date(selectedMarketItem.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
