"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import Chatbox from "../../components/Chatbox";
import PostCard from "../../components/PostCard";
import TokenErrorPopup from "../../components/TokenErrorPopup";
import NotificationsPanel from "../../components/NotificationsPanel";
import MentionTextarea from "../../components/MentionTextarea";
import { API_CONFIG } from "@/lib/config";
import { apiService } from "@/lib/api";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/contexts/ToastContext";

interface PostMedia {
  id: number;
  postId: number;
  mediaUrl: string;
  mediaType: "image" | "video";
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
    role?: string | null;
  };
  media?: PostMedia[];
}

export default function FeedsMainPage() {
  const { activeUser } = useUser();
  const { showSuccess, showError } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showFeedFilter, setShowFeedFilter] = useState(false);
  const feedFilterButtonRef = useRef<HTMLButtonElement>(null);
  const [feedFilterPos, setFeedFilterPos] = useState({ top: 0, right: 0 });
  const [selectedFilter, setSelectedFilter] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("feedFilter") || "Global";
    }
    return "Global";
  });
  const [showShareBar, setShowShareBar] = useState(true);
  const [postText, setPostText] = useState("");
  const [postRawText, setPostRawText] = useState(""); // raw with @[userId] for server
  const [postMode, setPostMode] = useState<string | null>(null);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [showReportPopup, setShowReportPopup] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportMood, setReportMood] = useState<"happy" | "sad" | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showTokenErrorPopup, setShowTokenErrorPopup] = useState(false);

  // Event date/time for Events category posts
  const [showEventDatePopup, setShowEventDatePopup] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventName, setEventName] = useState("");

  // Spotlight post (from notification ?postId=)
  const [spotlightPost, setSpotlightPost] = useState<Post | null>(null);
  const [spotlightLoading, setSpotlightLoading] = useState(false);
  const [spotlightDeleted, setSpotlightDeleted] = useState(false);
  const [spotlightHighlight, setSpotlightHighlight] = useState(false);
  const spotlightRef = useRef<HTMLDivElement>(null);

  // Infinite scroll state
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const feedScrollRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = useRef(false); // block scroll-jump during load

  // Persist selected feed type to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("feedFilter", selectedFilter);
  }, [selectedFilter]);

  // Handle ?postId= from notification "View Post" link
  useEffect(() => {
    const postId = searchParams.get("postId");
    if (!postId || !activeUser) return;

    const fetchSpotlightPost = async () => {
      setSpotlightLoading(true);
      setSpotlightDeleted(false);
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/api/posts/${postId}`, {
          credentials: "include",
        });
        if (!res.ok) {
          setSpotlightDeleted(true);
          setTimeout(() => {
            spotlightRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 150);
          return;
        }
        const data = await res.json();
        if (data.deleted) {
          setSpotlightDeleted(true);
          setTimeout(() => {
            spotlightRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 150);
          return;
        }
        setSpotlightPost(data);
        // Scroll to it after render and flash highlight
        setTimeout(() => {
          spotlightRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          setSpotlightHighlight(true);
          setTimeout(() => setSpotlightHighlight(false), 2000);
        }, 150);
      } catch { /* silent */ }
      finally { setSpotlightLoading(false); }
    };

    fetchSpotlightPost();
  }, [searchParams, activeUser]);

  // Clear spotlight when user switches account (activeUser id changes)
  const prevUserIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prevId = prevUserIdRef.current;
    const currId = activeUser?.id;
    // Only clear if there was a previous user and it actually changed
    if (prevId !== undefined && prevId !== currId) {
      setSpotlightPost(null);
      setSpotlightDeleted(false);
      setSpotlightLoading(false);
      setSpotlightHighlight(false);
      router.replace("/Feeds");
    }
    prevUserIdRef.current = currId;
  }, [activeUser?.id, router]);

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

  // Fetch posts when selectedFilter changes (initial load)
  useEffect(() => {
    const fetchPosts = async () => {
      // Don't fetch if no active user
      if (!activeUser) {
        setPosts([]);
        return;
      }

      setLoading(true);
      setError(null);
      setNextCursor(null);
      setHasMore(false);

      try {
        const response = await fetch(
          `${API_CONFIG.BASE_URL}/api/posts?category=${selectedFilter}&limit=20`,
          {
            credentials: "include",
          },
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

        // Handle both array response and object with posts property
        const postsArray = Array.isArray(data) ? data : data.posts || [];
        console.log("Fetched posts:", postsArray);
        setPosts(postsArray);
        setNextCursor(data.nextCursor ?? null);
        setHasMore(data.hasMore ?? false);
      } catch (err) {
        console.error("Error fetching posts:", err);
        // Check if it's a token error
        if (err instanceof Error && err.message.includes("token")) {
          setShowTokenErrorPopup(true);
        } else {
          setError("Failed to load posts");
        }
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [selectedFilter, activeUser]);

  // Load more posts (append) using cursor
  const loadMorePosts = useCallback(async () => {
    if (!activeUser || !nextCursor || !hasMore || isLoadingMoreRef.current) return;

    const scrollEl = feedScrollRef.current;
    const prevScrollHeight = scrollEl?.scrollHeight ?? 0;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/posts?category=${selectedFilter}&limit=20&cursor=${encodeURIComponent(nextCursor)}`,
        { credentials: "include" },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const morePosts: Post[] = Array.isArray(data) ? data : data.posts || [];

      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const incoming = morePosts.filter((p) => !existingIds.has(p.id));
        return [...prev, ...incoming];
      });
      setNextCursor(data.nextCursor ?? null);
      setHasMore(data.hasMore ?? false);

      // Preserve scroll position: after DOM update, keep scrollTop unchanged
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollEl) {
            const newScrollHeight = scrollEl.scrollHeight;
            // posts are appended at bottom, so scrollTop stays the same naturally
            // but guard against any browser-auto-scroll by restoring it
            const diff = newScrollHeight - prevScrollHeight;
            if (diff > 0 && scrollEl.scrollTop < prevScrollHeight - scrollEl.clientHeight + 10) {
              // only correct if browser jumped scroll unexpectedly
            }
          }
          isLoadingMoreRef.current = false;
        });
      });
    } catch (err) {
      console.error("Error loading more posts:", err);
      isLoadingMoreRef.current = false;
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeUser, nextCursor, hasMore, selectedFilter]);

  // IntersectionObserver: watch sentinel element at bottom of posts list
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMoreRef.current) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMorePosts]);

  const postModes = [
    { id: "Global", label: "Global" },
    { id: "Friends", label: "Friends" },
    { id: "Announcements", label: "Announcements" },
    { id: "Events", label: "Events" },
    { id: "Questions", label: "Questions" },
    { id: "Marketplace", label: "Marketplace" },
    { id: "Shops", label: "Shops / ฝากร้านขายของ" },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(Array.from(files));
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFiles = (files: File[]) => {
    const imageMaxSize = 10 * 1024 * 1024; // 10MB
    const videoMaxSize = 100 * 1024 * 1024; // 100MB
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
    const videoExtensions = /\.(mp4|mov|avi|mkv|webm|flv|wmv|m4v|3gp)$/i;

    const validImages: File[] = [];
    const validVideos: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      const isImage = imageExtensions.test(file.name);
      const isVideo = videoExtensions.test(file.name);

      if (isImage) {
        if (file.size <= imageMaxSize) {
          validImages.push(file);
        } else {
          errors.push(`${file.name} (ภาพขนาดใหญ่เกิน 10MB)`);
        }
      } else if (isVideo) {
        if (file.size <= videoMaxSize) {
          validVideos.push(file);
        } else {
          errors.push(`${file.name} (วีดีโอขนาดใหญ่เกิน 100MB)`);
        }
      } else {
        errors.push(`${file.name} (ไฟล์ไม่รองรับ)`);
      }
    });

    if (errors.length > 0) {
      showError("ไม่สามารถอัพโหลดไฟล์บางไฟล์:\n\n" + errors.join("\n"));
    }

    // Process images
    if (validImages.length > 0) {
      setSelectedImages((prev) => [...prev, ...validImages]);

      validImages.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }

    // Process videos — use createObjectURL so .mov (video/quicktime) also renders
    if (validVideos.length > 0) {
      setSelectedVideos((prev) => [...prev, ...validVideos]);

      validVideos.forEach((file) => {
        const objectUrl = URL.createObjectURL(file);
        setVideoPreviews((prev) => [...prev, objectUrl]);
      });
    }

    // Close popup if files were added
    if (validImages.length > 0 || validVideos.length > 0) {
      setShowUploadPopup(false);
    }
  };

  const handleSendPost = async () => {
    if (!postMode) return;

    try {
      // Create FormData for multipart/form-data
      const formData = new FormData();

      // Add text content and category — always encode @[Name](id) → @[id] to be safe
      const encodeRaw = (t: string) => t.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, (_m, _name, id) => `@[${id}]`);
      const contentToSend = encodeRaw(postRawText.trim() || postText.trim());
      formData.append("content", contentToSend);
      formData.append("category", postMode);

      // If this is an Events post, send event data as what the backend expects
      if (postMode === "Events" && eventDate && eventTime) {
        // Combine date + time into an ISO datetime string
        const [h, m] = eventTime.split(":").map(Number);
        const [y, mo, d] = eventDate.split("-").map(Number);
        const startDateTime = new Date(y, mo - 1, d, h, m);
        formData.append("eventTitle", eventName.trim().slice(0, 255) || postText.split("\n")[0].slice(0, 255) || "Event");
        formData.append("eventStartTime", startDateTime.toISOString());
        formData.append("eventType", "event");
      }

      // Add all images
      selectedImages.forEach((image) => {
        formData.append("media", image);
      });

      // Add all videos
      selectedVideos.forEach((video) => {
        formData.append("media", video);
      });

      // Send to API
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/posts/media`, {
        method: "POST",
        credentials: "include", // Important: Include cookies for authentication
        body: formData,
        // Don't set Content-Type header - browser will set it automatically with boundary
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          errorData.error ||
          `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Post created successfully:", result);
      console.log("Post media:", result.media);
      showSuccess("Post created successfully!");

      // Revoke blob URLs for videos before resetting
      videoPreviews.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });

      // Reset form
      setPostText("");
      setPostRawText("");
      setPostMode(null);
      setSelectedImages([]);
      setSelectedVideos([]);
      setImagePreviews([]);
      setVideoPreviews([]);
      setEventDate("");
      setEventTime("");
      setEventName("");

      // Refresh feed to show new post
      const refreshResponse = await fetch(
        `${API_CONFIG.BASE_URL}/api/posts?category=${selectedFilter}&limit=20`,
        {
          credentials: "include",
        },
      );
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        const postsArray = Array.isArray(data) ? data : data.posts || [];
        console.log("Refreshed posts:", postsArray);
        setPosts(postsArray);
        setNextCursor(data.nextCursor ?? null);
        setHasMore(data.hasMore ?? false);
      }
    } catch (error) {
      console.error("Error creating post:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create post. Please try again.";
      showError(`Error: ${errorMessage}`);
    }
  };

  const canSendPost =
    postMode !== null &&
    (postText.trim() !== "" ||
      selectedImages.length > 0 ||
      selectedVideos.length > 0) &&
    // If posting to Events category, event date AND time must be filled
    (postMode !== "Events" || (eventDate !== "" && eventTime !== ""));

  const filterOptions = [
    { id: "Global", label: "Global" },
    { id: "Following", label: "Following" },
    { id: "Friends", label: "Friends" },
    { id: "Announcements", label: "Announcements" },
    { id: "Events", label: "Events" },
    { id: "Questions", label: "Questions" },
    { id: "Marketplace", label: "Marketplace" },
    { id: "Shops", label: "Shops / ฝากร้านขายของ" },
  ];

  const handleFilterSelect = (filterId: string) => {
    setSelectedFilter(filterId);
    setShowFeedFilter(false);
  };

  // Handle like count update
  const handleLikeUpdate = (postId: string, newLikeCount: number) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId ? { ...post, likeCount: newLikeCount } : post,
      ),
    );
  };

  // Handle repost count update
  const handleRepostUpdate = (postId: string, newRepostCount: number) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId ? { ...post, repostCount: newRepostCount } : post,
      ),
    );
  };

  // Handle save update
  const handleSaveUpdate = () => {
    console.log("Post save status updated");
  };

  // Handle post delete
  const handlePostDelete = (postId: string) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
  };

  // Mock posts (เก็บไว้สำหรับ reference)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockPosts = [...Array(10)].map((_, i) => ({
    id: i,
    author: {
      name: i % 2 === 0 ? "Kamado Tanjiro" : "Noobcat",
      info: i % 2 === 0 ? "65,Engineering" : "Anonymous",
      avatar: i % 2 === 0 ? "/default-avatar.svg" : "/default-avatar.svg",
    },
    content:
      i % 2 === 0
        ? "I love my family so much!"
        : "Just chilling and enjoying life.",
    image: i % 2 === 0 ? "/tanjiro_with_family.webp" : "/cat-post.jpg",
    timeAgo: `${i + 1} hours ago`,
  }));

  return (
    <div className="flex h-screen bg-white text-gray-800 overflow-hidden min-w-[375px]">
      {/* Sidebar (Left) - Sidebar component manages its own open/close, backdrop, and hamburger button */}
      <Sidebar />

      {/* Main Content (Center) */}
      <main className="flex-1 pt-4 lg:pt-8 px-4 lg:px-8 pb-0 flex flex-col gap-4 relative overflow-hidden">

        {/* Search bar */}
        <div className="mb-2 pl-14 lg:pl-0">
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
              ref={feedFilterButtonRef}
              onClick={() => {
                if (!showFeedFilter && feedFilterButtonRef.current) {
                  const rect = feedFilterButtonRef.current.getBoundingClientRect();
                  setFeedFilterPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
                }
                setShowFeedFilter(!showFeedFilter);
              }}
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

            {/* Dropdown Menu — fixed so it renders above all post cards */}
            {showFeedFilter && (
              <>
                <div
                  className="fixed inset-0 z-9998"
                  style={{ zIndex: 9998 }}
                  onClick={() => setShowFeedFilter(false)}
                />
                <div
                  className="fixed w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-9999"
                  style={{ top: feedFilterPos.top, right: feedFilterPos.right, zIndex: 9999 }}
                >
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
                        <span className="text-sm font-medium">
                          {option.label}
                        </span>
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
              </>
            )}
          </div>
        </div>
        {/* Feeds Section: scrollable only for posts */}
        <section ref={feedScrollRef} className="flex-1 overflow-y-auto  flex flex-col gap-6 pb-24">

          {/* ── Spotlight post (from notification or chat ?postId=) ── */}
          {(spotlightLoading || spotlightPost || spotlightDeleted) && (
            <div ref={spotlightRef} className="flex flex-col gap-2">
              {/* Banner */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  {searchParams.get("source") === "chat" ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      โพสต์ที่ได้รับจากแชท
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      Post from notification
                    </>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSpotlightPost(null);
                    setSpotlightDeleted(false);
                    setSpotlightHighlight(false);
                    router.replace("/Feeds");
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 transition flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Dismiss
                </button>
              </div>

              {spotlightLoading ? (
                <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Loading post...
                </div>
              ) : spotlightDeleted ? (
                <div className="flex items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-6 text-gray-400">
                  <svg className="w-6 h-6 shrink-0 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-500">โพสต์นี้ถูกลบไปแล้ว</p>
                    <p className="text-xs text-gray-400 mt-0.5">เนื้อหาของโพสต์นี้ไม่สามารถแสดงได้อีกต่อไป</p>
                  </div>
                </div>
              ) : spotlightPost ? (
                <div className={`rounded-2xl transition-all duration-300 ${spotlightHighlight ? "ring-2 ring-blue-400 ring-offset-2 shadow-lg shadow-blue-100" : ""}`}>
                  <PostCard
                    key={spotlightPost.id}
                    post={spotlightPost}
                    onLikeUpdate={handleLikeUpdate}
                    onRepostUpdate={handleRepostUpdate}
                    onSaveUpdate={handleSaveUpdate}
                    onPostDelete={() => {
                      setSpotlightPost(null);
                      setSpotlightDeleted(false);
                      setSpotlightHighlight(false);
                      router.replace("/Feeds");
                    }}
                  />
                </div>
              ) : null}

              {/* Divider */}
              <div className="flex items-center gap-3 mt-1">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400">Feed</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
            </div>
          )}

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
          {!loading && !error && posts.length === 0 && (
            <div className="flex flex-col justify-center items-center py-12 gap-2 text-gray-400">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">
                {selectedFilter === "Friends"
                  ? "ไม่มีโพสต์จากเพื่อน — ลองเพิ่มเพื่อนหรือให้เพื่อนโพสต์ใน Friends feed"
                  : selectedFilter === "Following"
                  ? "ไม่มีโพสต์จากคนที่คุณติดตาม — ลอง Follow ใครสักคนก่อน"
                  : `ไม่มีโพสต์ใน ${selectedFilter} category`}
              </p>
            </div>
          )}

          {/* Posts from API — all categories */}
          {!loading &&
            !error &&
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLikeUpdate={handleLikeUpdate}
                onRepostUpdate={handleRepostUpdate}
                onSaveUpdate={handleSaveUpdate}
                onPostDelete={handlePostDelete}
                disableShare={selectedFilter === "Friends"}
              />
            ))}

          {/* Sentinel for IntersectionObserver — triggers loadMorePosts */}
          <div ref={sentinelRef} className="h-1" />

          {/* Load more indicator */}
          {isLoadingMore && (
            <div className="flex justify-center items-center py-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Loading more posts...
              </div>
            </div>
          )}

          {/* End of feed indicator */}
          {!loading && !hasMore && posts.length > 0 && (
            <div className="flex justify-center items-center py-4 text-gray-300 text-xs">
              — You&apos;ve reached the end —
            </div>
          )}
        </section>

        {/* Report Popup */}
        {showReportPopup && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowReportPopup(false)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4"
              onClick={(e) => e.stopPropagation()}
            >
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
                  onClick={() => setReportMood("happy")}
                  className={`flex items-center justify-center bg-slate-100 p-3 ring-2 ring-slate-200 duration-300 focus:ring-slate-400 rounded-md ${reportMood === "happy" ? "ring-slate-400" : ""}`}
                >
                  <svg
                    viewBox="0 0 512 512"
                    height="20px"
                    xmlns="http://www.w3.org/2000/svg"
                    className="fill-slate-500"
                  >
                    <path d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm177.6 62.1C192.8 334.5 218.8 352 256 352s63.2-17.5 78.4-33.9c9-9.7 24.2-10.4 33.9-1.4s10.4 24.2 1.4 33.9c-22 23.8-60 49.4-113.6 49.4s-91.7-25.5-113.6-49.4c-9-9.7-8.4-24.9 1.4-33.9s24.9-8.4 33.9 1.4zm40-89.3l0 0 0 0-.2-.2c-.2-.2-.4-.5-.7-.9c-.6-.8-1.6-2-2.8-3.4c-2.5-2.8-6-6.6-10.2-10.3c-8.8-7.8-18.8-14-27.7-14s-18.9 6.2-27.7 14c-4.2 3.7-7.7 7.5-10.2 10.3c-1.2 1.4-2.2 2.6-2.8 3.4c-.3 .4-.6 .7-.7 .9l-.2 .2 0 0 0 0 0 0c-2.1 2.8-5.7 3.9-8.9 2.8s-5.5-4.1-5.5-7.6c0-17.9 6.7-35.6 16.6-48.8c9.8-13 23.9-23.2 39.4-23.2s29.6 10.2 39.4 23.2c9.9 13.2 16.6 30.9 16.6 48.8c0 3.4-2.2 6.5-5.5 7.6s-6.9 0-8.9-2.8l0 0 0 0zm160 0l0 0-.2-.2c-.2-.2-.4-.5-.7-.9c-.6-.8-1.6-2-2.8-3.4c-2.5-2.8-6-6.6-10.2-10.3c-8.8-7.8-18.8-14-27.7-14s-18.9 6.2-27.7 14c-4.2 3.7-7.7 7.5-10.2 10.3c-1.2 1.4-2.2 2.6-2.8 3.4c-.3 .4-.6 .7-.7 .9l-.2 .2 0 0 0 0 0 0c-2.1 2.8-5.7 3.9-8.9 2.8s-5.5-4.1-5.5-7.6c0-17.9 6.7-35.6 16.6-48.8c9.8-13 23.9-23.2 39.4-23.2s29.6 10.2 39.4 23.2c9.9 13.2 16.6 30.9 16.6 48.8c0 3.4-2.2 6.5-5.5 7.6s-6.9 0-8.9-2.8l0 0 0 0 0 0z" />
                  </svg>
                </button>

                <button
                  onClick={() => setReportMood("sad")}
                  className={`flex items-center justify-center bg-slate-100 p-3 ring-2 ring-slate-200 duration-300 focus:ring-slate-400 rounded-md ${reportMood === "sad" ? "ring-slate-400" : ""}`}
                >
                  <svg
                    viewBox="0 0 512 512"
                    height="20px"
                    xmlns="http://www.w3.org/2000/svg"
                    className="fill-slate-500"
                  >
                    <path d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zM174.6 384.1c-4.5 12.5-18.2 18.9-30.7 14.4s-18.9-18.2-14.4-30.7C146.9 319.4 198.9 288 256 288s109.1 31.4 126.6 79.9c4.5 12.5-2 26.2-14.4 30.7s-26.2-2-30.7-14.4C328.2 358.5 297.2 336 256 336s-72.2 22.5-81.4 48.1zM144.4 208a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm192-32a32 32 0 1 1 0 64 32 32 0 1 1 0-64z" />
                  </svg>
                </button>

                <div className="flex-1" />

                <button
                  onClick={() => {
                    // TODO: Submit report
                    console.log("Submitting report:", {
                      text: reportText,
                      mood: reportMood,
                    });
                    setReportText("");
                    setReportMood(null);
                    setShowReportPopup(false);
                  }}
                  className="flex items-center justify-center bg-slate-100 px-4 py-3 ring-2 ring-slate-200 duration-300 hover:ring-slate-400 rounded-md"
                >
                  <svg
                    viewBox="0 0 512 512"
                    height="20px"
                    xmlns="http://www.w3.org/2000/svg"
                    className="fill-slate-500"
                  >
                    <path d="M16.1 260.2c-22.6 12.9-20.5 47.3 3.6 57.3L160 376V479.3c0 18.1 14.6 32.7 32.7 32.7c9.7 0 18.9-4.3 25.1-11.8l62-74.3 123.9 51.6c18.9 7.9 40.8-4.5 43.9-24.7l64-416c1.9-12.1-3.4-24.3-13.5-31.2s-23.3-7.5-34-1.4l-448 256zm52.1 25.5L409.7 90.6 190.1 336l1.2 1L68.2 285.7zM403.3 425.4L236.7 355.9 450.8 116.6 403.3 425.4z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Files Popup */}
        {showUploadPopup && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUploadPopup(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Upload Files
                </h2>
                <button
                  onClick={() => setShowUploadPopup(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Drag and Drop Area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  isDragging
                    ? "border-slate-500 bg-slate-50"
                    : "border-slate-300 hover:border-slate-400 bg-slate-50"
                }`}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-slate-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>

                  <div>
                    <p className="text-lg font-semibold text-gray-700 mb-2">
                      ลากไฟล์มาวางที่นี่
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      หรือคลิกเพื่อเลือกไฟล์
                    </p>
                  </div>

                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpg,image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,video/x-flv,video/x-ms-wmv,.mp4,.mov,.avi,.mkv,.webm,.flv,.wmv,.m4v,.3gp"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <span className="inline-block px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105">
                      เลือกไฟล์
                    </span>
                  </label>
                </div>
              </div>

              {/* File Information */}
              <div className="mt-6 space-y-4">
                <div className="bg-slate-100 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center shrink-0">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1">
                        รูปภาพ
                      </h3>
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">รองรับ:</span> JPG, JPEG,
                        PNG, GIF, WEBP, BMP, SVG
                      </p>
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">ขนาดสูงสุด:</span> 10 MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-100 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center shrink-0">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1">
                        วีดีโอ
                      </h3>
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">รองรับ:</span> MP4, MOV,
                        AVI, MKV, WEBM, FLV, WMV, M4V, 3GP
                      </p>
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">ขนาดสูงสุด:</span> 100 MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Event Date/Time Popup */}
        {showEventDatePopup && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEventDatePopup(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-800">วันและเวลา Event</h2>
                </div>
                <button onClick={() => setShowEventDatePopup(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-5">กรอกวันที่และเวลาที่ Event นี้จะเกิดขึ้น (จำเป็นสำหรับโพสต์ประเภท Events)</p>

              <div className="space-y-4">
                {/* Event Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    ชื่อ Event <span className="text-gray-400 text-xs">(ไม่บังคับ — ถ้าไม่กรอกจะใช้บรรทัดแรกของโพสต์)</span>
                  </label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value.slice(0, 255))}
                    placeholder="เช่น งาน Freshy Night 2026, ..."
                    maxLength={255}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{eventName.length}/255</p>
                </div>
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">วันที่ <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none text-sm"
                  />
                </div>
                {/* Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">เวลา <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => { setEventDate(""); setEventTime(""); setEventName(""); setShowEventDatePopup(false); }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  ล้างค่า
                </button>
                <button
                  onClick={() => setShowEventDatePopup(false)}
                  disabled={!eventDate || !eventTime}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-all ${
                    eventDate && eventTime
                      ? "bg-slate-500 hover:bg-slate-600 shadow"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  ยืนยัน
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share something bar - fixed bottom with toggle */}
        <div className="fixed bottom-4 left-4 right-20 md:left-8 md:right-22 lg:left-72 lg:right-96 z-20 flex flex-col items-center">
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
                <path d="M2 13l6-6 6 6" />
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
                <path d="M2 7l6 6 6-6" />
              </svg>
            )}
          </button>

          {/* Share Bar Content */}
          {showShareBar && (
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 sm:p-5 w-full max-w-2xl">
              {/* Row 1: Avatar + Text Input */}
              <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={apiService.getImageUrl(activeUser?.avatarUrl) || "/default-avatar.svg"}
                  alt="avatar"
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 mt-1"
                />
                <div className="flex-1 relative">
                  <MentionTextarea
                    value={postText}
                    onChange={(text) => setPostText(text.slice(0, 2000))}
                    onChangeRaw={(raw) => setPostRawText(raw.slice(0, 2000))}
                    placeholder="What's on your mind?"
                    rows={1}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-gray-50 text-gray-800 placeholder-gray-400 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white text-sm sm:text-base transition-all resize-none overflow-hidden"
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                    }}
                    maxLength={2000}
                  />
                  {postText.length > 1700 && (
                    <div className={`absolute bottom-1.5 right-3 text-xs pointer-events-none select-none ${
                      postText.length >= 2000 ? "text-red-500 font-semibold" : "text-amber-500"
                    }`}>
                      {postText.length}/2000
                    </div>
                  )}
                </div>
              </div>

              {/* Media Preview - Show when files selected */}
              {(selectedImages.length > 0 || selectedVideos.length > 0) && (
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3 max-h-20 sm:max-h-24 overflow-y-auto">
                  {selectedImages.map((img, idx) => (
                    <div key={`img-${idx}`} className="relative">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500 overflow-hidden">
                        {imagePreviews[idx] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imagePreviews[idx]}
                            alt={`Preview ${idx}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="truncate px-1 text-center text-[10px] sm:text-xs">
                            📷 {img.name.slice(0, 3)}...
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedImages(
                            selectedImages.filter((_, i) => i !== idx),
                          );
                          setImagePreviews(
                            imagePreviews.filter((_, i) => i !== idx),
                          );
                        }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-xs hover:bg-red-600 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {selectedVideos.map((vid, idx) => (
                    <div key={`vid-${idx}`} className="relative">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500 overflow-hidden">
                        {videoPreviews[idx] ? (
                          <video
                            src={videoPreviews[idx]}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          >
                            <source src={videoPreviews[idx]} type={vid.type || "video/mp4"} />
                          </video>
                        ) : (
                          <span className="truncate px-1 text-center text-[10px] sm:text-xs">
                            🎥 {vid.name.slice(0, 3)}...
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          // Revoke the blob URL to free memory
                          if (videoPreviews[idx]?.startsWith("blob:")) {
                            URL.revokeObjectURL(videoPreviews[idx]);
                          }
                          setSelectedVideos(
                            selectedVideos.filter((_, i) => i !== idx),
                          );
                          setVideoPreviews(
                            videoPreviews.filter((_, i) => i !== idx),
                          );
                        }}
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
                  {/* Event Date Button — shown only when Events feed is selected */}
                  {postMode === "Events" && (
                    <button
                      type="button"
                      onClick={() => setShowEventDatePopup(true)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all ${
                        eventDate && eventTime
                          ? "bg-orange-50 text-orange-600 border-orange-300 hover:bg-orange-100"
                          : "bg-red-50 text-red-500 border-red-200 hover:bg-red-100 animate-pulse"
                      }`}
                      title="กรอกวันและเวลาของ Event (จำเป็น)"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="whitespace-nowrap">
                        {eventDate && eventTime
                          ? `${eventName ? eventName.slice(0, 20) + (eventName.length > 20 ? "…" : "") + " · " : ""}${eventDate} ${eventTime}`
                          : "กรอกวันที่ Event ✱"}
                      </span>
                    </button>
                  )}

                  {/* Upload Files Button */}
                  <button
                    type="button"
                    onClick={() => setShowUploadPopup(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-100 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs sm:text-sm font-medium">Upload File</span>
                  </button>

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
                      <span className="truncate max-w-20 sm:max-w-none">
                        {postMode || "Select Feed"}
                      </span>
                      <svg
                        className={`w-2.5 h-2.5 sm:w-3 sm:h-3 transition-transform shrink-0 ${showModeDropdown ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Mode Dropdown */}
                    {showModeDropdown && (
                      <div className="absolute left-0 bottom-full mb-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-30">
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
                            <span
                              className={`text-sm font-medium ${
                                postMode === mode.id
                                  ? "text-blue-600"
                                  : "text-gray-700"
                              }`}
                            >
                              {mode.label}
                            </span>
                            {postMode === mode.id && (
                              <svg
                                className="w-4 h-4 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.5}
                                  d="M5 13l4 4L19 7"
                                />
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
      {/* Right Section: Notifications - Hidden together with Sidebar (show at lg and up) */}
      <NotificationsPanel userId={activeUser?.id ?? null} />

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
