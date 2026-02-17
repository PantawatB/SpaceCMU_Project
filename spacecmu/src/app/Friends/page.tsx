"use client";

import Sidebar from "../../components/Sidebar";
import Chatbox from "../../components/Chatbox";
import PostCard from "../../components/PostCard";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { User } from "@/types/user";
import { API_CONFIG } from "@/lib/config";
import { useRouter, useSearchParams } from "next/navigation";

interface PostMedia {
  id: number;
  postId: number;
  mediaUrl: string;
  mediaType: "image" | "video";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userRepostedPosts, setUserRepostedPosts] = useState<Post[]>([]);
  const [userLikedPosts, setUserLikedPosts] = useState<Post[]>([]);
  const [userSavedPosts, setUserSavedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [activeTab, setActiveTab] = useState("Posts");
  const [isFriend, setIsFriend] = useState(false);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);

  // Load user from URL params on mount and when URL changes
  useEffect(() => {
    const userId = searchParams.get('userId');
    
    if (userId) {
      // Store userId in sessionStorage
      sessionStorage.setItem('friendsViewingUserId', userId);
      
      // Only load if it's a different user
      if (loadedUserIdRef.current !== userId) {
        loadUserProfile(userId);
        loadedUserIdRef.current = userId;
      }
    } else {
      // Check if we have a stored userId in sessionStorage
      const storedUserId = sessionStorage.getItem('friendsViewingUserId');
      
      if (storedUserId) {
        // Restore the URL with the stored userId
        router.push(`/Friends?userId=${storedUserId}`);
      } else {
        // Clear selected user if no userId anywhere
        if (loadedUserIdRef.current !== null) {
          setSelectedUser(null);
          setUserPosts([]);
          setUserRepostedPosts([]);
          setUserLikedPosts([]);
          setUserSavedPosts([]);
          setActiveTab("Posts");
          loadedUserIdRef.current = null;
        }
      }
    }
  }, [searchParams, router]);

  const loadUserProfile = async (userId: string) => {
    try {
      // Fetch user data
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/users/${userId}`, {
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        setSelectedUser(userData);
        
        // Check if this user is already a friend
        // TODO: Replace with actual API endpoint to check friendship status
        setIsFriend(false); // Default to not friends for now
        
        // TODO: In the future, fetch user's posts using a dedicated API endpoint
        // For now, we're not fetching posts when viewing another user's profile
        setUserPosts([]);
        setLoadingPosts(false);
      } else {
        console.error("Failed to fetch user data");
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setLoadingPosts(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search function
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/users/search?query=${encodeURIComponent(query)}`,
        {
          method: "GET",
          credentials: "include", // Include cookies (token)
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // API returns array directly, not wrapped in { users: [] }
        setSearchResults(Array.isArray(data) ? data : []);
        setShowDropdown(true);
      } else {
        console.error("Search failed:", response.statusText);
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      searchUsers(value);
    }, 300);
  };

  const handleUserClick = async (userId: string) => {
    setShowDropdown(false);
    
    // Update URL with query parameter
    router.push(`/Friends?userId=${userId}`);
    
    // Load user profile
    await loadUserProfile(userId);
  };

  const handleBackToFriends = () => {
    // Clear sessionStorage
    sessionStorage.removeItem('friendsViewingUserId');
    
    // Reset URL to /Friends
    router.push('/Friends');
    
    setSelectedUser(null);
    setUserPosts([]);
    setUserRepostedPosts([]);
    setUserLikedPosts([]);
    setUserSavedPosts([]);
    setActiveTab("Posts");
    setIsFriend(false);
    setShowUnfriendConfirm(false);
  };

  // Handle add/remove friend
  const handleFriendAction = async () => {
    if (!selectedUser || isAddingFriend) return;

    // If already friends and haven't shown confirm yet
    if (isFriend && !showUnfriendConfirm) {
      setShowUnfriendConfirm(true);
      // Auto-hide confirm after 3 seconds
      setTimeout(() => {
        setShowUnfriendConfirm(false);
      }, 3000);
      return;
    }

    setIsAddingFriend(true);
    try {
      if (isFriend && showUnfriendConfirm) {
        // TODO: Call API to remove friend
        console.log("Removing friend:", selectedUser.id);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsFriend(false);
        setShowUnfriendConfirm(false);
      } else {
        // TODO: Call API to add friend
        console.log("Adding friend:", selectedUser.id);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsFriend(true);
      }
    } catch (error) {
      console.error("Error updating friend status:", error);
    } finally {
      setIsAddingFriend(false);
    }
  };

  // Handle like count update
  const handleLikeUpdate = (postId: number, newLikeCount: number) => {
    setUserPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId ? { ...post, likeCount: newLikeCount } : post
      )
    );
  };

  // Handle repost count update
  const handleRepostUpdate = (postId: number, newRepostCount: number) => {
    setUserPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId ? { ...post, repostCount: newRepostCount } : post
      )
    );
  };

  // Handle save update
  const handleSaveUpdate = () => {
    console.log("Post save status updated");
  };

  return (
    <div className="flex min-h-screen bg-white text-gray-800">
      {/* Sidebar */}
      <Sidebar />
      {/* Main Content */}
      <main className="flex-1 p-8">
        {selectedUser ? (
          /* User Profile View */
          <>


            {/* Search bar */}
            <div className="mb-6" ref={searchRef}>
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
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-3 py-2 rounded-full bg-white text-sm placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />

                {/* Search Dropdown */}
                {showDropdown && (
                  <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-[500px] overflow-y-auto">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                          <p className="text-sm text-gray-500">Searching...</p>
                        </div>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => handleUserClick(user.id)}
                            className="flex items-center gap-4 px-5 py-4 hover:bg-linear-to-r hover:from-gray-50 hover:to-blue-50/30 cursor-pointer transition-all duration-200 group"
                          >
                            {/* Avatar */}
                            <div className="relative shrink-0">
                              <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-gray-100 group-hover:ring-blue-200 transition-all">
                                <Image
                                  src={user.avatarUrl || "/tanjiro.jpg"}
                                  alt={`${user.firstName} ${user.lastName}`}
                                  width={48}
                                  height={48}
                                  className="rounded-full object-cover w-full h-full"
                                />
                              </div>
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {user.firstName} {user.lastName}
                                </p>
                              </div>
                              <p className="text-xs text-gray-500 font-medium mb-1">
                                @{user.username}
                              </p>
                              {user.bio ? (
                                <p className="text-xs text-gray-600 line-clamp-1 mt-1">
                                  {user.bio}
                                </p>
                              ) : (
                                <p className="text-xs text-gray-400 italic">
                                  No bio
                                </p>
                              )}
                            </div>

                            {/* Friends Count & Arrow */}
                            <div className="shrink-0 flex items-center gap-3">
                              {user.friendsCount > 0 && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full">
                                  <svg
                                    className="w-3 h-3 text-gray-600"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                  </svg>
                                  <span className="text-xs font-medium text-gray-700">
                                    {user.friendsCount}
                                  </span>
                                </div>
                              )}
                              <svg
                                className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : searchQuery.trim() ? (
                      <div className="px-4 py-12 text-center">
                        <svg
                          className="w-12 h-12 mx-auto text-gray-300 mb-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        <p className="text-sm font-medium text-gray-600 mb-1">
                          No users found
                        </p>
                        <p className="text-xs text-gray-400">
                          Try searching with a different name
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            {/* Back Button */}
            <button
              onClick={handleBackToFriends}
              className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="font-medium">Back to Friends</span>
            </button>
            

            {/* Profile Section */}
            <section className="flex-1 overflow-y-auto flex flex-col gap-6">
              <div className="bg-white rounded-2xl shadow relative overflow-hidden">
                {/* Cover Image */}
                <div className="h-40 w-full relative">
                  {selectedUser.bannerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedUser.bannerUrl}
                      alt="Profile Banner"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-linear-to-r from-pink-200 via-yellow-200 to-green-200" />
                  )}
                </div>

                {/* Profile Avatar - left aligned */}
                <div className="absolute left-10 top-28 flex items-center">
                  <div className="rounded-full border-4 border-white p-1 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedUser.avatarUrl || "/tanjiro.jpg"}
                      alt="Profile Avatar"
                      className="w-[90px] h-[90px] rounded-full object-cover"
                    />
                  </div>
                  {/* Stats - right of avatar */}
                  <div
                    className="flex flex-col justify-center ml-6 relative"
                    style={{ top: "25px" }}
                  >
                    <div className="flex gap-8">
                      <div className="text-center">
                        <span className="text-xl font-semibold">
                          {selectedUser.friendsCount}
                        </span>
                        <span className="text-gray-500 ml-1">Friends</span>
                        <span className="text-gray-500 ml-4">|</span>
                        <span className="text-black-500 ml-4 font-semibold">
                          {selectedUser.faculty || "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Name & Verified */}
                <div className="flex items-center justify-between mt-19 ml-8 mr-8">
                  <div className="flex items-center">
                    <span className="text-2xl font-bold">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </span>
                    <svg
                      className="w-6 h-6 text-blue-500 ml-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm3.93 6.36l-4.24 4.24a1 1 0 01-1.41 0l-2.12-2.12a1 1 0 111.41-1.41l1.41 1.41 3.54-3.54a1 1 0 111.41 1.41z" />
                    </svg>
                  </div>

                  {/* Friend/Unfriend Button */}
                  <button
                    onClick={handleFriendAction}
                    disabled={isAddingFriend}
                    className={`
                      group relative flex items-center gap-2 px-6 py-2.5 rounded-full font-medium text-sm
                      transition-all duration-300 ease-in-out
                      ${isFriend 
                        ? showUnfriendConfirm
                          ? 'bg-red-500 text-white hover:bg-red-600 border-2 border-red-500 hover:border-red-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border-2 border-gray-200'
                        : 'bg-slate-600 text-white hover:bg-slate-700 hover:shadow-lg hover:shadow-slate-200 border-2 border-slate-600'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transform hover:scale-105 active:scale-95
                    `}
                  >
                    {isAddingFriend ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{isFriend ? 'Removing...' : 'Adding...'}</span>
                      </>
                    ) : (
                      <>
                        {isFriend ? (
                          showUnfriendConfirm ? (
                            <>
                              <svg 
                                className="w-4 h-4 transition-transform group-hover:scale-110" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Click to Confirm</span>
                            </>
                          ) : (
                            <>
                              <svg 
                                className="w-4 h-4 transition-transform group-hover:scale-110" 
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                              >
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="group-hover:hidden">Friends</span>
                              <span className="hidden group-hover:inline">Unfriend</span>
                            </>
                          )
                        ) : (
                          <>
                            <svg 
                              className="w-4 h-4 transition-transform group-hover:scale-110" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Add Friend</span>
                          </>
                        )}
                      </>
                    )}
                  </button>
                </div>

                {/* Bio */}
                <div className="text-left text-gray-600 mt-2 px-8">
                  {selectedUser.bio || "This user has no bio yet."}
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
                      <path d="M6 3h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
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

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === "Posts" && (
                    <div className="space-y-6">
                      {loadingPosts ? (
                        <div className="flex justify-center items-center py-12">
                          <div className="text-gray-500">Loading posts...</div>
                        </div>
                      ) : userPosts.length > 0 ? (
                        userPosts.map((post) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            onLikeUpdate={handleLikeUpdate}
                            onRepostUpdate={handleRepostUpdate}
                            onSaveUpdate={handleSaveUpdate}
                          />
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-16 h-16 text-gray-300 mb-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path d="M6 3h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7h5M8 10h5M8 13h5M8 17h8"
                            />
                          </svg>
                          <p className="text-gray-500 text-lg">
                            ผู้ใช้คนนี้ยังไม่ได้โพสต์อะไรเลย
                          </p>
                          <p className="text-gray-400 text-sm mt-2">
                            ยังไม่มีโพสต์ที่แชร์
                          </p>
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
                      <p className="text-gray-500 text-lg">ผู้ใช้คนนี้ยังไม่มีสินค้าในตลาด</p>
                      <p className="text-gray-400 text-sm mt-2">
                        ยังไม่มีสินค้าที่ลงขาย
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
                      <p className="text-gray-500 text-lg">รายการเพื่อนของผู้ใช้คนนี้</p>
                      <p className="text-gray-400 text-sm mt-2">
                        มีเพื่อน {selectedUser.friendsCount} คน
                      </p>
                    </div>
                  )}

                  {activeTab === "Reposts" && (
                    <div className="space-y-6">
                      {userRepostedPosts.length > 0 ? (
                        userRepostedPosts.map((post) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            onLikeUpdate={handleLikeUpdate}
                            onRepostUpdate={handleRepostUpdate}
                            onSaveUpdate={handleSaveUpdate}
                          />
                        ))
                      ) : (
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
                            ผู้ใช้คนนี้ยังไม่ได้รีโพสต์อะไรเลย
                          </p>
                          <p className="text-gray-400 text-sm mt-2">
                            ยังไม่มีโพสต์ที่รีโพสต์
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "Liked" && (
                    <div className="space-y-6">
                      {userLikedPosts.length > 0 ? (
                        userLikedPosts.map((post) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            onLikeUpdate={handleLikeUpdate}
                            onRepostUpdate={handleRepostUpdate}
                            onSaveUpdate={handleSaveUpdate}
                          />
                        ))
                      ) : (
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
                            ผู้ใช้คนนี้ยังไม่ได้ไลก์โพสต์ไหนเลย
                          </p>
                          <p className="text-gray-400 text-sm mt-2">
                            ยังไม่มีโพสต์ที่ไลก์ไว้
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "Saved" && (
                    <div className="space-y-6">
                      {userSavedPosts.length > 0 ? (
                        userSavedPosts.map((post) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            onLikeUpdate={handleLikeUpdate}
                            onRepostUpdate={handleRepostUpdate}
                            onSaveUpdate={handleSaveUpdate}
                          />
                        ))
                      ) : (
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
                            ผู้ใช้คนนี้ยังไม่ได้บันทึกอะไรไว้
                          </p>
                          <p className="text-gray-400 text-sm mt-2">
                            ยังไม่มีโพสต์ที่บันทึกไว้
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        ) : (
          /* Friends List View */
          <>
            {/* Search bar */}
            <div className="mb-6" ref={searchRef}>
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
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-3 py-2 rounded-full bg-white text-sm placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />

                {/* Search Dropdown */}
                {showDropdown && (
                  <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-[500px] overflow-y-auto">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                          <p className="text-sm text-gray-500">Searching...</p>
                        </div>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => handleUserClick(user.id)}
                            className="flex items-center gap-4 px-5 py-4 hover:bg-linear-to-r hover:from-gray-50 hover:to-blue-50/30 cursor-pointer transition-all duration-200 group"
                          >
                            {/* Avatar */}
                            <div className="relative shrink-0">
                              <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-gray-100 group-hover:ring-blue-200 transition-all">
                                <Image
                                  src={user.avatarUrl || "/tanjiro.jpg"}
                                  alt={`${user.firstName} ${user.lastName}`}
                                  width={48}
                                  height={48}
                                  className="rounded-full object-cover w-full h-full"
                                />
                              </div>
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {user.firstName} {user.lastName}
                                </p>
                              </div>
                              <p className="text-xs text-gray-500 font-medium mb-1">
                                @{user.username}
                              </p>
                              {user.bio ? (
                                <p className="text-xs text-gray-600 line-clamp-1 mt-1">
                                  {user.bio}
                                </p>
                              ) : (
                                <p className="text-xs text-gray-400 italic">
                                  No bio
                                </p>
                              )}
                            </div>

                            {/* Friends Count & Arrow */}
                            <div className="shrink-0 flex items-center gap-3">
                              {user.friendsCount > 0 && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full">
                                  <svg
                                    className="w-3 h-3 text-gray-600"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                  </svg>
                                  <span className="text-xs font-medium text-gray-700">
                                    {user.friendsCount}
                                  </span>
                                </div>
                              )}
                              <svg
                                className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : searchQuery.trim() ? (
                      <div className="px-4 py-12 text-center">
                        <svg
                          className="w-12 h-12 mx-auto text-gray-300 mb-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        <p className="text-sm font-medium text-gray-600 mb-1">
                          No users found
                        </p>
                        <p className="text-xs text-gray-400">
                          Try searching with a different name
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <HorizontalScrollSection
                title="Friend Requests"
                items={friendRequests}
              />
              <HorizontalScrollSection
                title="People you may know"
                items={peopleYouMayKnow}
              />
            </div>
          </>
        )}
      </main>

      {/* Chatbox - Bottom Right */}
      <Chatbox />
    </div>
  );
}
