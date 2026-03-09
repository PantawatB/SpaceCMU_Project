"use client";

import React, { useState, useEffect, useRef } from "react";
import { API_CONFIG } from "@/lib/config";
import { apiService } from "@/lib/api";
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
    role?: string | null;
  };
  media?: PostMedia[];
}

interface CommentMedia {
  id: number;
  commentId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  order: number;
}

interface Comment {
  id: string | number;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  parentCommentId?: string | null;
  replyCount?: number;
  likeCount?: number;
  isLikedByMe?: boolean;
  author?: {
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    role?: string | null;
  };
  media?: CommentMedia[];
}

interface PostCardProps {
  post: Post;
  onLikeUpdate?: (postId: string, newLikeCount: number) => void;
  onRepostUpdate?: (postId: string, newRepostCount: number) => void;
  onSaveUpdate?: (postId: string) => void;
  onPostDelete?: (postId: string) => void;
}

interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

const POST_CONTENT_MAX_LENGTH = 2000;

// Regex to detect URLs in text
const URL_REGEX = /https?:\/\/(?:[-\w]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/g;

function extractFirstUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  return match?.[0] ?? null;
}

function renderTextWithLinks(text: string): React.ReactNode {
  const parts = text.split(URL_REGEX);
  const urls = text.match(URL_REGEX) ?? [];
  const result: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    if (part) result.push(<span key={`t-${i}`}>{part}</span>);
    if (urls[i]) {
      result.push(
        <a
          key={`u-${i}`}
          href={urls[i]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {urls[i]}
        </a>
      );
    }
  });
  return <>{result}</>;
}

/** Blue verified checkmark — shown only for official_account role */
function VerifiedBadge({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`${className} text-blue-500 shrink-0`}
      aria-label="Verified official account"
    >
      <path
        fillRule="evenodd"
        d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function PostCard({
  post,
  onLikeUpdate,
  onRepostUpdate,
  onSaveUpdate,
  onPostDelete,
}: PostCardProps) {
  const { activeUser } = useUser();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [showReportPopup, setShowReportPopup] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportMood, setReportMood] = useState<"happy" | "sad" | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);

  // Edit post state
  const [showEditPostPopup, setShowEditPostPopup] = useState(false);
  const [editPostContent, setEditPostContent] = useState("");
  const [editPostMediaFiles, setEditPostMediaFiles] = useState<File[]>([]);
  const [editPostMediaPreviews, setEditPostMediaPreviews] = useState<string[]>([]);
  const [editPostRemoveMediaIds, setEditPostRemoveMediaIds] = useState<string[]>([]);
  const [savingEditPost, setSavingEditPost] = useState(false);
  const [localPostContent, setLocalPostContent] = useState(post.content);
  const [localPostMedia, setLocalPostMedia] = useState<PostMedia[]>(post.media ?? []);
  const [isDraggingEdit, setIsDraggingEdit] = useState(false);

  // Link preview state
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [loadingLinkPreview, setLoadingLinkPreview] = useState(false);
  const linkPreviewFetchedFor = useRef<string | null>(null);

  // Live comment count (includes replies), initialized from prop
  const [localCommentCount, setLocalCommentCount] = useState(post.commentCount);
  // Keep in sync when prop changes (e.g. after feed refresh)
  useEffect(() => { setLocalCommentCount(post.commentCount); }, [post.commentCount]);

  // Fetch link preview for the first URL in the post content
  useEffect(() => {
    const url = extractFirstUrl(localPostContent ?? "");
    if (!url || url === linkPreviewFetchedFor.current) return;
    linkPreviewFetchedFor.current = url;
    setLinkPreview(null);
    setLoadingLinkPreview(true);
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then((data: LinkPreview | null) => {
        if (data && !data.title?.match(/^error$/i)) setLinkPreview(data);
      })
      .catch(() => null)
      .finally(() => setLoadingLinkPreview(false));
  }, [localPostContent]);

  // Comment pagination
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Reply support
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  // Expanded replies: map of commentId -> Comment[]
  const [expandedReplies, setExpandedReplies] = useState<Record<string, Comment[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  const [repliesCursor, setRepliesCursor] = useState<Record<string, string | null>>({});
  const [repliesHasMore, setRepliesHasMore] = useState<Record<string, boolean>>({});

  // Scroll ref for infinite scroll
  const commentsListRef = useRef<HTMLDivElement>(null);

  // Comment kebab menu / edit / delete state
  const [commentMenuOpen, setCommentMenuOpen] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [showCommentDeleteConfirm, setShowCommentDeleteConfirm] = useState<string | null>(null);
  const [showCommentReportPopup, setShowCommentReportPopup] = useState<string | null>(null);
  const [commentReportText, setCommentReportText] = useState("");

  // Comment sort mode: "newest" = newest first, "top" = most liked first
  const [commentSort, setCommentSort] = useState<"newest" | "top">("newest");

  // Comment like optimistic state: map commentId -> { likeCount, isLiked }
  const [commentLikeState, setCommentLikeState] = useState<Record<string, { likeCount: number; isLiked: boolean }>>({});

  // Image lightbox
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Comment media scroll arrows (per-comment tracking via commentId key)
  const [commentMediaScrollState, setCommentMediaScrollState] = useState<Record<string, { left: boolean; right: boolean }>>({});

  // Track user's interaction status
  const [isLiked, setIsLiked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Comment media upload states
  const [commentMediaFiles, setCommentMediaFiles] = useState<File[]>([]);
  const [commentMediaPreviews, setCommentMediaPreviews] = useState<string[]>([]);

  // Comment media lightbox (for viewing comment/reply images full-size)
  const [commentLightbox, setCommentLightbox] = useState<{ media: CommentMedia[]; index: number } | null>(null);

  // Media scroll position tracking
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Add to Calendar (Events posts)
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [addedToCalendar, setAddedToCalendar] = useState(false);
  const [showCalendarConfirmPopup, setShowCalendarConfirmPopup] = useState(false);
  const [calendarEventPreview, setCalendarEventPreview] = useState<{
    eventTitle: string;
    eventStartTime: string;
    eventDescription?: string | null;
    eventType?: string | null;
  } | null>(null);
  const [fetchingEventPreview, setFetchingEventPreview] = useState(false);

  // Fetch event data then show confirm popup
  const handleOpenCalendarConfirm = async () => {
    if (addedToCalendar || addingToCalendar || fetchingEventPreview) return;
    setFetchingEventPreview(true);
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/posts/${post.id}/event`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setCalendarEventPreview(data);
        setShowCalendarConfirmPopup(true);
      } else {
        console.error("Event data not found for this post");
      }
    } catch (e) {
      console.error("Failed to fetch event preview:", e);
    } finally {
      setFetchingEventPreview(false);
    }
  };

  // Actually add to calendar after user confirms
  const handleAddToCalendar = async () => {
    if (addedToCalendar || addingToCalendar) return;
    setAddingToCalendar(true);
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/posts/${post.id}/accept-event`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setAddedToCalendar(true);
        setShowCalendarConfirmPopup(false);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("Failed to add to calendar:", err);
      }
    } catch (e) {
      console.error("Failed to add to calendar:", e);
    } finally {
      setAddingToCalendar(false);
    }
  };

  // Check user's interaction status on mount
  useEffect(() => {
    const checkInteractionStatus = async () => {
      if (!activeUser) return;

      try {
        // Check all user's liked posts
        const likedResponse = await fetch(
          `${API_CONFIG.BASE_URL}/api/posts/liked/me`,
          {
            credentials: "include",
          },
        );
        if (likedResponse.ok) {
          const likedPosts = await likedResponse.json();
          const isPostLiked =
            Array.isArray(likedPosts) &&
            likedPosts.some((p: Post) => p.id === post.id);
          setIsLiked(isPostLiked);
        }

        // Check all user's reposted posts
        const repostedResponse = await fetch(
          `${API_CONFIG.BASE_URL}/api/posts/reposted/me`,
          {
            credentials: "include",
          },
        );
        if (repostedResponse.ok) {
          const repostedPosts = await repostedResponse.json();
          const isPostReposted =
            Array.isArray(repostedPosts) &&
            repostedPosts.some((p: Post) => p.id === post.id);
          setIsReposted(isPostReposted);
        }

        // Check all user's saved posts
        const savedResponse = await fetch(
          `${API_CONFIG.BASE_URL}/api/posts/saved/me`,
          {
            credentials: "include",
          },
        );
        if (savedResponse.ok) {
          const savedPosts = await savedResponse.json();
          const isPostSaved =
            Array.isArray(savedPosts) &&
            savedPosts.some((p: Post) => p.id === post.id);
          setIsSaved(isPostSaved);
        }
      } catch (error) {
        console.error("Error checking interaction status:", error);
      }
    };

    checkInteractionStatus();
  }, [activeUser, post.id]);

  // Keyboard navigation for post image lightbox
  useEffect(() => {
    if (!showImageLightbox) return;

    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowImageLightbox(false);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        if (selectedImageIndex > 0) {
          setSelectedImageIndex((prev) => prev - 1);
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        if (
          selectedImageIndex <
            localPostMedia.filter((m) => m.mediaType === "image").length - 1
        ) {
          setSelectedImageIndex((prev) => prev + 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress, true);
    return () => {
      window.removeEventListener("keydown", handleKeyPress, true);
      document.body.style.overflow = 'unset';
    };
  }, [showImageLightbox, selectedImageIndex, localPostMedia]);

  // Keyboard navigation for comment/reply media lightbox
  useEffect(() => {
    if (!commentLightbox) return;

    document.body.style.overflow = 'hidden';

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCommentLightbox(null);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        setCommentLightbox(prev => {
          if (!prev || prev.index <= 0) return prev;
          return { ...prev, index: prev.index - 1 };
        });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        setCommentLightbox(prev => {
          if (!prev) return prev;
          const imageList = prev.media.filter(m => m.mediaType === "image");
          if (prev.index >= imageList.length - 1) return prev;
          return { ...prev, index: prev.index + 1 };
        });
      }
    };

    window.addEventListener("keydown", handleKeyPress, true);
    return () => {
      window.removeEventListener("keydown", handleKeyPress, true);
      document.body.style.overflow = 'unset';
    };
  }, [commentLightbox]);

  // Helper function to format time ago
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  };

  const handleLikePost = async () => {
    if (!activeUser) {
      alert("Please login to like posts");
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/posts/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          userId: activeUser.id,
          postId: post.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`,
        );
      }

      const result = await response.json();

      // Toggle like status
      setIsLiked(!isLiked);

      // Update parent component if callback provided
      if (onLikeUpdate && result.likeCount !== undefined) {
        onLikeUpdate(post.id, result.likeCount);
      }
    } catch (error) {
      console.error("Error liking post:", error);
      alert("Failed to like post. Please try again.");
    }
  };

  const handleRepostPost = async () => {
    if (!activeUser) {
      alert("Please login to repost");
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/posts/repost`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          userId: activeUser.id,
          postId: post.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`,
        );
      }

      const result = await response.json();

      // Toggle repost status
      setIsReposted(!isReposted);

      // Update parent component if callback provided
      if (onRepostUpdate && result.repostCount !== undefined) {
        onRepostUpdate(post.id, result.repostCount);
      }
    } catch (error) {
      console.error("Error reposting post:", error);
      alert("Failed to repost. Please try again.");
    }
  };

  const handleSavePost = async () => {
    if (!activeUser) {
      alert("Please login to save posts");
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/posts/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          userId: activeUser.id,
          postId: post.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`,
        );
      }

      await response.json();

      // Toggle save status
      setIsSaved(!isSaved);

      // Update parent component if callback provided
      if (onSaveUpdate) {
        onSaveUpdate(post.id);
      }
    } catch (error) {
      console.error("Error saving post:", error);
      alert("Failed to save post. Please try again.");
    }
  };

  const fetchComments = async (reset = true, sortOverride?: "newest" | "top") => {
    const activeSortMode = sortOverride ?? commentSort;
    if (reset) {
      setLoadingComments(true);
      setComments([]);
      setNextCursor(null);
      setHasMoreComments(false);
    } else {
      setLoadingMore(true);
    }
    try {
      const cursorParam = !reset && nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : "";
      const sortParam = activeSortMode === "top" ? "&sort=top" : "";
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/posts/${post.id}/comments?limit=20${cursorParam}${sortParam}`,
        { credentials: "include" },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch comments: ${response.status}`);
      }

      const data = await response.json();

      // New API returns { comments, nextCursor, hasMore }
      const rawComments = Array.isArray(data) ? data : (data.comments ?? []);
      const fetchedComments: Comment[] = rawComments.map((comment: Record<string, unknown>) => {
        const user = comment.user as Record<string, unknown> | undefined;
        return {
          id: comment.id as string,
          postId: post.id,
          userId: (user?.id ?? "") as string,
          content: comment.content as string,
          createdAt: comment.createdAt as string,
          updatedAt: (comment.updatedAt as string | null) ?? null,
          parentCommentId: comment.parentCommentId as string | null,
          replyCount: (comment.replyCount as number) ?? 0,
          likeCount: (comment.likeCount as number) ?? 0,
          isLikedByMe: (comment.isLikedByMe as boolean) ?? false,
          author: user ? {
            firstName: user.firstName as string | null,
            lastName: user.lastName as string | null,
            avatarUrl: user.avatarUrl as string | null,
            role: user.role as string | null,
          } : undefined,
          media: comment.media as CommentMedia[] | undefined,
        };
      });

      // Initialize like state for new comments
      setCommentLikeState(prev => {
        const next = { ...prev };
        fetchedComments.forEach(c => {
          if (!(String(c.id) in next)) {
            next[String(c.id)] = { likeCount: c.likeCount ?? 0, isLiked: c.isLikedByMe ?? false };
          }
        });
        return next;
      });

      if (reset) {
        setComments(fetchedComments);
      } else {
        setComments(prev => [...prev, ...fetchedComments]);
      }
      setNextCursor(data.nextCursor ?? null);
      setHasMoreComments(data.hasMore ?? false);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoadingComments(false);
      setLoadingMore(false);
    }
  };

  const fetchReplies = async (parentCommentId: string, reset = true) => {
    setLoadingReplies(prev => ({ ...prev, [parentCommentId]: true }));
    try {
      const cursorParam = !reset && repliesCursor[parentCommentId] ? `&cursor=${encodeURIComponent(repliesCursor[parentCommentId]!)}` : "";
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/posts/${post.id}/comments?parentId=${parentCommentId}&limit=10${cursorParam}`,
        { credentials: "include" },
      );
      if (!response.ok) throw new Error("Failed to fetch replies");
      const data = await response.json();
      const rawReplies = Array.isArray(data) ? data : (data.comments ?? []);
      const fetchedReplies: Comment[] = rawReplies.map((comment: Record<string, unknown>) => {
        const user = comment.user as Record<string, unknown> | undefined;
        return {
          id: comment.id as string,
          postId: post.id,
          userId: (user?.id ?? "") as string,
          content: comment.content as string,
          createdAt: comment.createdAt as string,
          updatedAt: (comment.updatedAt as string | null) ?? null,
          parentCommentId: comment.parentCommentId as string | null,
          replyCount: (comment.replyCount as number) ?? 0,
          likeCount: (comment.likeCount as number) ?? 0,
          isLikedByMe: (comment.isLikedByMe as boolean) ?? false,
          author: user ? {
            firstName: user.firstName as string | null,
            lastName: user.lastName as string | null,
            avatarUrl: user.avatarUrl as string | null,
            role: user.role as string | null,
          } : undefined,
          media: comment.media as CommentMedia[] | undefined,
        };
      });
      // Initialize like state for replies
      setCommentLikeState(prev => {
        const next = { ...prev };
        fetchedReplies.forEach(r => {
          if (!(String(r.id) in next)) {
            next[String(r.id)] = { likeCount: r.likeCount ?? 0, isLiked: r.isLikedByMe ?? false };
          }
        });
        return next;
      });
      setExpandedReplies(prev => ({
        ...prev,
        [parentCommentId]: reset ? fetchedReplies : [...(prev[parentCommentId] ?? []), ...fetchedReplies],
      }));
      setRepliesCursor(prev => ({ ...prev, [parentCommentId]: data.nextCursor ?? null }));
      setRepliesHasMore(prev => ({ ...prev, [parentCommentId]: data.hasMore ?? false }));
    } catch (error) {
      console.error("Error fetching replies:", error);
    } finally {
      setLoadingReplies(prev => ({ ...prev, [parentCommentId]: false }));
    }
  };

  const toggleReplies = async (commentId: string) => {
    if (expandedReplies[commentId]) {
      // Collapse
      setExpandedReplies(prev => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
    } else {
      await fetchReplies(commentId, true);
    }
  };

  const handleSaveCommentEdit = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    setSavingEdit(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/posts/comment/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: editingCommentText.trim() }),
      });
      if (!response.ok) throw new Error("Failed to edit comment");
      const now = new Date().toISOString();
      // Update locally — set content + updatedAt
      setComments(prev => prev.map(c =>
        String(c.id) === commentId ? { ...c, content: editingCommentText.trim(), updatedAt: now } : c
      ));
      // Also update inside expanded replies
      setExpandedReplies(prev => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          updated[key] = updated[key].map(r =>
            String(r.id) === commentId ? { ...r, content: editingCommentText.trim(), updatedAt: now } : r
          );
        }
        return updated;
      });
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (err) {
      console.error(err);
      alert("Failed to edit comment");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteComment = async (commentId: string, isReply: boolean, parentId?: string) => {
    setDeletingCommentId(commentId);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/posts/comment/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete comment");
      if (isReply && parentId) {
        // Remove from expanded replies
        setExpandedReplies(prev => ({
          ...prev,
          [parentId]: (prev[parentId] ?? []).filter(r => String(r.id) !== commentId),
        }));
        // Decrement replyCount on parent comment locally
        setComments(prev => prev.map(c =>
          String(c.id) === parentId ? { ...c, replyCount: Math.max((c.replyCount ?? 1) - 1, 0) } : c
        ));
      } else {
        setComments(prev => prev.filter(c => String(c.id) !== commentId));
      }
      // Decrement live comment count
      setLocalCommentCount(prev => Math.max(prev - 1, 0));
      setShowCommentDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete comment");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!activeUser) return;

    // Optimistic update
    setCommentLikeState(prev => {
      const current = prev[commentId] ?? { likeCount: 0, isLiked: false };
      return {
        ...prev,
        [commentId]: {
          likeCount: current.isLiked ? current.likeCount - 1 : current.likeCount + 1,
          isLiked: !current.isLiked,
        },
      };
    });

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/posts/comment/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ commentId }),
      });
      if (!response.ok) throw new Error("Failed to like comment");
      const result = await response.json();
      // Confirm with server value
      setCommentLikeState(prev => ({
        ...prev,
        [commentId]: { likeCount: result.likeCount, isLiked: result.liked },
      }));
    } catch (err) {
      console.error(err);
      // Revert optimistic update on error
      setCommentLikeState(prev => {
        const current = prev[commentId] ?? { likeCount: 0, isLiked: false };
        return {
          ...prev,
          [commentId]: {
            likeCount: current.isLiked ? current.likeCount - 1 : current.likeCount + 1,
            isLiked: !current.isLiked,
          },
        };
      });
    }
  };

  const handlePostComment = async () => {
    if (!activeUser) {
      alert("Please login to comment");
      return;
    }

    if (!commentText.trim() && commentMediaFiles.length === 0) {
      alert("Please write a comment or add media");
      return;
    }

    setPostingComment(true);
    try {
      const formData = new FormData();
      formData.append("postId", post.id.toString());
      formData.append("content", commentText.trim() || "");
      if (replyingTo) {
        formData.append("parentCommentId", replyingTo.id);
      }

      commentMediaFiles.forEach((file) => {
        formData.append("media", file);
      });

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/posts/comment`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { message?: string }).message || `Failed to post comment: ${response.status}`,
        );
      }

      setCommentText("");
      setCommentMediaFiles([]);
      setCommentMediaPreviews([]);

      // Increment live count
      setLocalCommentCount(prev => prev + 1);

      if (replyingTo) {
        // Refresh replies for the parent comment
        await fetchReplies(replyingTo.id, true);
        setReplyingTo(null);
      } else {
        // Refresh top-level comments
        await fetchComments(true);
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to post comment. Please try again.";
      alert(`Error: ${errorMessage}`);
    } finally {
      setPostingComment(false);
    }
  };

  const handleCommentClick = () => {
    setShowCommentPopup(true);
    fetchComments(true, commentSort);
  };

  const closeCommentPopup = () => {
    setShowCommentPopup(false);
    setCommentText("");
    setCommentMediaFiles([]);
    setCommentMediaPreviews([]);
    setReplyingTo(null);
    setExpandedReplies({});
  };

  const handleCommentMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      const imageMaxSize = 10 * 1024 * 1024; // 10MB
      const videoMaxSize = 100 * 1024 * 1024; // 100MB

      // Check total count
      const totalCount = commentMediaFiles.length + newFiles.length;
      if (totalCount > 10) {
        alert(
          `You can only upload up to 10 files per comment. Currently selected: ${commentMediaFiles.length}, trying to add: ${newFiles.length}`,
        );
        e.target.value = "";
        return;
      }

      const validFiles: File[] = [];
      const errors: string[] = [];

      newFiles.forEach((file) => {
        const isVideo = file.type.startsWith("video/");
        const maxSize = isVideo ? videoMaxSize : imageMaxSize;

        if (file.size <= maxSize) {
          validFiles.push(file);
        } else {
          errors.push(
            `${file.name} (File size exceeds ${isVideo ? "100MB" : "10MB"})`,
          );
        }
      });

      if (errors.length > 0) {
        alert("Cannot upload some files:\n\n" + errors.join("\n"));
      }

      if (validFiles.length > 0) {
        setCommentMediaFiles((prev) => [...prev, ...validFiles]);

        validFiles.forEach((file) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setCommentMediaPreviews((prev) => [
              ...prev,
              reader.result as string,
            ]);
          };
          reader.readAsDataURL(file);
        });
      }

      e.target.value = "";
    }
  };

  const removeCommentMedia = (index: number) => {
    setCommentMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setCommentMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeletePost = async () => {
    if (!activeUser) return;
    setDeletingPost(true);
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/posts/${post.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete post: ${response.status}`);
      }
      setShowDeleteConfirm(false);
      if (onPostDelete) {
        onPostDelete(post.id);
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post. Please try again.");
    } finally {
      setDeletingPost(false);
    }
  };

  // --- Edit Post Handlers ---
  const closeEditPostPopup = () => {
    setShowEditPostPopup(false);
    setEditPostMediaFiles([]);
    setEditPostMediaPreviews([]);
    setEditPostRemoveMediaIds([]);
  };

  const handleEditPostMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    const imageMaxSize = 10 * 1024 * 1024;
    const videoMaxSize = 100 * 1024 * 1024;
    const totalExisting = localPostMedia.filter(m => !editPostRemoveMediaIds.includes(String(m.id))).length;
    const totalNew = editPostMediaFiles.length;
    if (totalExisting + totalNew + newFiles.length > 20) {
      alert("จำนวนไฟล์สูงสุดคือ 20 ไฟล์ต่อโพสต์");
      e.target.value = "";
      return;
    }
    const validFiles: File[] = [];
    const errors: string[] = [];
    newFiles.forEach((file) => {
      const isVideo = file.type.startsWith("video/");
      if (file.size <= (isVideo ? videoMaxSize : imageMaxSize)) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name} (ขนาดเกิน ${isVideo ? "100MB" : "10MB"})`);
      }
    });
    if (errors.length > 0) alert("ไม่สามารถอัปโหลดไฟล์เหล่านี้:\n" + errors.join("\n"));
    if (validFiles.length > 0) {
      // Generate all previews first, then set state once to keep files/previews in sync
      const previews = await Promise.all(
        validFiles.map(file => {
          if (file.type.startsWith("video/")) {
            return Promise.resolve(URL.createObjectURL(file));
          }
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        })
      );
      setEditPostMediaFiles(prev => [...prev, ...validFiles]);
      setEditPostMediaPreviews(prev => [...prev, ...previews]);
    }
    e.target.value = "";
  };

  const handleEditPostDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingEdit(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    const fakeEvent = { target: { files: e.dataTransfer.files, value: "" } } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleEditPostMediaUpload(fakeEvent);
  };

  const handleSaveEditPost = async () => {
    if (!activeUser) return;
    setSavingEditPost(true);
    try {
      const formData = new FormData();
      formData.append("content", editPostContent.trim());
      editPostRemoveMediaIds.forEach(id => formData.append("removeMediaIds", id));
      editPostMediaFiles.forEach(file => formData.append("media", file));

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/posts/${post.id}`, {
        method: "PATCH",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || "Failed to edit post");
      }

      const updated = await response.json();
      setLocalPostContent(updated.content ?? "");
      setLocalPostMedia(updated.media ?? []);
      setShowEditPostPopup(false);
    } catch (error) {
      console.error("Error editing post:", error);
      alert("ไม่สามารถแก้ไขโพสต์ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSavingEditPost(false);
    }
  };

  // Handle scroll position for media arrows
  const handleMediaScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollLeft = target.scrollLeft;
    const scrollWidth = target.scrollWidth;
    const clientWidth = target.clientWidth;

    // Show left arrow if scrolled away from left edge
    setShowLeftArrow(scrollLeft > 10);

    // Show right arrow if not at right edge
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  return (
    <div className="bg-gray-50 rounded-2xl p-6 shadow relative">
      <div className="flex items-center gap-3 mb-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={apiService.getImageUrl(post.author?.avatarUrl) || "/default-avatar.svg"}
          alt="avatar"
          className="w-10 h-10 rounded-full object-cover"
        />
        <div>
          <div className="font-bold flex items-center gap-1">
            {post.author?.firstName || post.author?.lastName
              ? `${post.author.firstName || ""} ${post.author.lastName || ""}`.trim()
              : "Anonymous"}
            {post.author?.role === 'official_account' && <VerifiedBadge />}
          </div>
          <div className="text-xs text-gray-400">{post.category}</div>
          <div className="text-xs text-gray-400">
            {getTimeAgo(post.createdAt)}
          </div>
        </div>
      </div>

      {/* Post Content */}
      {localPostContent && (
        <div className="mb-3 text-gray-800 leading-relaxed whitespace-pre-wrap wrap-break-word overflow-wrap-anywhere">
          {renderTextWithLinks(localPostContent)}
        </div>
      )}

      {/* Link Preview Card */}
      {(linkPreview || loadingLinkPreview) && !localPostMedia?.length && (
        <div className="mb-3">
          {loadingLinkPreview ? (
            /* Skeleton */
            <div className="animate-pulse border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
              <div className="h-32 bg-gray-200 w-full" />
              <div className="px-4 py-3 flex items-start gap-2.5">
                <div className="w-4 h-4 bg-gray-200 rounded shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="h-2.5 bg-gray-200 rounded w-1/4" />
                  <div className="h-3.5 bg-gray-200 rounded w-3/5" />
                  <div className="h-2.5 bg-gray-200 rounded w-full" />
                </div>
              </div>
            </div>
          ) : linkPreview ? (
            <a
              href={linkPreview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all group no-underline"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Banner image */}
              {linkPreview.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={linkPreview.image}
                  alt=""
                  className="w-full max-h-52 object-cover bg-gray-100"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              {/* Info row */}
              <div className="px-4 py-3 flex items-start gap-2.5 bg-white">
                {/* Favicon */}
                {linkPreview.favicon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={linkPreview.favicon}
                    alt=""
                    className="w-4 h-4 rounded shrink-0 mt-[3px]"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  {linkPreview.siteName && (
                    <p className="text-[11px] text-gray-400 mb-0.5 truncate uppercase tracking-wide font-medium">
                      {linkPreview.siteName}
                    </p>
                  )}
                  {linkPreview.title && (
                    <p className="text-sm font-semibold text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
                      {linkPreview.title}
                    </p>
                  )}
                  {linkPreview.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {linkPreview.description}
                    </p>
                  )}
                </div>
              </div>
            </a>
          ) : null}
        </div>
      )}

      {/* Post Media - Threads-style Horizontal Layout */}
      {localPostMedia && localPostMedia.length > 0 && (
        <div className={`mb-3 ${localPostMedia.length <= 2 ? "" : "-mx-6"} relative group/media max-w-full`}>
          {/* Left Arrow Indicator - Show only when scrolled right and has multiple images */}
          {localPostMedia.length > 1 && showLeftArrow && (
            <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none opacity-30 group-hover/media:opacity-100 transition-opacity duration-300">
              <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                <svg 
                  className="w-5 h-5 text-gray-700" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2.5} 
                    d="M15 19l-7-7 7-7" 
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Right Arrow Indicator - Show only when can scroll right and has multiple images */}
          {localPostMedia.length > 1 && showRightArrow && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none opacity-30 group-hover/media:opacity-100 transition-opacity duration-300">
              <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                <svg 
                  className="w-5 h-5 text-gray-700" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2.5} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              </div>
            </div>
          )}

          <div
            className={`overflow-x-auto overflow-y-hidden scrollbar-hide ${localPostMedia.length <= 2 ? "" : "px-6"}`}
            onScroll={handleMediaScroll}
          >
            <div className={`flex items-center gap-2 ${localPostMedia.length === 1 ? "w-full" : "w-max min-w-full"} justify-center`}>
              {localPostMedia.map((media, index) => {
                const isSingleMedia = localPostMedia.length === 1;
                const isSingleImage =
                  isSingleMedia && media.mediaType === "image";

                // Compute index within image-only list (for lightbox)
                const imageOnlyIndex = localPostMedia.slice(0, index + 1).filter(m => m.mediaType === "image").length - 1;

                const getMediaWidth = () => {
                  if (isSingleImage) return "100%";
                  return "auto";
                };

                return (
                  <div
                    key={media.id}
                    className={`relative rounded-2xl overflow-hidden group shrink-0 ${
                      media.mediaType === "image" ? "cursor-pointer" : ""
                    }`}
                    style={{
                      width: getMediaWidth(),
                      maxWidth: isSingleImage ? "100%" : "none",
                    }}
                    onClick={() => {
                      if (media.mediaType === "image") {
                        setSelectedImageIndex(imageOnlyIndex);
                        setShowImageLightbox(true);
                      }
                    }}
                  >
                    {media.mediaType === "image" ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={apiService.getImageUrl(media.mediaUrl) || ""}
                          alt={`Post media ${index + 1}`}
                          className="transition-transform duration-300 group-hover:scale-[1.02] rounded-2xl"
                        style={{
                          width: isSingleMedia ? "100%" : "auto",
                          height: isSingleMedia ? "auto" : "350px",
                          maxHeight: isSingleMedia ? "600px" : "350px",
                          objectFit: "contain",
                        }}
                        loading="lazy"
                      />
                        {/* Hover overlay for images */}
                        <div className="absolute inset-0  bg-opacity-0 group-hover:bg-opacity-5 transition-all duration-300 flex items-center justify-center pointer-events-none">
                          <svg
                            className="w-12 h-12 text-white opacity-0 group-hover:opacity-80 transition-opacity duration-300 drop-shadow-lg"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                            />
                          </svg>
                        </div>
                      </>
                    ) : (
                      <video
                        src={apiService.getImageUrl(media.mediaUrl) || ""}
                        controls
                        preload="metadata"
                        className="rounded-2xl"
                        style={{
                          width: "auto",
                          height: isSingleMedia ? "auto" : "350px",
                          maxHeight: isSingleMedia ? "600px" : "350px",
                          maxWidth: isSingleMedia ? "100%" : "none",
                          objectFit: "contain",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Post actions */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex gap-4 text-gray-600 text-sm items-center">
          {/* Like Button */}
          <button
            onClick={handleLikePost}
            className="flex items-center gap-1.5 cursor-pointer hover:text-gray-800 transition-colors group"
          >
            <div className="con-like relative w-5 h-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-5 h-5 text-red-500 transition-all ${isLiked ? "hidden" : "block"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-5 h-5 text-red-500 transition-all ${isLiked ? "block animate-[heartBeat_0.5s_ease-in-out]" : "hidden"}`}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            </div>
            <span className="group-hover:text-gray-800">Like</span>
            {post.likeCount > 0 && (
              <span className="text-xs text-gray-500">({post.likeCount})</span>
            )}
          </button>

          {/* Comment Button */}
          <button
            onClick={handleCommentClick}
            className="flex items-center gap-1.5 cursor-pointer hover:text-gray-800 transition-colors"
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span>Comment</span>
            {localCommentCount > 0 && (
              <span className="text-xs text-gray-500">
                ({localCommentCount})
              </span>
            )}
          </button>

          {/* Repost Button */}
          <button
            onClick={handleRepostPost}
            className="flex items-center gap-1.5 cursor-pointer hover:text-gray-800 transition-colors group"
          >
            <div className="relative w-5 h-5">
              <svg
                className={`w-5 h-5 transition-colors ${isReposted ? "text-green-600" : "text-gray-600"}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17 2l4 4-4 4" />
                <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                <path d="M7 22l-4-4 4-4" />
                <path d="M21 13v1a4 4 0 0 1-4 4H3" />
              </svg>
            </div>
            <span className="group-hover:text-gray-800">Repost</span>
            {post.repostCount > 0 && (
              <span className="text-xs text-gray-500">
                ({post.repostCount})
              </span>
            )}
          </button>
        </div>

        {/* Right side: Save */}
        <div className="flex items-center gap-2">
          {/* Save Post Button */}
          <label
            htmlFor={`bookmark-${post.id}`}
            className={`bookmark cursor-pointer w-[35px] h-[35px] flex items-center justify-center rounded-lg transition-colors ${isSaved ? "bg-teal-700" : "bg-teal-600 hover:bg-teal-700"}`}
            onClick={async (e) => {
              e.preventDefault();
              await handleSavePost();
            }}
          >
            <svg
              width={13}
              viewBox="0 0 50 70"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="svgIcon"
            >
              <path
                d="M46 62.0085L46 3.88139L3.99609 3.88139L3.99609 62.0085L24.5 45.5L46 62.0085Z"
                stroke="white"
                strokeWidth={7}
                className={`transition-all duration-500 ${isSaved ? "fill-white" : "fill-transparent"}`}
                style={{
                  strokeDasharray: "200 0",
                  strokeDashoffset: 0,
                }}
              />
            </svg>
          </label>
        </div>
      </div>

      {/* Add to Calendar Confirm Popup */}
      {showCalendarConfirmPopup && calendarEventPreview && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCalendarConfirmPopup(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-gray-800">เพิ่ม Event ใน Calendar</h2>
              </div>
              <button onClick={() => setShowCalendarConfirmPopup(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Event Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 mb-5">
              {/* Title */}
              <div className="flex items-start gap-2 min-w-0">
                <span className="mt-0.5 w-2 h-2 rounded-full bg-slate-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 font-medium mb-0.5">ชื่อ Event</p>
                  <p className="text-sm font-semibold text-gray-800 wrap-break-word line-clamp-3">{calendarEventPreview.eventTitle}</p>
                </div>
              </div>
              {/* Date & Time */}
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-0.5">วันและเวลา</p>
                  <p className="text-sm text-gray-700">
                    {new Date(calendarEventPreview.eventStartTime).toLocaleDateString("th-TH", {
                      timeZone: "Asia/Bangkok",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "long",
                    })}
                  </p>
                  <p className="text-sm font-medium text-gray-800">
                    {new Date(calendarEventPreview.eventStartTime).toLocaleTimeString("th-TH", {
                      timeZone: "Asia/Bangkok",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })} น.
                  </p>
                </div>
              </div>
              {/* Description */}
              {calendarEventPreview.eventDescription && (
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-0.5">รายละเอียด</p>
                    <p className="text-sm text-gray-600 line-clamp-2">{calendarEventPreview.eventDescription}</p>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400 mb-4 text-center">Event นี้จะถูกเพิ่มเข้า Calendar ของคุณ</p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCalendarConfirmPopup(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddToCalendar}
                disabled={addingToCalendar}
                className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  addingToCalendar
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-slate-600 hover:bg-slate-700 shadow-md hover:shadow-lg"
                }`}
              >
                {addingToCalendar ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    กำลังเพิ่ม...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    เพิ่มใน Calendar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Popup */}
      {showCommentPopup && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeCommentPopup}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeCommentPopup}
              className="absolute -top-3 -right-3 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shadow-lg"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">
                  Comments
                  {localCommentCount > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-400">({localCommentCount})</span>
                  )}
                </h2>
                {/* Sort Toggle Button */}
                <button
                  onClick={() => {
                    const newSort = commentSort === "newest" ? "top" : "newest";
                    setCommentSort(newSort);
                    fetchComments(true, newSort);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 hover:shadow-sm"
                  style={commentSort === "top"
                    ? { background: "linear-gradient(135deg, #fef3c7, #fde68a)", borderColor: "#f59e0b", color: "#92400e" }
                    : { background: "#f8fafc", borderColor: "#e2e8f0", color: "#64748b" }
                  }
                  title={commentSort === "newest" ? "เรียงตามยอดไลก์สูงสุด" : "เรียงจากใหม่ → เก่า"}
                >
                  {commentSort === "newest" ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                      ใหม่ → เก่า
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                      </svg>
                      ยอดไลก์มากสุด
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Comments List — scrollable with styled scrollbar */}
            <div
              ref={commentsListRef}
              className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300"
            >
              {loadingComments ? (
                <div className="animate-pulse flex flex-col gap-4">
                  {[...Array(3)].map((_, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                      <div className="flex-1 bg-gray-100 rounded-2xl h-16" />
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-sm">No comments yet. Be the first!</p>
                </div>
              ) : (
                <>
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 group/comment">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={apiService.getImageUrl(comment.author?.avatarUrl) || "/default-avatar.svg"}
                        alt="avatar"
                        className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="bg-gray-50 rounded-2xl px-4 py-3 relative">
                          <p className="text-sm font-semibold text-gray-800 pr-7 flex items-center gap-1 flex-wrap">
                            <span>{comment.author?.firstName} {comment.author?.lastName}</span>
                            {comment.author?.role === 'official_account' && <VerifiedBadge className="w-3.5 h-3.5" />}
                            {comment.updatedAt && (new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 5000) && (
                              <span className="ml-1.5 text-xs font-normal text-gray-400">(edited)</span>
                            )}
                          </p>

                          {/* Inline Edit Mode */}
                          {editingCommentId === String(comment.id) ? (
                            <div className="mt-1">
                              <textarea
                                value={editingCommentText}
                                onChange={e => setEditingCommentText(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-white border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm resize-none"
                                rows={2}
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveCommentEdit(String(comment.id)); }
                                  if (e.key === "Escape") { setEditingCommentId(null); setEditingCommentText(""); }
                                }}
                              />
                              <div className="flex gap-2 mt-1.5 justify-end">
                                <button onClick={() => { setEditingCommentId(null); setEditingCommentText(""); }} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">Cancel</button>
                                <button onClick={() => handleSaveCommentEdit(String(comment.id))} disabled={savingEdit || !editingCommentText.trim()} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors">{savingEdit ? "Saving…" : "Save"}</button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-700 mt-0.5 wrap-break-word whitespace-pre-wrap">{comment.content}</p>
                          )}

                          {/* Comment Media — Post-style Slideshow */}
                          {comment.media && comment.media.length > 0 && (
                            <div className="mt-2 relative group/cmedia">
                              {/* Left scroll arrow */}
                              {comment.media.length > 1 && commentMediaScrollState[String(comment.id)]?.left && (
                                <div className="absolute left-1 top-1/2 -translate-y-1/2 z-10 pointer-events-none opacity-40 group-hover/cmedia:opacity-100 transition-opacity duration-300">
                                  <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-md">
                                    <svg className="w-3.5 h-3.5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                              {/* Right scroll arrow */}
                              {comment.media.length > 1 && commentMediaScrollState[String(comment.id)]?.right !== false && (
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10 pointer-events-none opacity-40 group-hover/cmedia:opacity-100 transition-opacity duration-300">
                                  <div className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-md">
                                    <svg className="w-3.5 h-3.5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                              <div
                                className="overflow-x-auto overflow-y-hidden scrollbar-hide"
                                onScroll={(e) => {
                                  const t = e.currentTarget;
                                  setCommentMediaScrollState(prev => ({
                                    ...prev,
                                    [String(comment.id)]: {
                                      left: t.scrollLeft > 10,
                                      right: t.scrollLeft < t.scrollWidth - t.clientWidth - 10,
                                    },
                                  }));
                                }}
                              >
                                <div className={`flex items-center gap-2 ${comment.media!.length === 1 ? "w-full" : "w-max min-w-full"} justify-center`}>
                                  {comment.media.map((m, mi) => {
                                    const isSingle = comment.media!.length === 1;
                                    const isSingleImage = isSingle && m.mediaType === "image";
                                    // Compute index within image-only list (for lightbox)
                                    const imageIndex = comment.media!.slice(0, mi + 1).filter(x => x.mediaType === "image").length - 1;
                                    return (
                                      <div
                                        key={m.id}
                                        className={`relative rounded-xl overflow-hidden group/citem shrink-0 bg-gray-100 ${m.mediaType === "image" ? "cursor-pointer" : ""}`}
                                        style={{ width: isSingleImage ? "100%" : "auto", maxWidth: isSingleImage ? "100%" : "none" }}
                                        onClick={() => { if (m.mediaType === "image") setCommentLightbox({ media: comment.media!, index: imageIndex }); }}
                                      >
                                        {m.mediaType === "image" ? (
                                          <>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={apiService.getImageUrl(m.mediaUrl) || ""}
                                              alt={`Comment media ${mi + 1}`}
                                              className="transition-transform duration-300 group-hover/citem:scale-[1.02] rounded-xl"
                                              style={{
                                                width: isSingle ? "100%" : "auto",
                                                height: isSingle ? "auto" : "220px",
                                                maxHeight: isSingle ? "400px" : "220px",
                                                objectFit: "contain",
                                              }}
                                              loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-opacity-0 group-hover/citem:bg-opacity-5 transition-all duration-300 pointer-events-none" />
                                          </>
                                        ) : (
                                          <video
                                            src={apiService.getImageUrl(m.mediaUrl) || ""}
                                            controls
                                            preload="metadata"
                                            className="rounded-xl"
                                            style={{
                                              width: "auto",
                                              height: isSingle ? "auto" : "220px",
                                              maxHeight: isSingle ? "400px" : "220px",
                                              maxWidth: isSingle ? "100%" : "none",
                                              objectFit: "contain",
                                            }}
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Kebab menu button */}
                          <div className="absolute top-2.5 right-2.5">
                            <button
                              onClick={() => setCommentMenuOpen(commentMenuOpen === String(comment.id) ? null : String(comment.id))}
                              className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                              </svg>
                            </button>
                            {commentMenuOpen === String(comment.id) && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setCommentMenuOpen(null)} />
                                <div className="absolute right-0 top-7 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                                  {activeUser && activeUser.id === comment.userId && (
                                    <>
                                      <button
                                        onClick={() => { setEditingCommentId(String(comment.id)); setEditingCommentText(comment.content); setCommentMenuOpen(null); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                      >
                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => { setShowCommentDeleteConfirm(String(comment.id)); setCommentMenuOpen(null); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Delete
                                      </button>
                                      <div className="border-t border-gray-100 my-1" />
                                    </>
                                  )}
                                  <button
                                    onClick={() => { setShowCommentReportPopup(String(comment.id)); setCommentMenuOpen(null); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    Report
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Meta row: time + like + reply + expand button */}
                        <div className="flex items-center gap-3 mt-1 ml-1">
                          <span className="text-xs text-gray-400">{getTimeAgo(comment.createdAt)}</span>
                          {/* Like button for comment */}
                          <button
                            onClick={() => handleLikeComment(String(comment.id))}
                            disabled={!activeUser}
                            className={`flex items-center gap-1 text-xs font-medium transition-colors disabled:opacity-40 ${
                              (commentLikeState[String(comment.id)]?.isLiked)
                                ? "text-red-500 hover:text-red-600"
                                : "text-gray-400 hover:text-red-500"
                            }`}
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill={(commentLikeState[String(comment.id)]?.isLiked) ? "currentColor" : "none"}
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            {(commentLikeState[String(comment.id)]?.likeCount ?? 0) > 0 && (
                              <span>{commentLikeState[String(comment.id)]?.likeCount}</span>
                            )}
                          </button>
                          {activeUser && (
                            <button
                              onClick={() => setReplyingTo({ id: String(comment.id), name: `${comment.author?.firstName ?? ""} ${comment.author?.lastName ?? ""}`.trim() })}
                              className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
                            >
                              Reply
                            </button>
                          )}
                          {(comment.replyCount ?? 0) > 0 && (
                            <button
                              onClick={() => toggleReplies(String(comment.id))}
                              className="text-xs text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
                            >
                              <svg className={`w-3 h-3 transition-transform ${expandedReplies[String(comment.id)] ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                              </svg>
                              {expandedReplies[String(comment.id)] ? "Hide" : `${comment.replyCount} repl${(comment.replyCount ?? 0) === 1 ? "y" : "ies"}`}
                            </button>
                          )}
                        </div>

                        {/* Expanded Replies */}
                        {expandedReplies[String(comment.id)] && (
                          <div className="mt-2 ml-4 space-y-3 border-l-2 border-gray-100 pl-3">
                            {loadingReplies[String(comment.id)] && (
                              <div className="animate-pulse flex gap-2">
                                <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />
                                <div className="flex-1 bg-gray-100 rounded-xl h-12" />
                              </div>
                            )}
                            {expandedReplies[String(comment.id)].map((reply) => (
                              <div key={reply.id} className="flex gap-2 group/reply">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={apiService.getImageUrl(reply.author?.avatarUrl) || "/default-avatar.svg"}
                                  alt="avatar"
                                  className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="bg-gray-50 rounded-xl px-3 py-2 relative">
                                    <p className="text-xs font-semibold text-gray-800 pr-6 flex items-center gap-1 flex-wrap">
                                      <span>{reply.author?.firstName} {reply.author?.lastName}</span>
                                      {reply.author?.role === 'official_account' && <VerifiedBadge className="w-3 h-3" />}
                                      {reply.updatedAt && (new Date(reply.updatedAt).getTime() - new Date(reply.createdAt).getTime() > 5000) && (
                                        <span className="ml-1 text-[10px] font-normal text-gray-400">(edited)</span>
                                      )}
                                    </p>
                                    {/* Inline edit for reply */}
                                    {editingCommentId === String(reply.id) ? (
                                      <div className="mt-1">
                                        <textarea
                                          value={editingCommentText}
                                          onChange={e => setEditingCommentText(e.target.value)}
                                          className="w-full px-2 py-1.5 rounded-lg bg-white border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-xs resize-none"
                                          rows={2}
                                          autoFocus
                                          onKeyDown={e => {
                                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveCommentEdit(String(reply.id)); }
                                            if (e.key === "Escape") { setEditingCommentId(null); setEditingCommentText(""); }
                                          }}
                                        />
                                        <div className="flex gap-1.5 mt-1 justify-end">
                                          <button onClick={() => { setEditingCommentId(null); setEditingCommentText(""); }} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5">Cancel</button>
                                          <button onClick={() => handleSaveCommentEdit(String(reply.id))} disabled={savingEdit || !editingCommentText.trim()} className="text-xs bg-blue-600 text-white px-2.5 py-0.5 rounded-full hover:bg-blue-700 disabled:opacity-50">{savingEdit ? "…" : "Save"}</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-700 mt-0.5 wrap-break-word whitespace-pre-wrap">{reply.content}</p>
                                    )}
                                    {/* Reply Media — Post-style Slideshow */}
                                    {reply.media && reply.media.length > 0 && (
                                      <div className="mt-1.5 relative group/rmedia">
                                        {/* Left scroll arrow */}
                                        {reply.media.length > 1 && commentMediaScrollState[`reply-${String(reply.id)}`]?.left && (
                                          <div className="absolute left-0.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none opacity-40 group-hover/rmedia:opacity-100 transition-opacity duration-300">
                                            <div className="bg-white/90 backdrop-blur-sm rounded-full p-1 shadow-md">
                                              <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                              </svg>
                                            </div>
                                          </div>
                                        )}
                                        {/* Right scroll arrow */}
                                        {reply.media.length > 1 && commentMediaScrollState[`reply-${String(reply.id)}`]?.right !== false && (
                                          <div className="absolute right-0.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none opacity-40 group-hover/rmedia:opacity-100 transition-opacity duration-300">
                                            <div className="bg-white/90 backdrop-blur-sm rounded-full p-1 shadow-md">
                                              <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                              </svg>
                                            </div>
                                          </div>
                                        )}
                                        <div
                                          className="overflow-x-auto overflow-y-hidden scrollbar-hide"
                                          onScroll={(e) => {
                                            const t = e.currentTarget;
                                            setCommentMediaScrollState(prev => ({
                                              ...prev,
                                              [`reply-${String(reply.id)}`]: {
                                                left: t.scrollLeft > 10,
                                                right: t.scrollLeft < t.scrollWidth - t.clientWidth - 10,
                                              },
                                            }));
                                          }}
                                        >
                                          <div className={`flex items-center gap-1.5 ${reply.media!.length === 1 ? "w-full" : "w-max min-w-full"} justify-center`}>
                                            {reply.media.map((m, mi) => {
                                              const isSingle = reply.media!.length === 1;
                                              const isSingleImage = isSingle && m.mediaType === "image";
                                              // Compute index within image-only list (for lightbox)
                                              const imageIndex = reply.media!.slice(0, mi + 1).filter(x => x.mediaType === "image").length - 1;
                                              return (
                                                <div
                                                  key={m.id}
                                                  className={`relative rounded-lg overflow-hidden group/ritem shrink-0 bg-gray-100 ${m.mediaType === "image" ? "cursor-pointer" : ""}`}
                                                  style={{ width: isSingleImage ? "100%" : "auto", maxWidth: isSingleImage ? "100%" : "none" }}
                                                  onClick={() => { if (m.mediaType === "image") setCommentLightbox({ media: reply.media!, index: imageIndex }); }}
                                                >
                                                  {m.mediaType === "image" ? (
                                                    <>
                                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                                      <img
                                                        src={apiService.getImageUrl(m.mediaUrl) || ""}
                                                        alt={`Reply media ${mi + 1}`}
                                                        className="transition-transform duration-300 group-hover/ritem:scale-[1.02] rounded-lg"
                                                        style={{
                                                          width: isSingle ? "100%" : "auto",
                                                          height: isSingle ? "auto" : "160px",
                                                          maxHeight: isSingle ? "300px" : "160px",
                                                          objectFit: "contain",
                                                        }}
                                                        loading="lazy"
                                                      />
                                                      <div className="absolute inset-0 bg-opacity-0 group-hover/ritem:bg-opacity-5 transition-all duration-300 pointer-events-none" />
                                                    </>
                                                  ) : (
                                                    <video
                                                      src={apiService.getImageUrl(m.mediaUrl) || ""}
                                                      controls
                                                      preload="metadata"
                                                      className="rounded-lg"
                                                      style={{
                                                        width: "auto",
                                                        height: isSingle ? "auto" : "160px",
                                                        maxHeight: isSingle ? "300px" : "160px",
                                                        maxWidth: isSingle ? "100%" : "none",
                                                        objectFit: "contain",
                                                      }}
                                                    />
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {/* Kebab menu for reply */}
                                    <div className="absolute top-1.5 right-1.5">
                                      <button
                                        onClick={() => setCommentMenuOpen(commentMenuOpen === String(reply.id) ? null : String(reply.id))}
                                        className="w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                                      >
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                                        </svg>
                                      </button>
                                      {commentMenuOpen === String(reply.id) && (
                                        <>
                                          <div className="fixed inset-0 z-40" onClick={() => setCommentMenuOpen(null)} />
                                          <div className="absolute right-0 top-6 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50">
                                            {activeUser && activeUser.id === reply.userId && (
                                              <>
                                                <button
                                                  onClick={() => { setEditingCommentId(String(reply.id)); setEditingCommentText(reply.content); setCommentMenuOpen(null); }}
                                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                >
                                                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                  Edit
                                                </button>
                                                <button
                                                  onClick={() => { setShowCommentDeleteConfirm(`reply:${String(reply.id)}:${String(comment.id)}`); setCommentMenuOpen(null); }}
                                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                  Delete
                                                </button>
                                                <div className="border-t border-gray-100 my-1" />
                                              </>
                                            )}
                                            <button
                                              onClick={() => { setShowCommentReportPopup(String(reply.id)); setCommentMenuOpen(null); }}
                                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                              Report
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 ml-1">
                                    <span className="text-xs text-gray-400">{getTimeAgo(reply.createdAt)}</span>
                                    {/* Like button for reply */}
                                    <button
                                      onClick={() => handleLikeComment(String(reply.id))}
                                      disabled={!activeUser}
                                      className={`flex items-center gap-1 text-xs font-medium transition-colors disabled:opacity-40 ${
                                        (commentLikeState[String(reply.id)]?.isLiked)
                                          ? "text-red-500 hover:text-red-600"
                                          : "text-gray-400 hover:text-red-500"
                                      }`}
                                    >
                                      <svg
                                        className="w-3 h-3"
                                        fill={(commentLikeState[String(reply.id)]?.isLiked) ? "currentColor" : "none"}
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                      </svg>
                                      {(commentLikeState[String(reply.id)]?.likeCount ?? 0) > 0 && (
                                        <span>{commentLikeState[String(reply.id)]?.likeCount}</span>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {repliesHasMore[String(comment.id)] && (
                              <button
                                onClick={() => fetchReplies(String(comment.id), false)}
                                disabled={loadingReplies[String(comment.id)]}
                                className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 ml-1 font-medium transition-colors disabled:opacity-50 mt-1"
                              >
                                {loadingReplies[String(comment.id)] ? (
                                  <svg className="animate-spin w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                  </svg>
                                )}
                                {loadingReplies[String(comment.id)] ? "Loading…" : "Load more replies"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Load more top-level comments */}
                  {hasMoreComments && (
                    <div className="flex justify-center pt-2">
                      <button
                        onClick={() => fetchComments(false)}
                        disabled={loadingMore}
                        className="px-5 py-2 rounded-full text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {loadingMore ? (
                          <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : null}
                        {loadingMore ? "Loading…" : "Load more comments"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Comment Input */}
            <div className="px-6 py-4 border-t border-gray-100 shrink-0">
              {/* Reply banner */}
              {replyingTo && (
                <div className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2 mb-3">
                  <span className="text-xs text-blue-600 font-medium">Replying to <span className="font-bold">{replyingTo.name}</span></span>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="text-blue-400 hover:text-blue-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              <div className="flex flex-col gap-3">
                {/* Avatar + Text Input Row */}
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={apiService.getImageUrl(activeUser?.avatarUrl) || "/default-avatar.svg"}
                    alt="avatar"
                    className="w-10 h-10 rounded-full object-cover shrink-0 mt-1"
                  />
                  <div className="flex-1">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={replyingTo ? `Reply to ${replyingTo.name}…` : "Write a comment…"}
                      rows={1}
                      className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 text-gray-800 placeholder-gray-400 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white text-sm transition-all resize-none overflow-hidden"
                      style={{ minHeight: "40px", maxHeight: "120px" }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height = Math.min(target.scrollHeight, 120) + "px";
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handlePostComment();
                        }
                      }}
                      disabled={postingComment}
                    />
                  </div>
                </div>

                {/* Media Preview */}
                {commentMediaPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 ml-13">
                    {commentMediaPreviews.map((preview, idx) => (
                      <div key={idx} className="relative">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                          {commentMediaFiles[idx]?.type.startsWith("video/") ? (
                            <video src={preview} className="w-full h-full object-cover" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={preview} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <button
                          onClick={() => removeCommentMedia(idx)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="flex items-center justify-between ml-13">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-100 transition-all cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpg,image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,video/x-flv,video/x-ms-wmv,.mp4,.mov,.avi,.mkv,.webm,.flv,.wmv,.m4v,.3gp"
                        multiple
                        onChange={handleCommentMediaUpload}
                        className="hidden"
                        disabled={postingComment}
                      />
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-medium">Photo/Video</span>
                      {commentMediaFiles.length > 0 && (
                        <span className="text-xs font-bold text-blue-600">({commentMediaFiles.length}/10)</span>
                      )}
                    </label>
                  </div>

                  <button
                    className="px-6 py-2 rounded-full font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg hover:scale-105"
                    onClick={handlePostComment}
                    disabled={postingComment || (!commentText.trim() && commentMediaFiles.length === 0)}
                  >
                    {postingComment ? (
                      <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      replyingTo ? "Reply" : "Post"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Three-dot Menu Button */}
      <div className="absolute top-6 right-6 flex items-center gap-2" style={{ zIndex: 30 }}>
        {/* Add to Calendar — only for Events posts */}
        {post.category === "Events" && (
          <button
            onClick={handleOpenCalendarConfirm}
            disabled={addedToCalendar || addingToCalendar || fetchingEventPreview}
            title={addedToCalendar ? "เพิ่มใน Calendar แล้ว" : "เพิ่ม Event นี้ใน Calendar"}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              addedToCalendar
                ? "bg-green-50 text-green-600 border-green-300 cursor-default"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
            }`}
          >
            {fetchingEventPreview || addingToCalendar ? (
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : addedToCalendar ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Added!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Add to Calendar
              </>
            )}
          </button>
        )}
        <button
          ref={menuButtonRef}
          onClick={() => {
            if (!showPostMenu && menuButtonRef.current) {
              const rect = menuButtonRef.current.getBoundingClientRect();
              setMenuPosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
            }
            setShowPostMenu(!showPostMenu);
          }}
          className="text-gray-400 text-2xl hover:text-gray-600 transition-colors"
        >
          ⋮
        </button>

        {/* Dropdown Menu */}
        {showPostMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowPostMenu(false)}
            />
            <div
              className="fixed w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50"
              style={{ top: menuPosition.top, right: menuPosition.right }}
            >
              {/* Delete Post — only visible to the post owner */}
              {activeUser && activeUser.id === post.userId && (
                <button
                  onClick={() => {
                    setShowEditPostPopup(true);
                    setEditPostContent(localPostContent ?? "");
                    setEditPostMediaFiles([]);
                    setEditPostMediaPreviews([]);
                    setEditPostRemoveMediaIds([]);
                    setShowPostMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-blue-50 text-blue-600 flex items-center gap-2"
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit Post
                </button>
              )}
              {/* Delete Post — only visible to the post owner */}
              {activeUser && activeUser.id === post.userId && (
                <button
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setShowPostMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete Post
                </button>
              )}
              <button
                onClick={() => {
                  setShowReportPopup(true);
                  setShowPostMenu(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-red-600 flex items-center gap-2"
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                Report Post
              </button>
            </div>
          </>
        )}
      </div>

      {/* Edit Post Popup */}
      {showEditPostPopup && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeEditPostPopup}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-800">แก้ไขโพสต์</h2>
              <button
                onClick={closeEditPostPopup}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
              {/* Text area */}
              <div className="relative">
                <textarea
                  value={editPostContent}
                  onChange={(e) => setEditPostContent(e.target.value.slice(0, POST_CONTENT_MAX_LENGTH))}
                  placeholder="What's on your mind?"
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-800 resize-none text-sm"
                />
                <div className={`absolute bottom-2 right-3 text-xs select-none pointer-events-none ${
                  editPostContent.length >= POST_CONTENT_MAX_LENGTH
                    ? "text-red-500 font-semibold"
                    : editPostContent.length >= POST_CONTENT_MAX_LENGTH * 0.85
                    ? "text-amber-500"
                    : "text-gray-400"
                }`}>
                  {editPostContent.length}/{POST_CONTENT_MAX_LENGTH}
                </div>
              </div>

              {/* Existing media with remove option */}
              {localPostMedia.filter(m => !editPostRemoveMediaIds.includes(String(m.id))).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">รูปภาพ/วิดีโอปัจจุบัน</p>
                  <div className="flex flex-wrap gap-4 pt-2 pl-2">
                    {localPostMedia
                      .filter(m => !editPostRemoveMediaIds.includes(String(m.id)))
                      .map((m) => (
                        <div key={m.id} className="relative group/thumb">
                          <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
                          {m.mediaType === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={apiService.getImageUrl(m.mediaUrl) || ""}
                              alt="existing media"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              src={apiService.getImageUrl(m.mediaUrl) || ""}
                              className="w-full h-full object-cover"
                              preload="metadata"
                            />
                          )}
                          </div>
                          <button
                            onClick={() => setEditPostRemoveMediaIds(prev => [...prev, String(m.id)])}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors z-10 shadow"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* New media previews */}
              {editPostMediaPreviews.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">ไฟล์ใหม่ที่จะเพิ่ม</p>
                  <div className="flex flex-wrap gap-4 pt-2 pl-2">
                    {editPostMediaPreviews.map((preview, idx) => (
                      <div key={idx} className="relative group/newthumb">
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
                        {editPostMediaFiles[idx]?.type.startsWith("video/") ? (
                          <video src={preview} className="w-full h-full object-cover" preload="metadata" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={preview} alt="new media" className="w-full h-full object-cover" />
                        )}
                        </div>
                        <button
                          onClick={() => {
                            // Revoke object URL for videos to free memory
                            if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
                            setEditPostMediaFiles(prev => prev.filter((_, i) => i !== idx));
                            setEditPostMediaPreviews(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors z-10 shadow"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload area */}
              <div
                onDrop={handleEditPostDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingEdit(true); }}
                onDragLeave={() => setIsDraggingEdit(false)}
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                  isDraggingEdit
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">ลากไฟล์มาวาง หรือ</p>
                    <label className="cursor-pointer inline-block">
                      <input
                        type="file"
                        accept="image/jpg,image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,video/x-flv,video/x-ms-wmv,.mp4,.mov,.avi,.mkv,.webm,.flv,.wmv,.m4v,.3gp"
                        multiple
                        onChange={handleEditPostMediaUpload}
                        className="hidden"
                      />
                      <span className="px-4 py-2 bg-gray-600 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors">
                        เลือกไฟล์
                      </span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-400">รูปภาพ: สูงสุด 10MB · วิดีโอ: สูงสุด 100MB</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
              <button
                onClick={closeEditPostPopup}
                disabled={savingEditPost}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveEditPost}
                disabled={savingEditPost || (!editPostContent.trim() && localPostMedia.filter(m => !editPostRemoveMediaIds.includes(String(m.id))).length === 0 && editPostMediaFiles.length === 0)}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingEditPost ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    กำลังบันทึก...
                  </>
                ) : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !deletingPost && setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>

            {/* Text */}
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-800">Delete Post?</h2>
              <p className="text-sm text-gray-500 mt-1">
                This action cannot be undone. The post and all its media will be permanently removed.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 w-full mt-1">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingPost}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePost}
                disabled={deletingPost}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingPost ? (
                  <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : null}
                {deletingPost ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Popup */}
      {showReportPopup && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowReportPopup(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => {
                setShowReportPopup(false);
                setReportText("");
                setReportMood(null);
              }}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

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
                😊
              </button>

              <button
                onClick={() => setReportMood("sad")}
                className={`flex items-center justify-center bg-slate-100 p-3 ring-2 ring-slate-200 duration-300 focus:ring-slate-400 rounded-md ${reportMood === "sad" ? "ring-slate-400" : ""}`}
              >
                😢
              </button>

              <div className="flex-1" />

              <button
                onClick={() => {
                  console.log("Submit report:", {
                    text: reportText,
                    mood: reportMood,
                  });
                  setShowReportPopup(false);
                  setReportText("");
                  setReportMood(null);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Delete Confirmation Popup */}
      {showCommentDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-60 flex items-center justify-center p-4"
          onClick={() => !deletingCommentId && setShowCommentDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            {/* Text */}
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-800">Delete Comment?</h2>
              <p className="text-sm text-gray-500 mt-1">
                This action cannot be undone. The comment will be permanently removed.
              </p>
            </div>
            {/* Buttons */}
            <div className="flex gap-3 w-full mt-1">
              <button
                onClick={() => setShowCommentDeleteConfirm(null)}
                disabled={!!deletingCommentId}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // parse "reply:commentId:parentId" or just "commentId"
                  const parts = showCommentDeleteConfirm.split(":");
                  if (parts[0] === "reply") {
                    handleDeleteComment(parts[1], true, parts[2]);
                  } else {
                    handleDeleteComment(showCommentDeleteConfirm, false);
                  }
                }}
                disabled={!!deletingCommentId}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingCommentId ? (
                  <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : null}
                {deletingCommentId ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Report Popup */}
      {showCommentReportPopup && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-60 flex items-center justify-center p-4"
          onClick={() => { setShowCommentReportPopup(null); setCommentReportText(""); }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => { setShowCommentReportPopup(null); setCommentReportText(""); }}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h1 className="text-2xl font-bold capitalize text-slate-400 mb-4">Report Comment</h1>

            <textarea
              value={commentReportText}
              onChange={(e) => setCommentReportText(e.target.value)}
              className="w-full min-h-28 resize-none bg-slate-100 p-3 outline-none ring-2 ring-slate-200 duration-300 placeholder:text-slate-400 focus:ring-slate-400 rounded-md text-slate-600 mb-3"
              placeholder="Why are you reporting this comment?"
            />

            <div className="flex gap-3">
              <div className="flex-1" />
              <button
                onClick={() => {
                  console.log("Submit comment report:", { commentId: showCommentReportPopup, text: commentReportText });
                  setShowCommentReportPopup(null);
                  setCommentReportText("");
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment / Reply Media Lightbox */}
      {commentLightbox && (() => {
        const imageList = commentLightbox.media.filter(m => m.mediaType === "image");
        const total = imageList.length;
        const cur = commentLightbox.index;
        return (
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-sm z-70 flex items-center justify-center p-4"
            onClick={() => setCommentLightbox(null)}
          >
            {/* Close */}
            <button
              onClick={() => setCommentLightbox(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Counter */}
            {total > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/50 text-white text-sm font-medium">
                {cur + 1} / {total}
              </div>
            )}
            {/* Prev */}
            {cur > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setCommentLightbox(prev => prev && ({ ...prev, index: prev.index - 1 })); }}
                className="absolute left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {/* Next */}
            {cur < total - 1 && (
              <button
                onClick={e => { e.stopPropagation(); setCommentLightbox(prev => prev && ({ ...prev, index: prev.index + 1 })); }}
                className="absolute right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
            {/* Image */}
            <div className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={apiService.getImageUrl(imageList[cur]?.mediaUrl) || ""}
                alt={`media ${cur + 1}`}
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl select-none"
                draggable={false}
              />
            </div>
            {/* Thumbnails */}
            {total > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2" onClick={e => e.stopPropagation()}>
                {imageList.map((m, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={m.id}
                    src={apiService.getImageUrl(m.mediaUrl) || ""}
                    alt={`thumb ${i + 1}`}
                    onClick={() => setCommentLightbox(prev => prev && ({ ...prev, index: i }))}
                    className={`w-12 h-12 object-cover rounded-md cursor-pointer transition-all ${i === cur ? "ring-2 ring-white opacity-100" : "opacity-50 hover:opacity-75"}`}
                    draggable={false}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Image Lightbox Popup */}
      {showImageLightbox && localPostMedia.length > 0 && (() => {
        const imageMediaList = localPostMedia.filter((m) => m.mediaType === "image");
        const totalImages = imageMediaList.length;
        return (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-100 flex items-center justify-center p-4"
            onClick={() => setShowImageLightbox(false)}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowImageLightbox(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/30 text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image Counter */}
            {totalImages > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/40 text-white text-sm font-medium">
                {selectedImageIndex + 1} / {totalImages}
              </div>
            )}

            {/* Previous Button */}
            {selectedImageIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedImageIndex((prev) => prev - 1); }}
                className="absolute left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/30 text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Next Button */}
            {selectedImageIndex < totalImages - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedImageIndex((prev) => prev + 1); }}
                className="absolute right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/30 text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Main Image */}
            <div
              className="flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={apiService.getImageUrl(imageMediaList[selectedImageIndex]?.mediaUrl) || ""}
                alt={`Full size ${selectedImageIndex + 1}`}
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl select-none"
                draggable={false}
              />
            </div>

            {/* Thumbnail Strip */}
            {totalImages > 1 && (
              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {imageMediaList.map((m, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={m.id}
                    src={apiService.getImageUrl(m.mediaUrl) || ""}
                    alt={`Thumbnail ${i + 1}`}
                    onClick={() => setSelectedImageIndex(i)}
                    className={`w-12 h-12 object-cover rounded-md cursor-pointer transition-all ${
                      i === selectedImageIndex
                        ? "ring-2 ring-white opacity-100"
                        : "opacity-50 hover:opacity-75"
                    }`}
                    draggable={false}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
