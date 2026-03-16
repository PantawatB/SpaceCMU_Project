"use client";
import { fetchWithToken } from '@/lib/api';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_CONFIG } from "@/lib/config";
import { apiService } from "@/lib/api";
import PostCardReadOnly from "@/components/PostCardReadOnly";

interface Notification {
  id: string;
  recipientId: string;
  senderId: string | null;
  type: "like" | "comment" | "friend_request" | "other" | "repost" | "reply" | "comment_like" | "friend_accept" | "mention";
  referenceId: string | null;
  message: string | null;
  isRead: boolean;
  createdAt: string;
  sender?: {
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    role: string | null;
  };
}

interface NotificationsPanelProps {
  userId: string | null;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onUnreadChange?: (count: number) => void;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function isAdminNotification(notif: Notification): boolean {
  // "other" type is ALWAYS an admin/god broadcast — never show the real sender name
  // regardless of what role the sender currently has (role can change after notification was sent).
  // User-generated types always show the real sender profile.
  if (notif.type === "other") return true;
  return false;
}

function NotifIcon({ type, isAdmin }: { type: Notification["type"]; isAdmin: boolean }) {
  if (isAdmin) {
    return (
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-600">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 15a1 1 0 110-2 1 1 0 010 2zm1-4h-2V7h2v6z" />
        </svg>
      </span>
    );
  }
  if (type === "like") {
    return (
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-500">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </span>
    );
  }
  if (type === "comment") {
    return (
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6a2 2 0 012-2h14a2 2 0 012 2v10z" />
        </svg>
      </span>
    );
  }
  if (type === "reply") {
    return (
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </span>
    );
  }
  if (type === "repost") {
    return (
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </span>
    );
  }
  if (type === "comment_like") {
    return (
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-pink-100 text-pink-500">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </span>
    );
  }
  if (type === "friend_request") {
    return (
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      </span>
    );
  }
  if (type === "friend_accept") {
    return (
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-teal-100 text-teal-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
    );
  }
  if (type === "mention") {
    return (
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-100 text-violet-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-500">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    </span>
  );
}

function typeLabel(type: Notification["type"], senderName: string, message?: string | null): string {
  switch (type) {
    case "like": return `${senderName} liked your post`;
    case "comment": return `${senderName} commented on your post`;
    case "reply": return `${senderName} replied to your comment`;
    case "repost": return `${senderName} reposted your post`;
    case "comment_like": return `${senderName} liked your comment`;
    case "friend_request": return `${senderName} sent you a friend request`;
    case "friend_accept": return `${senderName} accepted your friend request`;
    case "mention": {
      const src = message?.match(/^\[src:(post|comment)\]/)?.[1];
      return src === "comment"
        ? `${senderName} mentioned you in a comment`
        : `${senderName} mentioned you in a post`;
    }
    default: return `Message from ${senderName}`;
  }
}

function typeAction(type: Notification["type"], message?: string | null): string {
  switch (type) {
    case "like": return " liked your post";
    case "comment": return " commented on your post";
    case "reply": return " replied to your comment";
    case "repost": return " reposted your post";
    case "comment_like": return " liked your comment";
    case "friend_request": return " sent you a friend request";
    case "friend_accept": return " accepted your friend request";
    case "mention": {
      const src = message?.match(/^\[src:(post|comment)\]/)?.[1];
      return src === "comment" ? " mentioned you in a comment" : " mentioned you in a post";
    }
    default: return "";
  }
}

function VerifiedBadge() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="inline-block w-3.5 h-3.5 text-blue-500 shrink-0 flex-none align-middle"
      aria-label="Verified official account"
    >
      <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  );
}

// Types that have a postId as referenceId
const POST_REF_TYPES: Notification["type"][] = ["like", "comment", "reply", "repost", "mention"];
// comment_like uses commentId as referenceId — need to resolve to postId
const COMMENT_REF_TYPES: Notification["type"][] = ["comment_like"];

/* ─── Detail Popup Modal ─── */
function NotifDetailModal({
  notif,
  onClose,
  onNotifRemoved,
}: {
  notif: Notification;
  onClose: () => void;
  onNotifRemoved?: (id: string) => void;
}) {
  const router = useRouter();
  const admin = isAdminNotification(notif);
  const senderName = admin
    ? "Admin"
    : notif.sender
    ? `${notif.sender.firstName ?? ""} ${notif.sender.lastName ?? ""}`.trim() || "Someone"
    : "Someone";
  const avatarUrl = notif.sender?.avatarUrl;

  // Friend request action state
  type FriendRequestState = "loading" | "pending" | "accepted" | "rejected" | "not_found" | "already_friend" | null;
  const [friendReqState, setFriendReqState] = useState<FriendRequestState>(
    notif.type === "friend_request" ? "loading" : null
  );
  const [friendReqActing, setFriendReqActing] = useState(false);

  // Resolved postId for "View Post" button
  const [resolvedPostId, setResolvedPostId] = useState<string | null>(null);
  // Full post data for the read-only card preview
  const [fullPost, setFullPost] = useState<{
    id: string;
    content: string;
    category?: string;
    likeCount?: number;
    commentCount?: number;
    repostCount?: number;
    createdAt: string;
    author?: { firstName: string | null; lastName: string | null; avatarUrl: string | null };
    media?: { id: number; postId: number; mediaUrl: string; mediaType: "image" | "video"; order: number; fileSize: number | null }[];
  } | null>(null);
  const [postLoading, setPostLoading] = useState(false);
  const [postDeleted, setPostDeleted] = useState(false);

  useEffect(() => {
    if (!notif.referenceId) return;

    const fetchPost = async (postId: string) => {
      setPostLoading(true);
      try {
        const res = await fetchWithToken(`${API_CONFIG.BASE_URL}/api/posts/${postId}`, {
          credentials: "include",
        });
        if (!res.ok) {
          setPostDeleted(true);
          return;
        }
        const data = await res.json();
        if (data.deleted) {
          setPostDeleted(true);
          return;
        }
        setResolvedPostId(data.id);
        setFullPost(data);
      } catch { /* silent */ }
      finally { setPostLoading(false); }
    };

    const fetchPostFromComment = async (commentId: string) => {
      setPostLoading(true);
      try {
        const res = await fetchWithToken(`${API_CONFIG.BASE_URL}/api/posts/comment/${commentId}/post`, {
          credentials: "include",
        });
        if (res.status === 404) {
          setPostDeleted(true);
          setPostLoading(false);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          // The endpoint returns either the post directly or { postId, ...postData }
          const postId = data.postId ?? data.id;
          if (postId) {
            // If the endpoint returned the resolved post directly, use it
            if (data.content !== undefined) {
              setResolvedPostId(postId);
              setFullPost({ ...data, id: postId });
            } else {
              // Fetch the actual post separately
              await fetchPost(postId);
            }
          }
        }
      } catch { /* silent */ }
      finally { setPostLoading(false); }
    };

    if (POST_REF_TYPES.includes(notif.type)) {
      fetchPost(notif.referenceId);
    } else if (COMMENT_REF_TYPES.includes(notif.type)) {
      fetchPostFromComment(notif.referenceId);
    }
  }, [notif.referenceId, notif.type]);

  // Check friendship status for friend_request notifications
  useEffect(() => {
    if (notif.type !== "friend_request" || !notif.senderId) return;
    const check = async () => {
      try {
        const res = await fetchWithToken(`${API_CONFIG.BASE_URL}/api/friends/status/${notif.senderId}`, {
          credentials: "include",
        });
        if (!res.ok) { setFriendReqState("not_found"); return; }
        const data = await res.json();
        if (data.status === "friend") {
          setFriendReqState("already_friend");
        } else if (data.status === "pending" && data.pendingDirection === "received") {
          setFriendReqState("pending");
        } else {
          // sent / not_friend / other — request no longer actionable from our side
          setFriendReqState("not_found");
        }
      } catch { setFriendReqState("not_found"); }
    };
    check();
  }, [notif.type, notif.senderId]);

  const handleFriendAction = async (action: "accepted" | "rejected") => {
    if (!notif.referenceId || friendReqActing) return;
    setFriendReqActing(true);
    try {
      const res = await fetchWithToken(`${API_CONFIG.BASE_URL}/api/friends/respond`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: notif.referenceId, status: action }),
      });
      if (res.ok) {
        setFriendReqState(action === "accepted" ? "accepted" : "rejected");
        // Remove the notification from the list after acting
        if (action === "rejected") {
          // Give brief moment to show "Rejected" feedback then dismiss
          setTimeout(() => {
            onNotifRemoved?.(notif.id);
            onClose();
          }, 800);
        }
      } else {
        setFriendReqState("not_found");
      }
    } catch { setFriendReqState("not_found"); }
    setFriendReqActing(false);
  };

  const handleViewPost = () => {
    if (!resolvedPostId) return;
    onClose();
    router.push(`/Feeds?postId=${resolvedPostId}`);
  };

  // Close on backdrop click
  return (
    <div
      className="fixed inset-0 z-300 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          {/* Avatar */}
          <div className="shrink-0">
            {admin ? (
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shadow">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                </svg>
              </div>
            ) : avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={apiService.getImageUrl(avatarUrl) || "/default-avatar.svg"}
                alt={senderName}
                width={40}
                height={40}
                onClick={() => { if (notif.senderId) { onClose(); router.push(`/Friends?userId=${notif.senderId}`); } }}
                className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
              />
            ) : (
              <div
                onClick={() => { if (notif.senderId) { onClose(); router.push(`/Friends?userId=${notif.senderId}`); } }}
                className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-500 cursor-pointer hover:opacity-80 transition-opacity"
              >
                {senderName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Sender + time */}
          <div className="flex-1 min-w-0">
            {admin ? (
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">From Admin</p>
            ) : (
              <p
                className="text-sm font-semibold text-gray-800 truncate flex items-center gap-1 cursor-pointer hover:underline"
                onClick={() => { if (notif.senderId) { onClose(); router.push(`/Friends?userId=${notif.senderId}`); } }}
              >
                {senderName}
                {notif.sender?.role === "official_account" && <VerifiedBadge />}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">{timeAgo(notif.createdAt)}</p>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {admin ? (
            notif.message ? (
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap wrap-break-word">
                {notif.message}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">No message content</p>
            )
          ) : (
            <>
              <p className="text-sm font-medium text-gray-800 mb-2">
                {typeLabel(notif.type, senderName, notif.message)}
              </p>
              {notif.message && (
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap wrap-break-word border-l-2 border-slate-300 pl-3 italic">
                  {notif.message.replace(/^\[src:(post|comment)\]/, "")}
                </p>
              )}

              {/* Friend request action buttons */}
              {notif.type === "friend_request" && (
                <div className="mt-3">
                  {friendReqState === "loading" && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Checking request status…
                    </div>
                  )}
                  {friendReqState === "pending" && (
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => handleFriendAction("accepted")}
                        disabled={friendReqActing}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold transition"
                      >
                        {friendReqActing ? (
                          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        Accept
                      </button>
                      <button
                        onClick={() => handleFriendAction("rejected")}
                        disabled={friendReqActing}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-600 text-xs font-semibold transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </button>
                    </div>
                  )}
                  {friendReqState === "accepted" && (
                    <div className="flex items-center gap-2 mt-1 text-green-600 text-xs font-semibold">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Friend request accepted!
                    </div>
                  )}
                  {friendReqState === "rejected" && (
                    <div className="flex items-center gap-2 mt-1 text-gray-400 text-xs font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Request rejected
                    </div>
                  )}
                  {friendReqState === "already_friend" && (
                    <div className="flex items-center gap-2 mt-1 text-teal-600 text-xs font-semibold">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      You are already friends
                    </div>
                  )}
                  {friendReqState === "not_found" && (
                    <div className="flex items-center gap-2 mt-1 text-gray-400 text-xs italic">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      This request is no longer valid
                    </div>
                  )}
                </div>
              )}

              {/* Full post card (read-only) */}
              {(POST_REF_TYPES.includes(notif.type) || COMMENT_REF_TYPES.includes(notif.type)) && (
                <div className="mt-3">
                  {postLoading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Loading post...
                    </div>
                  ) : postDeleted ? (
                    <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-400">
                      <svg className="w-5 h-5 shrink-0 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>โพสต์นี้ถูกลบไปแล้ว</span>
                    </div>
                  ) : fullPost ? (
                    <PostCardReadOnly post={fullPost} />
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
          {/* View Post button — only for post-related notifications and post still exists */}
          {!admin && resolvedPostId && !postDeleted && (
            <button
              onClick={handleViewPost}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Post
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPanel({ userId, mobileOpen = false, onMobileClose, onUnreadChange }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [detailNotif, setDetailNotif] = useState<Notification | null>(null);

  const fetchPage = useCallback(async (targetPage: number, append: boolean) => {
    if (!userId) return;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await fetchWithToken(
        `${API_CONFIG.BASE_URL}/api/notifications/${userId}?page=${targetPage}&limit=20`,
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const body = await res.json();

      // Handle both old plain-array response and new paginated { data, pagination } shape
      const items: Notification[] = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
        ? body.data
        : [];
      const more: boolean = body?.pagination?.hasMore ?? false;

      if (append) {
        setNotifications((prev) => [...prev, ...items]);
        setPage(targetPage);
      } else {
        setNotifications(items);
        setPage(1);
      }
      setHasMore(more);
    } catch {
      if (!append) setNotifications([]);
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [userId]);

  const fetchNotifications = useCallback(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    fetchPage(page + 1, true);
  }, [fetchPage, page]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetchWithToken(`${API_CONFIG.BASE_URL}/api/notifications/read`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch { /* silent */ }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(unread.map((n) => markAsRead(n.id)));
  };

  const openDetail = (notif: Notification) => {
    setDetailNotif(notif);
    // Auto mark as read when popup opens
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
  };

  const deleteOne = async (notificationId: string) => {
    try {
      await fetchWithToken(`${API_CONFIG.BASE_URL}/api/notifications/${notificationId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setSelected((prev) => { const s = new Set(prev); s.delete(notificationId); return s; });
    } catch { /* silent */ }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    await Promise.all(Array.from(selected).map(deleteOne));
    setDeleting(false);
    setDeleteMode(false);
    setSelected(new Set());
  };

  const deleteAll = async () => {
    setDeleting(true);
    try {
      await fetchWithToken(`${API_CONFIG.BASE_URL}/api/notifications/all`, {
        method: "DELETE",
        credentials: "include",
      });
      setNotifications([]);
      setSelected(new Set());
    } catch { /* silent */ }
    setDeleting(false);
    setDeleteMode(false);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const toggleDeleteMode = () => {
    setDeleteMode((v) => !v);
    setSelected(new Set());
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Notify parent whenever unread count changes
  useEffect(() => {
    onUnreadChange?.(unreadCount);
  }, [unreadCount, onUnreadChange]);

  return (
    <>
      {/* Detail Popup */}
      {detailNotif && (
        <NotifDetailModal
          notif={detailNotif}
          onClose={() => setDetailNotif(null)}
          onNotifRemoved={(id) => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            setDetailNotif(null);
          }}
        />
      )}

      {/* ── Mobile Notification Modal (centered) ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          {/* Modal card */}
          <div className="relative bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full max-w-sm max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-800">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-slate-700 text-white text-xs font-bold">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {!deleteMode && unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-slate-500 hover:text-slate-700 transition">
                    Mark all read
                  </button>
                )}
                <button onClick={fetchNotifications} className="p-1 rounded-lg hover:bg-gray-100 transition">
                  <svg className={`w-3.5 h-3.5 text-gray-400 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button onClick={onMobileClose} className="p-1 rounded-lg hover:bg-gray-100 transition">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content — scrollable */}
            <div className="overflow-y-auto flex-1 py-1">
              {loading && notifications.length === 0 && (
                <div className="flex justify-center py-5">
                  <svg className="animate-spin w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              )}
              {!loading && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="text-sm">No notifications yet</p>
                </div>
              )}
              {notifications.map((notif) => {
                const admin = isAdminNotification(notif);
                const senderName = admin
                  ? "Admin"
                  : notif.sender
                  ? `${notif.sender.firstName ?? ""} ${notif.sender.lastName ?? ""}`.trim() || "Someone"
                  : "Someone";
                const avatarUrl = notif.sender?.avatarUrl;
                const isChecked = selected.has(notif.id);
                return (
                  <div
                    key={notif.id}
                    onClick={() => { if (deleteMode) { toggleSelect(notif.id); } else { openDetail(notif); } }}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-all duration-150 cursor-pointer ${
                      deleteMode && isChecked ? "bg-slate-100" : notif.isRead ? "hover:bg-gray-50" : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    {deleteMode && (
                      <span className={`shrink-0 mt-1 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${isChecked ? "bg-slate-700 border-slate-700" : "border-slate-300 bg-white"}`}>
                        {isChecked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </span>
                    )}
                    <div className="relative shrink-0">
                      {admin ? (
                        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shadow-sm">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
                        </div>
                      ) : avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={apiService.getImageUrl(avatarUrl) || "/default-avatar.svg"} alt={senderName} width={36} height={36} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-500">{senderName.charAt(0).toUpperCase()}</div>
                      )}
                      {!admin && <span className="absolute -bottom-1 -right-1 scale-75"><NotifIcon type={notif.type} isAdmin={false} /></span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      {admin ? (
                        <>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">from Admin</span>
                            <span className="w-1 h-1 rounded-full bg-slate-400" />
                            <span className="text-xs text-gray-400">{timeAgo(notif.createdAt)}</span>
                          </div>
                          <p className={`text-sm leading-snug line-clamp-2 ${notif.isRead ? "text-gray-500" : "text-gray-800 font-medium"}`}>{notif.message ?? <span className="text-gray-400 italic">No message</span>}</p>
                        </>
                      ) : (
                        <>
                          <p className={`text-sm leading-snug line-clamp-2 ${notif.isRead ? "text-gray-600" : "text-gray-800"}`}>
                            <span className="font-semibold">{senderName}</span>
                            {notif.sender?.role === "official_account" && <VerifiedBadge />}
                            {typeAction(notif.type, notif.message)}
                          </p>
                          {notif.message && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 italic">&ldquo;{notif.message.replace(/^\[src:(post|comment)\]/, "")}&rdquo;</p>}
                          <p className="text-xs text-gray-400 mt-0.5">{timeAgo(notif.createdAt)}</p>
                        </>
                      )}
                    </div>
                    {!deleteMode && !notif.isRead && <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-slate-500" />}
                  </div>
                );
              })}
              {hasMore && !deleteMode && (
                <div className="flex justify-center py-2">
                  <button onClick={loadMore} disabled={loadingMore} className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50 transition">
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </div>

            {/* Bottom bar */}
            {notifications.length > 0 && (
              <div className="border-t border-gray-100 shrink-0">
                {!deleteMode ? (
                  <button onClick={toggleDeleteMode} className="w-full py-3 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors">
                    Delete
                  </button>
                ) : (
                  <div className="flex">
                    <button onClick={selected.size > 0 ? deleteSelected : deleteAll} disabled={deleting} className="flex-1 py-3 text-xs font-semibold text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-50 transition-colors">
                      {deleting ? "Deleting…" : selected.size > 0 ? `Delete (${selected.size})` : "Delete All"}
                    </button>
                    <div className="w-px bg-slate-600" />
                    <button onClick={toggleDeleteMode} disabled={deleting} className="flex-1 py-3 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Desktop sidebar panel ── */}
      <aside className="hidden lg:flex w-72 pt-8 px-4 bg-white flex-col gap-0 items-start">
        <div className="w-full rounded-2xl border border-gray-100 shadow-sm bg-white overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-800">Notifications</h2>
              {unreadCount > 0 && (
                <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-slate-700 text-white text-xs font-bold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {!deleteMode && unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-slate-500 hover:text-slate-700 transition"
                  title="Mark all as read"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={fetchNotifications}
                className="p-1 rounded-lg hover:bg-gray-100 transition"
                title="Refresh"
              >
                <svg
                  className={`w-3.5 h-3.5 text-gray-400 ${loading ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 mx-3" />

          {/* Content */}
          <div className="overflow-y-auto max-h-72 py-1">
            {loading && notifications.length === 0 && (
              <div className="flex justify-center py-5">
                <svg className="animate-spin w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-gray-300">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-xs">No notifications yet</p>
              </div>
            )}

            {notifications.map((notif) => {
              const admin = isAdminNotification(notif);
              const senderName = admin
                ? "Admin"
                : notif.sender
                ? `${notif.sender.firstName ?? ""} ${notif.sender.lastName ?? ""}`.trim() || "Someone"
                : "Someone";
              const avatarUrl = notif.sender?.avatarUrl;
              const isChecked = selected.has(notif.id);

              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (deleteMode) {
                      toggleSelect(notif.id);
                    } else {
                      openDetail(notif);
                    }
                  }}
                  className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-all duration-150 cursor-pointer ${
                    deleteMode && isChecked
                      ? "bg-slate-100"
                      : admin
                      ? notif.isRead ? "hover:bg-slate-50" : "bg-slate-50 hover:bg-slate-100"
                      : notif.isRead ? "hover:bg-gray-50" : "bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  {/* Checkbox in delete mode */}
                  {deleteMode && (
                    <span className={`shrink-0 mt-1 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      isChecked ? "bg-slate-700 border-slate-700" : "border-slate-300 bg-white"
                    }`}>
                      {isChecked && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  )}

                  {/* Avatar / icon */}
                  <div className="relative shrink-0">
                    {admin ? (
                      <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shadow-sm">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                        </svg>
                      </div>
                    ) : avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={apiService.getImageUrl(avatarUrl) || "/default-avatar.svg"}
                        alt={senderName}
                        width={36}
                        height={36}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-500">
                        {senderName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {!admin && (
                      <span className="absolute -bottom-1 -right-1 scale-75">
                        <NotifIcon type={notif.type} isAdmin={false} />
                      </span>
                    )}
                  </div>

                  {/* Text — truncated preview */}
                  <div className="flex-1 min-w-0">
                    {admin ? (
                      <>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">from Admin</span>
                          <span className="w-1 h-1 rounded-full bg-slate-400" />
                          <span className="text-xs text-gray-400">{timeAgo(notif.createdAt)}</span>
                        </div>
                        {notif.message ? (
                          <p className={`text-sm leading-snug line-clamp-2 ${notif.isRead ? "text-gray-500" : "text-gray-800 font-medium"}`}>
                            {notif.message}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400 italic">No message content</p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className={`text-sm leading-snug line-clamp-2 ${notif.isRead ? "text-gray-600" : "text-gray-800"}`}>
                          <span className="inline-flex items-center gap-0.5 align-middle">
                            <span className="font-semibold">{senderName}</span>
                            {notif.sender?.role === "official_account" && <VerifiedBadge />}
                          </span>
                          {typeAction(notif.type, notif.message)}
                        </p>
                        {notif.message && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 italic">&ldquo;{notif.message.replace(/^\[src:(post|comment)\]/, "")}&rdquo;</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(notif.createdAt)}</p>
                      </>
                    )}
                  </div>

                  {/* Unread dot (normal mode only) */}
                  {!deleteMode && !notif.isRead && (
                    <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-slate-500" />
                  )}
                </div>
              );
            })}

            {/* Load more button */}
            {hasMore && !deleteMode && (
              <div className="flex justify-center py-2">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50 transition"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-1">
                      <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Loading…
                    </span>
                  ) : (
                    "Load more"
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Bottom bar */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100">
              {!deleteMode ? (
                <button
                  onClick={toggleDeleteMode}
                  className="w-full py-2.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Delete
                </button>
              ) : (
                <div className="flex">
                  <button
                    onClick={selected.size > 0 ? deleteSelected : deleteAll}
                    disabled={deleting}
                    className="flex-1 py-2.5 text-xs font-semibold text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    {deleting
                      ? "Deleting…"
                      : selected.size > 0
                      ? `Delete (${selected.size})`
                      : "Delete All"}
                  </button>
                  <div className="w-px bg-slate-600" />
                  <button
                    onClick={toggleDeleteMode}
                    disabled={deleting}
                    className="flex-1 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </aside>
    </>
  );
}

