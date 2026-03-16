"use client";
import { fetchWithToken } from '@/lib/api';

import Sidebar from "../../components/Sidebar";
import PullToRefresh from "../../components/PullToRefresh";
import Chatbox from "../../components/Chatbox";
import PostCard from "../../components/PostCard";
import MarketCard from "../../components/MarketCard";
import TokenErrorPopup from "../../components/TokenErrorPopup";
import NotificationsPanel from "../../components/NotificationsPanel";
import { useState, useEffect, useRef } from "react";
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
  shareCount?: number;
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
  role?: string | null;
}

interface MarketItemSeller {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role?: string | null;
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
      const res = await fetchWithToken(`${API_CONFIG.BASE_URL}/api/friends/${friend.id}`, {
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
        <p className="text-gray-900 font-semibold text-sm sm:text-base text-center truncate w-full px-2 leading-tight flex items-center justify-center gap-1">
          <span className="truncate">{friendName}</span>
          {friend.role === "official_account" && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500 shrink-0 flex-none" aria-label="Verified official account">
              <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
            </svg>
          )}
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
  const profileScrollRef = useRef<HTMLElement | null>(null);
  const [showMobileNotif, setShowMobileNotif] = useState(false);
  const [mobileNotifUnread, setMobileNotifUnread] = useState(0);
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
  const [isManagingItem, setIsManagingItem] = useState(false);
  const [showItemDeleteConfirm, setShowItemDeleteConfirm] = useState(false);

  // Smart search
  const [searchQuery, setSearchQuery] = useState("");

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
        const response = await fetchWithToken(
          `${API_CONFIG.BASE_URL}/api/posts/me`,
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
        const response = await fetchWithToken(
          `${API_CONFIG.BASE_URL}/api/posts/liked/me`,
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
        const response = await fetchWithToken(
          `${API_CONFIG.BASE_URL}/api/posts/reposted/me`,
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
        const response = await fetchWithToken(
          `${API_CONFIG.BASE_URL}/api/posts/saved/me`,
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
        const response = await fetchWithToken(`${API_CONFIG.BASE_URL}/api/friends/me`, {
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
        const response = await fetchWithToken(`${API_CONFIG.BASE_URL}/api/market/items/me`, {
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

  // Mark market item as sold / available (owner only)
  const handleMarkItemAsSold = async () => {
    if (!selectedMarketItem) return;
    setIsManagingItem(true);
    try {
      const newStatus = selectedMarketItem.status === "sold" ? "available" : "sold";
      const response = await fetchWithToken(
        `${API_CONFIG.BASE_URL}/api/market/items/${selectedMarketItem.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setMyMarketItems((prev) =>
        prev.map((item) =>
          item.id === selectedMarketItem.id ? { ...item, status: newStatus } : item
        )
      );
      setSelectedMarketItem((prev) => prev ? { ...prev, status: newStatus } : prev);
    } catch (err) {
      console.error("Error updating market item status:", err);
    } finally {
      setIsManagingItem(false);
    }
  };

  // Delete market item (owner only)
  const handleDeleteMarketItem = async () => {
    if (!selectedMarketItem) return;
    setIsManagingItem(true);
    try {
      const response = await fetchWithToken(
        `${API_CONFIG.BASE_URL}/api/market/items/${selectedMarketItem.id}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setMyMarketItems((prev) => prev.filter((item) => item.id !== selectedMarketItem.id));
      setSelectedMarketItem(null);
      setShowItemDeleteConfirm(false);
      setCurrentImageIndex(0);
    } catch (err) {
      console.error("Error deleting market item:", err);
    } finally {
      setIsManagingItem(false);
    }
  };

  if (!activeUser) return null;
  const displayName = `${activeUser.firstName} ${activeUser.lastName}`;
  // Get avatar URL with fallback
  const avatarUrl = apiService.getImageUrl(activeUser.avatarUrl) || "/default-avatar.svg";
  // Get banner URL
  const bannerUrl = apiService.getImageUrl(activeUser.bannerUrl);
  // Get bio with fallback
  const bio = activeUser.bio || "This user has no bio yet.";
  // Get faculty display
  const facultyDisplay = activeUser.faculty || "Unknown";

  // ── Smart search: derive filtered lists from searchQuery ──
  const q = searchQuery.trim().toLowerCase();

  const filteredPosts = q
    ? myPosts.filter(
        (p) =>
          p.content?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      )
    : myPosts;

  const filteredLikedPosts = q
    ? likedPosts.filter(
        (p) =>
          p.content?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          `${p.author?.firstName ?? ""} ${p.author?.lastName ?? ""}`.toLowerCase().includes(q)
      )
    : likedPosts;

  const filteredRepostedPosts = q
    ? repostedPosts.filter(
        (p) =>
          p.content?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          `${p.author?.firstName ?? ""} ${p.author?.lastName ?? ""}`.toLowerCase().includes(q)
      )
    : repostedPosts;

  const filteredSavedPosts = q
    ? savedPosts.filter(
        (p) =>
          p.content?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          `${p.author?.firstName ?? ""} ${p.author?.lastName ?? ""}`.toLowerCase().includes(q)
      )
    : savedPosts;

  const filteredMarketItems = q
    ? myMarketItems.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q)
      )
    : myMarketItems;

  const filteredFriends = q
    ? friends.filter((f) =>
        `${f.firstName ?? ""} ${f.lastName ?? ""}`.toLowerCase().includes(q) ||
        f.username?.toLowerCase().includes(q) ||
        f.bio?.toLowerCase().includes(q)
      )
    : friends;

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

  // Handle share count update
  const handleShareUpdate = (postId: string, newShareCount: number) => {
    const updater = (prevPosts: Post[]) =>
      prevPosts.map(post =>
        post.id === postId ? { ...post, shareCount: newShareCount } : post
      );
    setMyPosts(updater);
    setLikedPosts(updater);
    setRepostedPosts(updater);
    setSavedPosts(updater);
  };

  // Handle save update (refresh saved posts list)
  const handleSaveUpdate = () => {
    // Optionally refresh the saved posts list
    if (activeTab === 'Saved' && activeUser) {
      // Trigger a re-fetch by toggling state or calling fetch directly
    }
  };

  // Handle post delete — remove from all local post lists
  const handlePostDelete = (postId: string) => {
    setMyPosts((prev) => prev.filter((p) => p.id !== postId));
    setLikedPosts((prev) => prev.filter((p) => p.id !== postId));
    setRepostedPosts((prev) => prev.filter((p) => p.id !== postId));
    setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  // Clear search when switching tabs so stale filters don't carry over
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchQuery("");
  };

  return (
    <div className="flex min-h-screen bg-white text-gray-800">
        {/* Sidebar */}
        <Sidebar />
        {/* Main Content */}
        <PullToRefresh scrollRef={profileScrollRef} onRefresh={() => window.location.reload()}>
        <main ref={profileScrollRef} className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 overflow-y-auto">
          {/* Search bar */}
          <div className="mb-6 pl-14 lg:pl-0">
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
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
              <input
                type="text"
                placeholder={
                  activeTab === "Posts" ? "ค้นหาโพสต์ของฉัน..." :
                  activeTab === "Your Market Items" ? "ค้นหาสินค้าของฉัน..." :
                  activeTab === "Friends" ? "ค้นหาเพื่อน..." :
                  activeTab === "Reposts" ? "ค้นหาโพสต์ที่รีโพสต์..." :
                  activeTab === "Liked" ? "ค้นหาโพสต์ที่ถูกใจ..." :
                  activeTab === "Saved" ? "ค้นหาโพสต์ที่บันทึก..." :
                  "Search"
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-2 rounded-full bg-white text-sm placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <section className="flex flex-col gap-6 pb-8">
            <div className="bg-white rounded-2xl shadow">
              {/* Cover Image */}
              <div className="h-40 w-full rounded-t-2xl overflow-hidden">
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
              {/* Profile info — left-aligned at all screen sizes */}
              <div className="relative px-4 sm:px-6">
                {/* Avatar — overlapping banner, left-aligned */}
                <div className="absolute left-4 sm:left-6 -top-10 sm:-top-11 z-10">
                  <div className="rounded-full border-4 border-white bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarUrl}
                      alt="Profile Avatar"
                      className="w-20 h-20 sm:w-[90px] sm:h-[90px] rounded-full object-cover"
                    />
                  </div>
                </div>
                {/* Stats row — to the right of avatar */}
                <div className="flex items-center ml-28 sm:ml-36 pt-2 sm:pt-3 gap-2 flex-wrap min-w-0">
                  <div className="flex items-center gap-1 flex-wrap min-w-0">
                    <span className="text-sm sm:text-xl font-semibold">{activeUser.friendsCount}</span>
                    <span className="text-gray-500 text-sm sm:text-base ml-1">Friends</span>
                    <span className="text-gray-500 ml-2">|</span>
                    <span className="text-black font-semibold text-sm sm:text-base ml-2 truncate max-w-[140px] sm:max-w-none">
                      {facultyDisplay}
                    </span>
                  </div>
                </div>
                {/* Name & Verified */}
                <div className="flex items-start mt-8 sm:mt-8 flex-wrap gap-x-2 gap-y-1 min-w-0">
                  <span className="text-lg sm:text-2xl font-bold wrap-break-word break-all min-w-0 leading-tight">{displayName}</span>
                  {activeUser.role === 'official_account' && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 shrink-0 mt-0.5" aria-label="Verified official account">
                      <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                {/* Bio */}
                <div className="text-left text-gray-600 text-sm sm:text-base mt-2 pb-4 wrap-break-word">
                  {bio}
                </div>
              </div>
              {/* Tabs */}
              <div className="flex sm:justify-center mt-2  border-gray-200 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => handleTabChange("Posts")}
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
                  onClick={() => handleTabChange("Your Market Items")}
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
                  onClick={() => handleTabChange("Friends")}
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
                  onClick={() => handleTabChange("Reposts")}
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
                  onClick={() => handleTabChange("Liked")}
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
                  onClick={() => handleTabChange("Saved")}
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
            <div className="bg-white rounded-2xl p-4 sm:p-6 min-w-0 overflow-hidden">
              {activeTab === "Posts" && (
                <div className="w-full min-w-0">
                  {loading && (
                    <div className="text-center py-12">
                      <div className="text-gray-500">Loading posts...</div>
                    </div>
                  )}
                  {error && (
                    <div className="text-center py-12">
                      <div className="text-red-500">{error}</div>
                    </div>
                  )}
                  {/* Search info badge */}
                  {!loading && !error && q && (
                    <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <span>ผลการค้นหา <strong>&ldquo;{searchQuery.trim()}&rdquo;</strong> — พบ {filteredPosts.length} โพสต์</span>
                    </div>
                  )}
                  {!loading && !error && filteredPosts.length === 0 && (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 3h9a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h5M8 10h5M8 13h5M8 17h8" />
                      </svg>
                      <p className="text-gray-500 text-lg">
                        {q ? `ไม่พบโพสต์ที่ตรงกับ "${searchQuery.trim()}"` : "คุณยังไม่ได้โพสต์อะไรเลย"}
                      </p>
                      {!q && <p className="text-gray-400 text-sm mt-2">แชร์ความคิดหรือภาพของคุณให้เพื่อนๆ ได้ดู</p>}
                    </div>
                  )}
                  {!loading && !error && filteredPosts.length > 0 && (
                    <div className="space-y-4">
                      {filteredPosts.map((post) => (
                        <PostCard key={post.id} post={post}
                          onLikeUpdate={handleLikeUpdate} onRepostUpdate={handleRepostUpdate}
                          onSaveUpdate={handleSaveUpdate} onShareUpdate={handleShareUpdate}
                          onPostDelete={handlePostDelete} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Your Market Items" && (
                <div>
                  {marketLoading && (
                    <div className="text-center py-12">
                      <div className="text-gray-500">กำลังโหลดสินค้า...</div>
                    </div>
                  )}
                  {marketError && (
                    <div className="text-center py-12">
                      <div className="text-red-500">{marketError}</div>
                    </div>
                  )}
                  {/* Search info badge */}
                  {!marketLoading && !marketError && q && (
                    <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <span>ผลการค้นหา <strong>&ldquo;{searchQuery.trim()}&rdquo;</strong> — พบ {filteredMarketItems.length} รายการ</span>
                    </div>
                  )}
                  {!marketLoading && !marketError && filteredMarketItems.length === 0 && (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <p className="text-gray-500 text-lg">
                        {q ? `ไม่พบสินค้าที่ตรงกับ "${searchQuery.trim()}"` : "คุณยังไม่มีสินค้าในตลาด"}
                      </p>
                      {!q && <p className="text-gray-400 text-sm mt-2">ลงขายสินค้าของคุณเพื่อให้เพื่อนๆ ได้เห็น</p>}
                    </div>
                  )}
                  {!marketLoading && !marketError && filteredMarketItems.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-8">
                      {filteredMarketItems.map((item) => {
                        const imageUrl = item.imageUrl
                          ? item.imageUrl.startsWith('http') ? item.imageUrl : `${API_CONFIG.BASE_URL}${item.imageUrl}`
                          : undefined;
                        const sellerAvatarUrl = item.seller.avatarUrl
                          ? item.seller.avatarUrl.startsWith('http') ? item.seller.avatarUrl : `${API_CONFIG.BASE_URL}${item.seller.avatarUrl}`
                          : "/default-avatar.svg";
                        return (
                          <div key={item.id} className="relative">
                            {item.status === "sold" && (
                              <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">ขายแล้ว</div>
                            )}
                            <div className={item.status === "sold" ? "opacity-60" : ""}>
                              <MarketCard
                                price={`฿${parseFloat(item.price).toFixed(0)}`}
                                title={item.title}
                                jobTitle={item.description}
                                image={imageUrl}
                                sellerName={`${item.seller.firstName} ${item.seller.lastName}`}
                                sellerImage={sellerAvatarUrl}
                                sellerRole={item.seller.role}
                                onViewClick={() => { setSelectedMarketItem(item); setCurrentImageIndex(0); setShowItemDeleteConfirm(false); }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Friends" && (
                <div className="py-2">
                  {friendsLoading && (
                    <div className="flex justify-center py-16">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600" />
                    </div>
                  )}
                  {/* Search info badge */}
                  {!friendsLoading && q && (
                    <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <span>ผลการค้นหา <strong>&ldquo;{searchQuery.trim()}&rdquo;</strong> — พบ {filteredFriends.length} คน</span>
                    </div>
                  )}
                  {!friendsLoading && filteredFriends.length === 0 && (
                    <div className="text-center py-12">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-16 h-16 text-gray-300 mx-auto mb-4">
                        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
                        <circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
                        <path stroke="currentColor" strokeWidth="2" d="M2 20c0-3 3-5 6-5s6 2 6 5" fill="none" />
                        <path stroke="currentColor" strokeWidth="2" d="M12 20c0-3 3-5 6-5s6 2 6 5" fill="none" />
                      </svg>
                      <p className="text-gray-500 text-lg">
                        {q ? `ไม่พบเพื่อนที่ตรงกับ "${searchQuery.trim()}"` : "รายการเพื่อนของคุณ"}
                      </p>
                      {!q && <p className="text-gray-400 text-sm mt-2">คุณมีเพื่อน {activeUser.friendsCount} คน</p>}
                    </div>
                  )}
                  {!friendsLoading && filteredFriends.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredFriends.map((friend) => {
                        const friendImgSrc = friend.avatarUrl ? apiService.getImageUrl(friend.avatarUrl) || "/default-avatar.svg" : "/default-avatar.svg";
                        const friendBannerSrc = friend.bannerUrl ? apiService.getImageUrl(friend.bannerUrl) : null;
                        const friendName = `${friend.firstName ?? ''} ${friend.lastName ?? ''}`.trim() || 'Unknown';
                        return (
                          <FriendProfileCard key={friend.id} friend={friend} friendName={friendName}
                            friendImgSrc={friendImgSrc} friendBannerSrc={friendBannerSrc}
                            onUnfriend={(id) => setFriends((prev) => prev.filter((f) => f.id !== id))} />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Reposts" && (
                <div className="w-full min-w-0">
                  {loading && (
                    <div className="text-center py-12">
                      <div className="text-gray-500">Loading reposted posts...</div>
                    </div>
                  )}
                  {error && (
                    <div className="text-center py-12">
                      <div className="text-red-500">{error}</div>
                    </div>
                  )}
                  {/* Search info badge */}
                  {!loading && !error && q && (
                    <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <span>ผลการค้นหา <strong>&ldquo;{searchQuery.trim()}&rdquo;</strong> — พบ {filteredRepostedPosts.length} โพสต์</span>
                    </div>
                  )}
                  {!loading && !error && filteredRepostedPosts.length === 0 && (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <p className="text-gray-500 text-lg">
                        {q ? `ไม่พบโพสต์ที่ตรงกับ "${searchQuery.trim()}"` : "คุณยังไม่ได้รีโพสต์อะไรเลย"}
                      </p>
                      {!q && <p className="text-gray-400 text-sm mt-2">แชร์โพสต์ที่คุณชอบให้เพื่อนๆ ได้เห็น</p>}
                    </div>
                  )}
                  {!loading && !error && filteredRepostedPosts.length > 0 && (
                    <div className="space-y-4">
                      {filteredRepostedPosts.map((post) => (
                        <PostCard key={post.id} post={post}
                          onLikeUpdate={handleLikeUpdate} onRepostUpdate={handleRepostUpdate}
                          onSaveUpdate={handleSaveUpdate} onShareUpdate={handleShareUpdate}
                          onPostDelete={handlePostDelete} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Liked" && (
                <div className="w-full min-w-0">
                  {loading && (
                    <div className="text-center py-12">
                      <div className="text-gray-500">Loading liked posts...</div>
                    </div>
                  )}
                  {error && (
                    <div className="text-center py-12">
                      <div className="text-red-500">{error}</div>
                    </div>
                  )}
                  {/* Search info badge */}
                  {!loading && !error && q && (
                    <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <span>ผลการค้นหา <strong>&ldquo;{searchQuery.trim()}&rdquo;</strong> — พบ {filteredLikedPosts.length} โพสต์</span>
                    </div>
                  )}
                  {!loading && !error && filteredLikedPosts.length === 0 && (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <p className="text-gray-500 text-lg">
                        {q ? `ไม่พบโพสต์ที่ตรงกับ "${searchQuery.trim()}"` : "คุณยังไม่ได้ไลก์โพสต์ไหนเลย"}
                      </p>
                      {!q && <p className="text-gray-400 text-sm mt-2">กดไลก์โพสต์ที่คุณชอบเพื่อเก็บไว้ดูอีกครั้ง</p>}
                    </div>
                  )}
                  {!loading && !error && filteredLikedPosts.length > 0 && (
                    <div className="space-y-4">
                      {filteredLikedPosts.map((post) => (
                        <PostCard key={post.id} post={post}
                          onLikeUpdate={handleLikeUpdate} onRepostUpdate={handleRepostUpdate}
                          onSaveUpdate={handleSaveUpdate} onShareUpdate={handleShareUpdate}
                          onPostDelete={handlePostDelete} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "Saved" && (
                <div className="w-full min-w-0">
                  {loading && (
                    <div className="text-center py-12">
                      <div className="text-gray-500">Loading saved posts...</div>
                    </div>
                  )}
                  {error && (
                    <div className="text-center py-12">
                      <div className="text-red-500">{error}</div>
                    </div>
                  )}
                  {/* Search info badge */}
                  {!loading && !error && q && (
                    <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <span>ผลการค้นหา <strong>&ldquo;{searchQuery.trim()}&rdquo;</strong> — พบ {filteredSavedPosts.length} โพสต์</span>
                    </div>
                  )}
                  {!loading && !error && filteredSavedPosts.length === 0 && (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      <p className="text-gray-500 text-lg">
                        {q ? `ไม่พบโพสต์ที่ตรงกับ "${searchQuery.trim()}"` : "คุณยังไม่ได้บันทึกอะไรไว้"}
                      </p>
                      {!q && <p className="text-gray-400 text-sm mt-2">บันทึกโพสต์ที่สำคัญเพื่อดูอีกครั้งในภายหลัง</p>}
                    </div>
                  )}
                  {!loading && !error && filteredSavedPosts.length > 0 && (
                    <div className="space-y-4">
                      {filteredSavedPosts.map((post) => (
                        <PostCard key={post.id} post={post}
                          onLikeUpdate={handleLikeUpdate} onRepostUpdate={handleRepostUpdate}
                          onSaveUpdate={handleSaveUpdate} onShareUpdate={handleShareUpdate}
                          onPostDelete={handlePostDelete} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>
        </PullToRefresh>

        {/* Chatbox - Bottom Right */}
        <Chatbox />

        {/* Notifications Panel */}
        <NotificationsPanel
          userId={activeUser?.id ?? null}
          mobileOpen={showMobileNotif}
          onMobileClose={() => setShowMobileNotif(false)}
          onUnreadChange={setMobileNotifUnread}
        />

        {/* Mobile Notification Bell — above chatbox, hidden on lg+ */}
        <div className="lg:hidden fixed bottom-24 right-4 z-30">
          <button
            onClick={() => setShowMobileNotif((prev) => !prev)}
            className="w-14 h-14 rounded-full bg-white shadow-2xl flex items-center justify-center border border-gray-200 hover:scale-110 transition-all duration-200 active:scale-95 relative"
            aria-label="Notifications"
          >
            <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {mobileNotifUnread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                {mobileNotifUnread > 99 ? "99+" : mobileNotifUnread}
              </span>
            )}
          </button>
        </div>

        {/* Token Error Popup */}
        <TokenErrorPopup 
          isOpen={showTokenErrorPopup} 
          onClose={() => setShowTokenErrorPopup(false)} 
        />

        {/* Market Item Detail Popup */}
        {selectedMarketItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => { setSelectedMarketItem(null); setCurrentImageIndex(0); setShowItemDeleteConfirm(false); }}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-2xl lg:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
              {/* Close Button */}
              <button
                onClick={() => { setSelectedMarketItem(null); setCurrentImageIndex(0); setShowItemDeleteConfirm(false); }}
                className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors bg-white rounded-full p-2 shadow-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">
                {/* Left — Images */}
                <div className="w-full md:w-1/2 bg-gray-50 p-5 sm:p-8 flex items-center justify-center relative flex-none md:overflow-y-auto">

                  {/* SOLD full-panel overlay */}
                  {selectedMarketItem.status === "sold" && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-tl-2xl rounded-bl-2xl pointer-events-none">
                      <div className="border-[3px] border-white rounded-lg px-8 py-3 -rotate-12">
                        <span className="text-white font-black tracking-[0.3em] text-3xl uppercase" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                          SOLD
                        </span>
                      </div>
                    </div>
                  )}

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
                <div className="w-full md:w-1/2 p-5 sm:p-8 flex flex-col md:overflow-y-auto">
                  <div className="mb-6">
                    <div className="flex items-start gap-3 mb-3">
                      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex-1">{selectedMarketItem.title}</h2>
                      {selectedMarketItem.status === "sold" && (
                        <span className="shrink-0 mt-1 inline-flex items-center gap-1 bg-gray-900 text-white text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-md">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Sold
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className={`text-3xl sm:text-4xl font-bold ${selectedMarketItem.status === "sold" ? "text-gray-300 line-through" : "text-orange-600"}`}>
                        ฿{parseFloat(selectedMarketItem.price).toFixed(0)}
                      </span>
                      {selectedMarketItem.status === "sold" && (
                        <span className="text-sm text-gray-400 font-medium">สินค้าชิ้นนี้ขายแล้ว</span>
                      )}
                    </div>
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
                  <div className="mb-4">
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

                  {/* Owner actions */}
                  <div className="flex flex-col gap-3 mt-2">
                    {/* Status badge */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
                        selectedMarketItem.status === "sold"
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-700"
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${selectedMarketItem.status === "sold" ? "bg-red-500" : "bg-green-500"}`} />
                        {selectedMarketItem.status === "sold" ? "ขายแล้ว" : "กำลังขาย"}
                      </span>
                    </div>

                    {/* Mark as sold / reopen */}
                    <button
                      onClick={handleMarkItemAsSold}
                      disabled={isManagingItem}
                      className={`w-full py-3 px-6 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 shadow ${
                        selectedMarketItem.status === "sold"
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-orange-500 hover:bg-orange-600 text-white"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {isManagingItem ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : selectedMarketItem.status === "sold" ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {selectedMarketItem.status === "sold" ? "เปิดขายอีกครั้ง" : "ทำเครื่องหมายว่าขายแล้ว"}
                    </button>

                    {/* Delete */}
                    {!showItemDeleteConfirm ? (
                      <button
                        onClick={() => setShowItemDeleteConfirm(true)}
                        disabled={isManagingItem}
                        className="w-full py-3 px-6 rounded-xl font-semibold text-base border-2 border-red-300 text-red-500 hover:bg-red-50 hover:border-red-400 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        ลบสินค้า
                      </button>
                    ) : (
                      <div className="rounded-xl border-2 border-red-300 bg-red-50 p-3">
                        <p className="text-sm text-red-600 font-medium text-center mb-3">ยืนยันการลบสินค้านี้?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleDeleteMarketItem}
                            disabled={isManagingItem}
                            className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-1"
                          >
                            {isManagingItem ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                            ) : null}
                            ยืนยันลบ
                          </button>
                          <button
                            onClick={() => setShowItemDeleteConfirm(false)}
                            disabled={isManagingItem}
                            className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 font-semibold text-sm transition-colors"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    )}
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
