"use client";

import Sidebar from "../../components/Sidebar";
import Chatbox from "../../components/Chatbox";
import PostCard from "../../components/PostCard";
import MarketCard from "../../components/MarketCard";
import React, { useState, useEffect, useRef } from "react";
import { User } from "@/types/user";
import { API_CONFIG } from "@/lib/config";
import { apiService } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

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

// Friend request from API
interface FriendRequest {
  requestId: string;
  senderId: string;
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  createdAt: string;
}

// Friend card component
interface FriendCardProps {
  requestId: string;
  name: string;
  username: string;
  bio: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onChat?: (requestId: string) => void;
}
function FriendCard({ requestId, name, username, bio, avatarUrl, bannerUrl, onAccept, onReject, onChat }: FriendCardProps) {
  const [loading, setLoading] = React.useState<"accept" | "reject" | null>(null);
  const imgSrc = avatarUrl ? apiService.getImageUrl(avatarUrl) || "/default-avatar.svg" : "/default-avatar.svg";
  const bannerSrc = bannerUrl ? apiService.getImageUrl(bannerUrl) : null;

  const handleAccept = async () => {
    setLoading("accept");
    await onAccept(requestId);
    setLoading(null);
  };

  const handleReject = async () => {
    setLoading("reject");
    await onReject(requestId);
    setLoading(null);
  };

  return (
    <div className="relative rounded-2xl shadow-md bg-white w-full flex flex-col">
      {/* Cover banner */}
      <div className="h-28 sm:h-32 w-full shrink-0 rounded-t-2xl overflow-hidden bg-linear-to-r from-pink-200 via-yellow-200 to-green-200">
        {bannerSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerSrc}
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
            src={imgSrc}
            alt={name}
            className="rounded-full border-[3px] border-white shadow-md w-16 h-16 sm:w-20 sm:h-20 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = "/default-avatar.svg"; }}
          />
        </div>

        {/* Name */}
        <p className="text-gray-900 font-semibold text-sm sm:text-base text-center truncate w-full px-2 leading-tight">
          {name}
        </p>

        {/* Username */}
        <p className="text-xs text-gray-400 text-center mt-0.5">
          @{username}
        </p>

        {/* Bio */}
        <p className="text-xs sm:text-sm text-gray-500 text-center line-clamp-2 w-full px-2 mt-1 mb-4 leading-relaxed min-h-10 overflow-hidden">
          {bio || <span className="italic text-gray-300">No bio yet</span>}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full justify-center">
          {/* Accept */}
          <button
            disabled={loading !== null}
            onClick={handleAccept}
            className="flex-1 text-sm font-medium text-white py-2 rounded-full transition-all bg-slate-700 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            {loading === "accept" ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : "Accept"}
          </button>
          {/* Reject */}
          <button
            disabled={loading !== null}
            onClick={handleReject}
            className="flex-1 text-sm font-medium text-gray-600 py-2 rounded-full transition-all bg-gray-100 hover:bg-red-100 hover:text-red-600 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            {loading === "reject" ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : "Reject"}
          </button>
          {/* Chat */}
          {onChat && (
            <button
              disabled={loading !== null}
              onClick={() => onChat(requestId)}
              title="Chat"
              className="w-9 h-9 shrink-0 rounded-full transition-all bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Friend data returned from /api/friends/user/:userId
interface UserFriend {
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

// Card shown when viewing another user's friends list (no Unfriend)
function UserFriendCard({
  friend,
  isSelf,
  onViewProfile,
}: {
  friend: UserFriend;
  isSelf: boolean;
  onViewProfile: (id: string) => void;
}) {
  const imgSrc = friend.avatarUrl ? apiService.getImageUrl(friend.avatarUrl) || "/default-avatar.svg" : "/default-avatar.svg";
  const bannerSrc = friend.bannerUrl ? apiService.getImageUrl(friend.bannerUrl) : null;
  const name = `${friend.firstName ?? ""} ${friend.lastName ?? ""}`.trim() || "Unknown";

  return (
    <div className="relative rounded-2xl shadow-md bg-white w-full flex flex-col">
      {/* Cover banner */}
      <div className="h-28 sm:h-32 w-full shrink-0 rounded-t-2xl overflow-hidden bg-linear-to-r from-pink-200 via-yellow-200 to-green-200">
        {bannerSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerSrc} alt="banner" className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col items-center px-4 pb-5 pt-0 w-full">
        {/* Avatar overlapping banner */}
        <div className="-mt-10 sm:-mt-12 mb-3 shrink-0 z-10 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgSrc} alt={name}
            className="rounded-full border-[3px] border-white shadow-md w-16 h-16 sm:w-20 sm:h-20 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = "/default-avatar.svg"; }} />
          {isSelf && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow">
              You
            </span>
          )}
        </div>

        {/* Name */}
        <p className="text-gray-900 font-semibold text-sm sm:text-base text-center truncate w-full px-2 leading-tight mt-1">
          {name}
        </p>

        {/* Username */}
        {friend.username && (
          <p className="text-xs text-gray-400 text-center mt-0.5">@{friend.username}</p>
        )}

        {/* Bio */}
        <p className="text-xs sm:text-sm text-gray-500 text-center line-clamp-2 w-full px-2 mt-1 mb-4 leading-relaxed min-h-10 overflow-hidden">
          {friend.bio || <span className="italic text-gray-300">No bio yet</span>}
        </p>

        {/* Actions */}
        {isSelf ? (
          <p className="text-xs text-blue-400 font-medium py-2">นี่คือคุณ</p>
        ) : (
          <div className="flex items-center gap-2 w-full justify-center">
            {/* View Profile */}
            <button
              onClick={() => onViewProfile(friend.id)}
              className="flex-1 text-sm font-medium py-2 rounded-full transition-all bg-slate-700 text-white hover:bg-slate-800 flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              View Profile
            </button>
            {/* Chat */}
            <button
              title="Chat"
              className="w-9 h-9 shrink-0 rounded-full transition-all bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 flex items-center justify-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// "People you may know" card
interface SuggestedPersonCardProps {
  id: string;
  name: string;
  username: string;
  bio: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  onAddFriend: (id: string) => void;
  onViewProfile: (id: string) => void;
  onChat: (id: string) => void;
}
function SuggestedPersonCard({ id, name, username, bio, avatarUrl, bannerUrl, onAddFriend, onViewProfile, onChat }: SuggestedPersonCardProps) {
  const [added, setAdded] = React.useState(false);
  const imgSrc = avatarUrl ? apiService.getImageUrl(avatarUrl) || "/default-avatar.svg" : "/default-avatar.svg";
  const bannerSrc = bannerUrl ? apiService.getImageUrl(bannerUrl) : null;

  const handleAddFriend = () => {
    setAdded(true);
    onAddFriend(id);
  };

  return (
    <div className="relative rounded-2xl shadow-md bg-white w-full flex flex-col">
      {/* Cover banner */}
      <div className="h-28 sm:h-32 w-full shrink-0 rounded-t-2xl overflow-hidden bg-linear-to-r from-pink-200 via-yellow-200 to-green-200">
        {bannerSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerSrc} alt="banner" className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        )}
      </div>
      {/* Body */}
      <div className="flex flex-col items-center px-4 pb-5 pt-0 w-full">
        {/* Avatar overlapping banner */}
        <div className="-mt-10 sm:-mt-12 mb-3 shrink-0 z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgSrc} alt={name}
            className="rounded-full border-[3px] border-white shadow-md w-16 h-16 sm:w-20 sm:h-20 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = "/default-avatar.svg"; }} />
        </div>
        {/* Name */}
        <p className="text-gray-900 font-semibold text-sm sm:text-base text-center truncate w-full px-2 leading-tight">
          {name}
        </p>
        {/* Username */}
        <p className="text-xs text-gray-400 text-center mt-0.5">@{username}</p>
        {/* Bio */}
        <p className="text-xs sm:text-sm text-gray-500 text-center line-clamp-2 w-full px-2 mt-1 mb-4 leading-relaxed min-h-10 overflow-hidden">
          {bio || <span className="italic text-gray-300">No bio yet</span>}
        </p>
        {/* Actions: [+ Add Friend] [👤 View Profile] [💬] */}
        <div className="flex items-center gap-2 w-full justify-center">
          {/* Add Friend */}
          <button
            onClick={handleAddFriend}
            disabled={added}
            className={`flex-1 text-sm font-medium py-2 rounded-full transition-all flex items-center justify-center gap-1 ${added ? "bg-green-100 text-green-600 cursor-default" : "bg-slate-700 text-white hover:bg-slate-800"}`}
          >
            {added ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Requested
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Add Friend
              </>
            )}
          </button>
          {/* View Profile */}
          <button
            onClick={() => onViewProfile(id)}
            className="flex-1 text-sm font-medium py-2 rounded-full transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            View Profile
          </button>
          {/* Chat */}
          <button
            onClick={() => onChat(id)}
            title="Chat"
            className="w-9 h-9 shrink-0 rounded-full transition-all bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 flex items-center justify-center"
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

function HorizontalScrollSection({ title, items }: { title: string; items: FriendCardProps[] }) {  const [startIdx, setStartIdx] = React.useState(0);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visibleItems.map((f, idx) => (
          <div key={idx} className="w-full">
            <FriendCard {...f} />
          </div>
        ))}
      </div>
    </section>
  );
}

function HorizontalScrollSectionSuggested({ title, items }: { title: string; items: SuggestedPersonCardProps[] }) {
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visibleItems.map((p, idx) => (
          <div key={idx} className="w-full">
            <SuggestedPersonCard {...p} />
          </div>
        ))}
      </div>
    </section>
  );
}

// Mock data – "People you may know"
const peopleYouMayKnow: SuggestedPersonCardProps[] = [
  {
    id: "mock-1",
    name: "People 5",
    username: "people5",
    bio: "Design is my passion",
    onAddFriend: (id) => console.log("Add friend", id),
    onViewProfile: (id) => console.log("View profile", id),
    onChat: (id) => console.log("Chat with", id),
  },
  {
    id: "mock-2",
    name: "People 6",
    username: "people6",
    bio: "Always learning",
    onAddFriend: (id) => console.log("Add friend", id),
    onViewProfile: (id) => console.log("View profile", id),
    onChat: (id) => console.log("Chat with", id),
  },
  {
    id: "mock-3",
    name: "People 7",
    username: "people7",
    bio: "Fullstack developer",
    onAddFriend: (id) => console.log("Add friend", id),
    onViewProfile: (id) => console.log("View profile", id),
    onChat: (id) => console.log("Chat with", id),
  },
  {
    id: "mock-4",
    name: "People 8",
    username: "people8",
    bio: "Marketing & growth hacker",
    onAddFriend: (id) => console.log("Add friend", id),
    onViewProfile: (id) => console.log("View profile", id),
    onChat: (id) => console.log("Chat with", id),
  },
  {
    id: "mock-5",
    name: "Tomás García",
    username: "tomas_garcia",
    bio: "React Native expert",
    onAddFriend: (id) => console.log("Add friend", id),
    onViewProfile: (id) => console.log("View profile", id),
    onChat: (id) => console.log("Chat with", id),
  },
];

export default function FriendsMainPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeUser } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userRepostedPosts, setUserRepostedPosts] = useState<Post[]>([]);
  const [userLikedPosts, setUserLikedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [activeTab, setActiveTab] = useState("Posts");
  const [isFriend, setIsFriend] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isPendingFromMe, setIsPendingFromMe] = useState(false);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendCardProps[]>([]);
  const [selectedUserFriends, setSelectedUserFriends] = useState<UserFriend[]>([]);
  const [selectedUserFriendsLoading, setSelectedUserFriendsLoading] = useState(false);
  const [selectedUserMarketItems, setSelectedUserMarketItems] = useState<MarketItemAPI[]>([]);
  const [marketItemsLoading, setMarketItemsLoading] = useState(false);
  const [marketItemsError, setMarketItemsError] = useState<string | null>(null);
  const [selectedMarketItem, setSelectedMarketItem] = useState<MarketItemAPI | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/friends/respond`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status: "accepted" }),
      });
      if (res.ok) {
        setFriendRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      } else {
        console.error("Failed to accept friend request");
      }
    } catch (err) {
      console.error("Error accepting friend request:", err);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/friends/respond`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status: "rejected" }),
      });
      if (res.ok) {
        setFriendRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      } else {
        console.error("Failed to reject friend request");
      }
    } catch (err) {
      console.error("Error rejecting friend request:", err);
    }
  };

  // Load friend requests from API
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/api/friends/requests/me`, {
          credentials: "include",
        });
        if (res.ok) {
          const data: FriendRequest[] = await res.json();
          const mapped: FriendCardProps[] = data.map((req) => ({
            requestId: req.requestId,
            name: `${req.firstName} ${req.lastName}`,
            username: req.username,
            bio: req.bio ?? "",
            avatarUrl: req.avatarUrl,
            bannerUrl: req.bannerUrl,
            onAccept: handleAcceptRequest,
            onReject: handleRejectRequest,
            onChat: () => {
              // TODO: integrate chat API
              console.log("Open chat with sender:", req.senderId);
            },
          }));
          setFriendRequests(mapped);
        }
      } catch (err) {
        console.error("Failed to load friend requests:", err);
      }
    };
    load();
  }, []); // intentionally empty — handlers are stable

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
        
        // Set friendship status from API response
        const status = userData.friendshipStatus as string | undefined;
        setIsFriend(status === 'friends' || status === 'accepted');
        setIsPending(status === 'pending');
        setIsPendingFromMe(userData.isPendingFrom === 'me');
        
        // Fetch user's posts
        setLoadingPosts(true);
        try {
          const postsResponse = await fetch(
            `${API_CONFIG.BASE_URL}/api/posts/user/${userId}`,
            {
              credentials: "include",
            }
          );

          if (postsResponse.ok) {
            const postsData = await postsResponse.json();
            const postsArray = Array.isArray(postsData) ? postsData : [];
            setUserPosts(postsArray);
          } else {
            console.error("Failed to fetch user posts");
            setUserPosts([]);
          }
        } catch (postError) {
          console.error("Error fetching user posts:", postError);
          setUserPosts([]);
        }

        // Fetch user's reposts
        try {
          const repostsResponse = await fetch(
            `${API_CONFIG.BASE_URL}/api/posts/user/${userId}/reposts`,
            {
              credentials: "include",
            }
          );

          if (repostsResponse.ok) {
            const repostsData = await repostsResponse.json();
            const repostsArray = Array.isArray(repostsData) ? repostsData : [];
            setUserRepostedPosts(repostsArray);
          } else {
            console.error("Failed to fetch user reposts");
            setUserRepostedPosts([]);
          }
        } catch (repostError) {
          console.error("Error fetching user reposts:", repostError);
          setUserRepostedPosts([]);
        }

        // Fetch user's liked posts
        try {
          const likedResponse = await fetch(
            `${API_CONFIG.BASE_URL}/api/posts/user/${userId}/liked`,
            {
              credentials: "include",
            }
          );

          if (likedResponse.ok) {
            const likedData = await likedResponse.json();
            const likedArray = Array.isArray(likedData) ? likedData : [];
            setUserLikedPosts(likedArray);
          } else {
            console.error("Failed to fetch user liked posts");
            setUserLikedPosts([]);
          }
        } catch (likedError) {
          console.error("Error fetching user liked posts:", likedError);
          setUserLikedPosts([]);
        }

        setLoadingPosts(false);
      } else {
        console.error("Failed to fetch user data");
        setLoadingPosts(false);
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
    setSelectedUserFriends([]);
    setSelectedUserMarketItems([]);
    setMarketItemsError(null);
    setSelectedMarketItem(null);
    setActiveTab("Posts");
    setIsFriend(false);
    setIsPending(false);
    setIsPendingFromMe(false);
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
        // Remove friend
        const res = await fetch(`${API_CONFIG.BASE_URL}/api/friends/${selectedUser.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (res.ok) {
          setIsFriend(false);
          setShowUnfriendConfirm(false);
        } else {
          console.error("Failed to remove friend");
        }
      } else if (isPending && isPendingFromMe) {
        // Cancel pending friend request — same DELETE endpoint, no status check on backend
        const res = await fetch(`${API_CONFIG.BASE_URL}/api/friends/${selectedUser.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (res.ok) {
          setIsPending(false);
          setIsPendingFromMe(false);
        } else {
          console.error("Failed to cancel friend request");
        }
      } else {
        // Send friend request — body field is userId2
        const res = await fetch(`${API_CONFIG.BASE_URL}/api/friends/request`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId2: selectedUser.id }),
        });
        if (res.ok) {
          setIsPending(true);
          setIsPendingFromMe(true);
        } else {
          console.error("Failed to send friend request");
        }
      }
    } catch (error) {
      console.error("Error updating friend status:", error);
    } finally {
      setIsAddingFriend(false);
    }
  };

  // Fetch selected user's friends when Friends tab is active
  useEffect(() => {
    if (activeTab !== "Friends" || !selectedUser) return;
    const fetchSelectedUserFriends = async () => {
      setSelectedUserFriendsLoading(true);
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/api/friends/user/${selectedUser.id}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setSelectedUserFriends(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Error fetching user friends:", err);
        setSelectedUserFriends([]);
      } finally {
        setSelectedUserFriendsLoading(false);
      }
    };
    fetchSelectedUserFriends();
  }, [activeTab, selectedUser]);

  // Fetch selected user's market items when "Your Market Items" tab is active
  useEffect(() => {
    if (activeTab !== "Your Market Items" || !selectedUser) return;
    const fetchUserMarketItems = async () => {
      setMarketItemsLoading(true);
      setMarketItemsError(null);
      try {
        const res = await fetch(
          `${API_CONFIG.BASE_URL}/api/market/user/${selectedUser.id}/items`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setSelectedUserMarketItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching user market items:", err);
        setMarketItemsError("ไม่สามารถโหลดรายการสินค้าได้");
        setSelectedUserMarketItems([]);
      } finally {
        setMarketItemsLoading(false);
      }
    };
    fetchUserMarketItems();
  }, [activeTab, selectedUser]);

  // Handle like count update
  const handleLikeUpdate = (postId: number, newLikeCount: number) => {    setUserPosts(prevPosts =>
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
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={apiService.getImageUrl(user.avatarUrl) || "/default-avatar.svg"}
                                  alt={`${user.firstName} ${user.lastName}`}
                                  className="rounded-full object-cover w-full h-full"
                                  onError={(e) => { (e.target as HTMLImageElement).src = "/default-avatar.svg"; }}
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
                      src={apiService.getImageUrl(selectedUser.bannerUrl) || ""}
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
                      src={apiService.getImageUrl(selectedUser.avatarUrl) || "/default-avatar.svg"}
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
                        : isPending
                          ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 hover:text-red-600 border-2 border-yellow-300 hover:border-red-300'
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
                        <span>{isFriend ? 'Removing...' : isPending ? 'Cancelling...' : 'Adding...'}</span>
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
                        ) : isPending ? (
                          <>
                            <svg
                              className="w-4 h-4 transition-transform group-hover:scale-110"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {isPendingFromMe ? (
                              <>
                                <span className="group-hover:hidden">Pending</span>
                                <span className="hidden group-hover:inline">Cancel Request</span>
                              </>
                            ) : (
                              <span>Accept Request</span>
                            )}
                          </>
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
                    <div>
                      {/* Loading */}
                      {marketItemsLoading && (
                        <div className="text-center py-12">
                          <div className="text-gray-500">กำลังโหลดสินค้า...</div>
                        </div>
                      )}

                      {/* Error */}
                      {marketItemsError && (
                        <div className="text-center py-12">
                          <div className="text-red-500">{marketItemsError}</div>
                        </div>
                      )}

                      {/* Empty state */}
                      {!marketItemsLoading && !marketItemsError && selectedUserMarketItems.length === 0 && (
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
                          <p className="text-gray-400 text-sm mt-2">ยังไม่มีสินค้าที่ลงขาย</p>
                        </div>
                      )}

                      {/* Market Items Grid */}
                      {!marketItemsLoading && !marketItemsError && selectedUserMarketItems.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                          {selectedUserMarketItems.map((item) => {
                            const imageUrl = item.imageUrl
                              ? item.imageUrl.startsWith("http")
                                ? item.imageUrl
                                : `${API_CONFIG.BASE_URL}${item.imageUrl}`
                              : undefined;
                            const sellerAvatarUrl = item.seller.avatarUrl
                              ? item.seller.avatarUrl.startsWith("http")
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
                      {selectedUserFriendsLoading && (
                        <div className="flex justify-center py-16">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600" />
                        </div>
                      )}

                      {/* Empty state */}
                      {!selectedUserFriendsLoading && selectedUserFriends.length === 0 && (
                        <div className="text-center py-12">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-16 h-16 text-gray-300 mx-auto mb-4">
                            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
                            <circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
                            <path stroke="currentColor" strokeWidth="2" d="M2 20c0-3 3-5 6-5s6 2 6 5" fill="none" />
                            <path stroke="currentColor" strokeWidth="2" d="M12 20c0-3 3-5 6-5s6 2 6 5" fill="none" />
                          </svg>
                          <p className="text-gray-500 text-lg">รายการเพื่อนของผู้ใช้คนนี้</p>
                          <p className="text-gray-400 text-sm mt-2">มีเพื่อน {selectedUser.friendsCount} คน</p>
                        </div>
                      )}

                      {/* Friends grid */}
                      {!selectedUserFriendsLoading && selectedUserFriends.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {selectedUserFriends.map((friend) => (
                            <UserFriendCard
                              key={friend.id}
                              friend={friend}
                              isSelf={activeUser?.id === friend.id}
                              onViewProfile={(id) => {
                                router.push(`/Friends?userId=${id}`);
                              }}
                            />
                          ))}
                        </div>
                      )}
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
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={apiService.getImageUrl(user.avatarUrl) || "/default-avatar.svg"}
                                  alt={`${user.firstName} ${user.lastName}`}
                                  className="rounded-full object-cover w-full h-full"
                                  onError={(e) => { (e.target as HTMLImageElement).src = "/default-avatar.svg"; }}
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
              <HorizontalScrollSectionSuggested
                title="People you may know"
                items={peopleYouMayKnow}
              />
            </div>
          </>
        )}
      </main>

      {/* Chatbox - Bottom Right */}
      <Chatbox />

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
                      const fullUrl = currentUrl.startsWith("http")
                        ? currentUrl
                        : `${API_CONFIG.BASE_URL}${currentUrl}`;
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
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((p) => (p === total - 1 ? 0 : p + 1)); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2.5 shadow-lg transition-all hover:scale-110 z-10"
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
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
                  <span className="text-4xl font-bold text-orange-600">
                    ฿{parseFloat(selectedMarketItem.price).toFixed(0)}
                  </span>
                </div>

                <div className="border-t border-gray-200 my-4" />

                <div className="mb-6 flex-1">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">รายละเอียดสินค้า</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">{selectedMarketItem.description}</p>
                </div>

                {selectedMarketItem.category && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">หมวดหมู่</h3>
                    <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                      {selectedMarketItem.category}
                    </span>
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
                        src={
                          selectedMarketItem.seller.avatarUrl
                            ? selectedMarketItem.seller.avatarUrl.startsWith("http")
                              ? selectedMarketItem.seller.avatarUrl
                              : `${API_CONFIG.BASE_URL}${selectedMarketItem.seller.avatarUrl}`
                            : "/default-avatar.svg"
                        }
                        alt={`${selectedMarketItem.seller.firstName} ${selectedMarketItem.seller.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {selectedMarketItem.seller.firstName} {selectedMarketItem.seller.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {activeUser?.id === selectedMarketItem.seller.id ? "ผู้ขาย (คุณ)" : "ผู้ขาย"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Seller Button — ซ่อนถ้าสินค้าเป็นของเราเอง */}
                {activeUser?.id === selectedMarketItem.seller.id ? (
                  <div className="w-full bg-gray-100 text-gray-400 py-4 px-6 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 cursor-not-allowed select-none">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    สินค้าของคุณ
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      // TODO: implement contact seller chat API
                      console.log("Contact seller:", selectedMarketItem.seller.id);
                    }}
                    className="w-full bg-slate-600 text-white py-4 px-6 rounded-xl hover:bg-slate-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    ทักแชทหาผู้ขาย
                  </button>
                )}

                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-400">
                    โพสต์เมื่อ{" "}
                    {new Date(selectedMarketItem.createdAt).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
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
