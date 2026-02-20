"use client";

import { useState, useEffect } from "react";
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

interface CommentMedia {
  id: number;
  commentId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  order: number;
}

interface Comment {
  id: string | number;
  postId: number;
  userId: string;
  content: string;
  createdAt: string;
  author?: {
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  media?: CommentMedia[];
}

interface PostCardProps {
  post: Post;
  onLikeUpdate?: (postId: number, newLikeCount: number) => void;
  onRepostUpdate?: (postId: number, newRepostCount: number) => void;
  onSaveUpdate?: (postId: number) => void;
}

export default function PostCard({
  post,
  onLikeUpdate,
  onRepostUpdate,
  onSaveUpdate,
}: PostCardProps) {
  const { activeUser } = useUser();
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [showReportPopup, setShowReportPopup] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportMood, setReportMood] = useState<"happy" | "sad" | null>(null);

  // Image lightbox
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Track user's interaction status
  const [isLiked, setIsLiked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Comment media upload states
  const [commentMediaFiles, setCommentMediaFiles] = useState<File[]>([]);
  const [commentMediaPreviews, setCommentMediaPreviews] = useState<string[]>(
    [],
  );

  // Media scroll position tracking
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Debug log
  console.log("PostCard render:", {
    postId: post.id,
    content: post.content,
    hasMedia: !!post.media,
    mediaCount: post.media?.length || 0,
    media: post.media,
  });

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

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!showImageLightbox) return;

    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowImageLightbox(false);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault(); // Prevent page scroll
        e.stopPropagation(); // Prevent event bubbling
        if (selectedImageIndex > 0) {
          setSelectedImageIndex((prev) => prev - 1);
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault(); // Prevent page scroll
        e.stopPropagation(); // Prevent event bubbling
        if (
          post.media &&
          selectedImageIndex <
            post.media.filter((m) => m.mediaType === "image").length - 1
        ) {
          setSelectedImageIndex((prev) => prev + 1);
        }
      }
    };

    // Use capture phase to catch event before it reaches other elements
    window.addEventListener("keydown", handleKeyPress, true);
    return () => {
      window.removeEventListener("keydown", handleKeyPress, true);
      // Restore body scroll when lightbox closes
      document.body.style.overflow = 'unset';
    };
  }, [showImageLightbox, selectedImageIndex, post.media]);

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

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/posts/${post.id}/comments`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch comments: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched comments data:", data);

      // API returns array directly with 'user' instead of 'author' and includes media
      const fetchedComments: Comment[] = Array.isArray(data)
        ? data.map((comment) => {
            console.log(
              "Processing comment:",
              comment.id,
              "media:",
              comment.media,
            );
            return {
              id: comment.id,
              postId: post.id,
              userId: comment.user.id,
              content: comment.content,
              createdAt: comment.createdAt,
              author: {
                firstName: comment.user.firstName,
                lastName: comment.user.lastName,
                avatarUrl: comment.user.avatarUrl,
              },
              media: comment.media || undefined,
            };
          })
        : [];

      console.log("Processed comments:", fetchedComments);
      setComments(fetchedComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      alert("Failed to load comments. Please try again.");
    } finally {
      setLoadingComments(false);
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
      // Create FormData for multipart/form-data
      const formData = new FormData();
      formData.append("postId", post.id.toString());
      formData.append("content", commentText.trim() || "");

      // Add all media files
      commentMediaFiles.forEach((file) => {
        formData.append("media", file);
      });

      console.log("Posting comment with:", {
        postId: post.id,
        content: commentText.trim(),
        mediaCount: commentMediaFiles.length,
      });

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/posts/comment`, {
        method: "POST",
        credentials: "include",
        body: formData,
        // Don't set Content-Type header - browser will set it automatically with boundary
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Comment post error:", errorData);
        throw new Error(
          errorData.message || `Failed to post comment: ${response.status}`,
        );
      }

      const result = await response.json();
      console.log("Comment posted successfully:", result);

      // Clear inputs
      setCommentText("");
      setCommentMediaFiles([]);
      setCommentMediaPreviews([]);

      // Refresh comments to show new comment with media
      await fetchComments();
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
    // Always fetch comments when opening popup to get latest data
    fetchComments();
  };

  const closeCommentPopup = () => {
    setShowCommentPopup(false);
    setCommentText("");
    setCommentMediaFiles([]);
    setCommentMediaPreviews([]);
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
    // Delete post logic here
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
          <div className="font-bold">
            {post.author?.firstName && post.author?.lastName
              ? `${post.author.firstName} ${post.author.lastName}`
              : "Anonymous"}
          </div>
          <div className="text-xs text-gray-400">{post.category}</div>
          <div className="text-xs text-gray-400">
            {getTimeAgo(post.createdAt)}
          </div>
        </div>
      </div>

      {/* Post Content */}
      {post.content && (
        <div className="mb-3 text-gray-800 leading-relaxed whitespace-pre-wrap wrap-break-word overflow-wrap-anywhere">
          {post.content}
        </div>
      )}

      {/* Post Media - Threads-style Horizontal Layout */}
      {post.media && post.media.length > 0 && (
        <div className={`mb-3 ${post.media.length <= 2 ? "" : "-mx-6"} relative group/media`}>
          {/* Left Arrow Indicator - Show only when scrolled right and has multiple images */}
          {post.media.length > 1 && showLeftArrow && (
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
          {post.media.length > 1 && showRightArrow && (
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
            className={`overflow-x-auto overflow-y-hidden scrollbar-hide ${post.media.length <= 2 ? "" : "px-6"}`}
            onScroll={handleMediaScroll}
          >
            <div className="flex items-center gap-2 w-max min-w-full justify-center">
              {post.media.map((media, index) => {
                const isSingleMedia = post.media!.length === 1;
                const isSingleImage =
                  isSingleMedia && media.mediaType === "image";

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
                        setSelectedImageIndex(index);
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
            {post.commentCount > 0 && (
              <span className="text-xs text-gray-500">
                ({post.commentCount})
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-xl font-bold text-gray-800">Comments</h2>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
              {loadingComments ? (
                <div className="animate-pulse flex flex-col gap-4">
                  {[...Array(3)].map((_, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center"></div>
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-100 rounded-2xl px-4 py-3 h-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  No comments yet. Be the first to comment!
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="relative shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={apiService.getImageUrl(comment.author?.avatarUrl) || "/default-avatar.svg"}
                        alt="avatar"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-100 rounded-2xl px-4 py-3">
                        <p className="text-sm font-semibold text-gray-800">
                          {comment.author?.firstName} {comment.author?.lastName}
                        </p>
                        <p className="text-sm text-gray-800 mt-1">
                          {comment.content}
                        </p>

                        {/* Comment Media */}
                        {comment.media && comment.media.length > 0 && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {comment.media.map((media) => (
                              <div
                                key={media.id}
                                className="rounded-lg overflow-hidden bg-gray-200"
                              >
                                {media.mediaType === "video" ? (
                                  <video
                                    src={apiService.getImageUrl(media.mediaUrl) || ""}
                                    controls
                                    className="w-full h-auto max-h-48 object-cover"
                                  />
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={apiService.getImageUrl(media.mediaUrl) || ""}
                                    alt="Comment media"
                                    className="w-full h-auto max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(comment.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <div className="px-6 py-4 border-t border-gray-200 shrink-0">
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
                      placeholder="Write a comment..."
                      rows={1}
                      className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 text-gray-800 placeholder-gray-400 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white text-sm transition-all resize-none overflow-hidden"
                      style={{ minHeight: "40px", maxHeight: "120px" }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height =
                          Math.min(target.scrollHeight, 120) + "px";
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
                            <video
                              src={preview}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={preview}
                              alt={`Preview ${idx}`}
                              className="w-full h-full object-cover"
                            />
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
                    {/* Upload Media Button */}
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-100 transition-all cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpg,image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm,video/x-flv,video/x-ms-wmv,.mp4,.mov,.avi,.mkv,.webm,.flv,.wmv,.m4v,.3gp"
                        multiple
                        onChange={handleCommentMediaUpload}
                        className="hidden"
                        disabled={postingComment}
                      />
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
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-xs font-medium">Photo/Video</span>
                      {commentMediaFiles.length > 0 && (
                        <span className="text-xs font-bold text-blue-600">
                          ({commentMediaFiles.length}/10)
                        </span>
                      )}
                    </label>
                  </div>

                  {/* Send Button */}
                  <button
                    className="px-6 py-2 rounded-full font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg hover:scale-105"
                    onClick={handlePostComment}
                    disabled={
                      postingComment ||
                      (!commentText.trim() && commentMediaFiles.length === 0)
                    }
                  >
                    {postingComment ? (
                      <svg
                        className="animate-spin w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
                      "Post"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Three-dot Menu Button */}
      <div className="absolute top-6 right-6">
        <button
          onClick={() => setShowPostMenu(!showPostMenu)}
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
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
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

      {/* Image Lightbox Popup */}
      {showImageLightbox && post.media && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-100 flex items-center justify-center p-4"
          onClick={() => setShowImageLightbox(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setShowImageLightbox(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-101"
          >
            <svg
              className="w-8 h-8"
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

          {/* Image Counter */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-4 py-2 rounded-full z-101">
            {selectedImageIndex + 1} /{" "}
            {post.media.filter((m) => m.mediaType === "image").length}
          </div>

          {/* Previous Button */}
          {selectedImageIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImageIndex((prev) => prev - 1);
              }}
              className="absolute left-4 text-white hover:text-gray-300 transition-colors z-101"
            >
              <svg
                className="w-12 h-12"
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
            </button>
          )}

          {/* Next Button */}
          {selectedImageIndex <
            post.media.filter((m) => m.mediaType === "image").length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImageIndex((prev) => prev + 1);
              }}
              className="absolute right-4 text-white hover:text-gray-300 transition-colors z-101"
            >
              <svg
                className="w-12 h-12"
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
            </button>
          )}

          {/* Image */}
          <div
            className="max-w-7xl max-h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={apiService.getImageUrl(post.media.filter((m) => m.mediaType === "image")[selectedImageIndex]?.mediaUrl) || ""}
              alt={`Full size ${selectedImageIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
          </div>

          {/* Download Button */}
          <a
            href={apiService.getImageUrl(post.media.filter((m) => m.mediaType === "image")[selectedImageIndex]?.mediaUrl) || "#"}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-4 right-4 bg-white text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 z-101"
            onClick={(e) => e.stopPropagation()}
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download
          </a>
        </div>
      )}
    </div>
  );
}
