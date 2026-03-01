"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { API_CONFIG } from "@/lib/config";

interface Notification {
  id: string;
  recipientId: string;
  senderId: string | null;
  type: "like" | "comment" | "friend_request" | "other";
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
  return notif.sender?.role === "god" || notif.sender?.role === "admin";
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
  if (type === "friend_request") {
    return (
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
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

function typeLabel(type: Notification["type"], senderName: string): string {
  switch (type) {
    case "like": return `${senderName} liked your post`;
    case "comment": return `${senderName} commented on your post`;
    case "friend_request": return `${senderName} sent you a friend request`;
    default: return `Message from ${senderName}`;
  }
}

/* ─── Detail Popup Modal ─── */
function NotifDetailModal({
  notif,
  onClose,
}: {
  notif: Notification;
  onClose: () => void;
}) {
  const admin = isAdminNotification(notif);
  const senderName = admin
    ? "Admin"
    : notif.sender
    ? `${notif.sender.firstName ?? ""} ${notif.sender.lastName ?? ""}`.trim() || "Someone"
    : "Someone";
  const avatarUrl = notif.sender?.avatarUrl;

  // Close on backdrop click
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
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
              <Image
                src={avatarUrl.startsWith("http") ? avatarUrl : `${API_CONFIG.BASE_URL}${avatarUrl}`}
                alt={senderName}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-500">
                {senderName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Sender + time */}
          <div className="flex-1 min-w-0">
            {admin ? (
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">From Admin</p>
            ) : (
              <p className="text-sm font-semibold text-gray-800 truncate">{senderName}</p>
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
        <div className="overflow-y-auto max-h-72 px-5 py-4">
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
                {typeLabel(notif.type, senderName)}
              </p>
              {notif.message && (
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap wrap-break-word border-l-2 border-slate-300 pl-3 italic">
                  {notif.message}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPanel({ userId }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [detailNotif, setDetailNotif] = useState<Notification | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/notifications/${userId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`${API_CONFIG.BASE_URL}/api/notifications/read`, {
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
      await fetch(`${API_CONFIG.BASE_URL}/api/notifications/${notificationId}`, {
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
      await fetch(`${API_CONFIG.BASE_URL}/api/notifications/all`, {
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

  return (
    <>
      {/* Detail Popup */}
      {detailNotif && (
        <NotifDetailModal
          notif={detailNotif}
          onClose={() => setDetailNotif(null)}
        />
      )}

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
                      <Image
                        src={avatarUrl.startsWith("http") ? avatarUrl : `${API_CONFIG.BASE_URL}${avatarUrl}`}
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
                        <p className={`text-sm leading-snug line-clamp-1 ${notif.isRead ? "text-gray-600" : "text-gray-800 font-medium"}`}>
                          {typeLabel(notif.type, senderName)}
                        </p>
                        {notif.message && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 italic">&ldquo;{notif.message}&rdquo;</p>
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

