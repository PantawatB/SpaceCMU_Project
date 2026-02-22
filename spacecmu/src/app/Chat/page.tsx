"use client";

import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import { apiService } from "@/lib/api";

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Suggestion {
  id: number;
  rawId: string;
  displayName: string;
  username: string;
  avatar: string;
}

interface FriendApiItem {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  friendsCount: number;
}

/** shape ที่ได้จาก GET /api/chat-rooms/me */
interface ChatRoomMember {
  userId: string;
  role: string;
  joinedAt: string;
  lastReadAt: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

interface ChatRoomLastMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: {
    firstName: string;
    lastName: string;
  };
}

interface ChatRoomApiItem {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  isGroup: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  displayName: string;
  displayAvatar: string | null;
  members: ChatRoomMember[];
  memberCount: number;
  lastMessage: ChatRoomLastMessage | null;
  unreadCount: number;
}

/** shape ของข้อความจาก GET /api/messages/room/:roomId */
interface RealMessage {
  id: string;
  roomId: string;
  senderId: string;
  receiverId: string | null;
  content: string;
  isRead: boolean;
  mediaUrls: string | null;   // JSON array string e.g. '["images-xxx.jpg"]'
  mediaType: string | null;   // "image" | "video" | "mixed"
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}

interface MessagePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface GetRoomMessagesResponse {
  messages: RealMessage[];
  pagination: MessagePagination;
}

/** shape ของ reader จาก GET /api/messages/room/:roomId/readers */
interface RoomReader {
  userId: string;
  lastReadAt: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

// ─── Helper: Lightbox Modal ───────────────────────────────────────────────────

function Lightbox({
  urls,
  index,
  onClose,
  onPrev,
  onNext,
  onGoTo,
}: {
  urls: string[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (i: number) => void;
}) {
  // Close on Escape, navigate with arrow keys
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext]);

  if (urls.length === 0) return null;
  const currentUrl = urls[index];

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/30 text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Counter */}
      {urls.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/40 text-white text-sm font-medium">
          {index + 1} / {urls.length}
        </div>
      )}

      {/* Prev button */}
      {urls.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/30 text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentUrl}
        alt=""
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl select-none"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />

      {/* Next button */}
      {urls.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/30 text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Thumbnail strip (if multiple) */}
      {urls.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {urls.map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={u}
              alt=""
              onClick={() => onGoTo(i)}
              className={`w-12 h-12 object-cover rounded-md cursor-pointer transition-all ${
                i === index ? "ring-2 ring-white opacity-100" : "opacity-50 hover:opacity-75"
              }`}
              draggable={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helper: Default Group Avatar SVG ────────────────────────────────────────

function DefaultGroupAvatar({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-linear-to-br from-slate-500 to-slate-700 ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    </div>
  );
}

// ─── Helper: format timestamp ─────────────────────────────────────────────────

function formatRoomTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "ตอนนี้";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return "Yesterday";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (diffDay < 7) return days[date.getDay()];
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export default function ChatPage() {
  const [chatMessage, setChatMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsError, setSuggestionsError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Real chat rooms จาก API
  const [realRooms, setRealRooms] = useState<ChatRoomApiItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Real messages สำหรับ room ที่เลือก
  const [realMessages, setRealMessages] = useState<RealMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState(false);
  const [messagesPagination, setMessagesPagination] = useState<MessagePagination | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isLoadingMoreRef = useRef(false); // ใช้ block scroll-to-bottom effect
  // เก็บ current user id เพื่อตรวจว่าข้อความเป็นของเราหรือเปล่า
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // ─── Seen / Readers state ────────────────────────────────────────────────────
  const [roomReaders, setRoomReaders] = useState<RoomReader[]>([]);
  // popup: แสดง readers ของข้อความที่กด
  const [seenPopupMsgId, setSeenPopupMsgId] = useState<string | null>(null);

  // ─── Message input enhancements ─────────────────────────────────────────────
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<{ url: string; type: string }[]>([]);
  const attachBtnRef = useRef<HTMLButtonElement>(null);

  // ─── Lightbox state ─────────────────────────────────────────────────────────
  const [lightboxUrls, setLightboxUrls] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // New message modal state
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const [selectedSuggestions, setSelectedSuggestions] = useState<number[]>([]);

  // Group name modal state
  const [isGroupNameOpen, setIsGroupNameOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupAvatarFile, setGroupAvatarFile] = useState<File | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | null>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [createChatError, setCreateChatError] = useState<string | null>(null);

  // derive label จาก search text โดยตรง
  const suggestionLabel = newChatSearch.trim() === "" ? "Suggested" : "Results";

  // ─── fetch current user id ───────────────────────────────────────────────────
  // ใช้ activeUser.id เพราะ backend ใช้ req.session.activeUserId ในทุก API
  // (ถ้า switch เป็น anonymous จะเป็น anonymous id แทน public id)
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const data = await apiService.get<{ user: { id: string }; activeUser: { id: string } }>("/api/users/me");
        setCurrentUserId(data.activeUser?.id ?? null);
      } catch {
        // ไม่จำเป็นต้อง error ให้ใช้ null แทน
      }
    };
    fetchCurrentUser();
  }, []);

  // ─── fetch real chat rooms ──────────────────────────────────────────────────
  const fetchRooms = React.useCallback(async () => {
    setRoomsLoading(true);
    setRoomsError(false);
    try {
      const data = await apiService.get<ChatRoomApiItem[]>("/api/chat-rooms/me");
      setRealRooms(data);
    } catch {
      setRoomsError(true);
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // ─── fetch messages สำหรับห้องที่เลือก ──────────────────────────────────────
  const fetchMessages = React.useCallback(async (roomId: string, page = 1, prepend = false) => {
    if (page === 1) {
      setMessagesLoading(true);
      setMessagesError(false);
    } else {
      setIsLoadingMore(true);
    }
    try {
      const data = await apiService.get<GetRoomMessagesResponse>(
        `/api/messages/room/${roomId}?limit=40&page=${page}`
      );
      if (prepend) {
        // โหลดเพิ่มขึ้นบน → เติมข้อความเก่าก่อนหน้า (dedup ด้วย id)
        setRealMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const incoming = data.messages.filter((m) => !existingIds.has(m.id));
          return [...incoming, ...prev];
        });
      } else {
        setRealMessages(data.messages);
      }
      setMessagesPagination(data.pagination);
    } catch {
      if (page === 1) setMessagesError(true);
    } finally {
      if (page === 1) {
        setMessagesLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  }, []);

  // เมื่อเลือกห้องใหม่ → reset และโหลดข้อความหน้า 1
  useEffect(() => {
    if (!selectedRoomId) return;
    setRealMessages([]);
    setMessagesPagination(null);
    setRoomReaders([]);
    fetchMessages(selectedRoomId, 1, false);
  }, [selectedRoomId, fetchMessages]);

  // ─── ref เพื่อใช้ใน closure ของ event listener ─────────────────────────────
  const selectedRoomIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedRoomIdRef.current = selectedRoomId;
  }, [selectedRoomId]);

  // ─── polling: ดึง readers + messages ใหม่ทุก 5 วินาที ───────────────────────
  // วิธีนี้ทำให้เห็น "seen" เมื่ออีกฝ่ายเปิดหน้าแชทค้างไว้ โดยไม่ต้องใช้ WebSocket
  useEffect(() => {
    if (!selectedRoomId) return;

    const fetchReaders = async (roomId: string) => {
      try {
        const data = await apiService.get<RoomReader[]>(
          `/api/messages/room/${roomId}/readers`
        );
        setRoomReaders(data);
      } catch {
        // ไม่ critical ถ้า fail ก็ไม่ต้อง error
      }
    };

    // ─── mark as read แล้ว fetch readers เสมอ (sequential) ──────────────────
    const markReadAndFetchReaders = async (roomId: string) => {
      // รอ mark as read ก่อน เพื่อให้ lastReadAt ของเราอัปเดตใน DB
      // แล้วค่อย fetch readers → อีกฝ่ายจะเห็น Seen ทันที
      try {
        await apiService.patch(`/api/messages/room/${roomId}/read`, {});
      } catch { /* ไม่ critical */ }
      await fetchReaders(roomId);
    };

    // fetch ทันทีเมื่อเข้าห้อง
    markReadAndFetchReaders(selectedRoomId);

    // poll ทุก 5 วินาที
    const interval = setInterval(() => {
      const roomId = selectedRoomIdRef.current;
      if (!roomId) return;

      // 1) mark as read + poll readers เพื่ออัพเดต seen status
      markReadAndFetchReaders(roomId);

      // 2) poll messages: ดึง page=1 (newest) แล้ว merge เฉพาะที่ใหม่กว่า last message ที่มี
      apiService
        .get<GetRoomMessagesResponse>(`/api/messages/room/${roomId}?limit=40&page=1`)
        .then(async (data) => {
          setRealMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newOnes = data.messages.filter((m) => !existingIds.has(m.id));
            if (newOnes.length === 0) return prev;
            requestAnimationFrame(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            });
            const merged = [...prev, ...newOnes];
            // dedup again (guard against race between poll + prepend)
            const seen = new Set<string>();
            return merged
              .filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          });
          // mark as read + re-fetch readers หลังได้ข้อความใหม่
          await markReadAndFetchReaders(roomId);
        })
        .catch(() => {});
    }, 5000);

    // ─── mark as read เมื่อ window กลับมา focus ───────────────────────────────
    const handleVisibilityChange = () => {
      const roomId = selectedRoomIdRef.current;
      if (!roomId) return;
      if (!document.hidden) {
        markReadAndFetchReaders(roomId);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedRoomId]);

  // scroll to bottom เมื่อโหลดข้อความหน้า 1 เสร็จ
  useEffect(() => {
    if (messagesLoading) return;
    if (isLoadingMoreRef.current) return; // กำลังโหลดข้อความเก่า ไม่ scroll
    if (selectedRoomId && realMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messagesLoading, selectedRoomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // scroll to bottom เมื่อได้รับข้อความใหม่ (ไม่ใช่การโหลดเพิ่มบนสุด)
  const prevMessageCountRef = useRef(0);
  useEffect(() => {
    const prevCount = prevMessageCountRef.current;
    prevMessageCountRef.current = realMessages.length;

    // ถ้า isLoadingMoreRef เป็น true = กำลังโหลดข้อความเก่า → ไม่ scroll
    if (isLoadingMoreRef.current) return;
    // ถ้า messages ลดลง หรือ = 0 → ไม่ scroll
    if (realMessages.length === 0) return;
    // scroll ต่อเมื่อมีข้อความเพิ่มขึ้น (ไม่ใช่ reset)
    if (realMessages.length > prevCount && prevCount > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [realMessages.length]);

  // ─── scroll handler: load more เมื่อ scroll ขึ้นบนสุด ───────────────────────
  const handleMessagesScroll = React.useCallback(() => {
    if (!messagesContainerRef.current || !selectedRoomId) return;
    const el = messagesContainerRef.current;
    if (el.scrollTop <= 60 && !isLoadingMore && messagesPagination) {
      const { page, totalPages } = messagesPagination;
      if (page < totalPages) {
        const prevScrollHeight = el.scrollHeight;
        isLoadingMoreRef.current = true; // block scroll-to-bottom ตั้งแต่ก่อน fetch
        fetchMessages(selectedRoomId, page + 1, true).then(() => {
          // ใช้ double-rAF เพื่อให้ DOM update + paint เสร็จก่อน adjust scroll
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              el.scrollTop = el.scrollHeight - prevScrollHeight;
              // reset หลัง scroll adjust แน่ๆ แล้ว
              isLoadingMoreRef.current = false;
            });
          });
        });
      }
    }
  }, [selectedRoomId, isLoadingMore, messagesPagination, fetchMessages]);

  const mapApiItems = (items: FriendApiItem[]): Suggestion[] =>
    items.slice(0, 10).map((f) => ({
      id: parseInt(f.id.replace(/-/g, "").slice(0, 8), 16),
      rawId: f.id,
      displayName: `${f.firstName} ${f.lastName}`.trim() || f.username,
      username: f.username,
      avatar: f.avatarUrl ? (apiService.getImageUrl(f.avatarUrl) ?? "") : "",
    }));

  // ฟังก์ชัน fetch แยก เรียกได้จากทั้ง effect และปุ่ม "ลองใหม่"
  const fetchSuggestions = React.useCallback(async (query: string) => {
    setSuggestionsError(false);
    try {
      const endpoint = query.trim() === ""
        ? "/api/friends/me"
        : `/api/users/search?query=${encodeURIComponent(query.trim())}`;
      const data = await apiService.get<FriendApiItem[]>(endpoint);
      setSuggestions(mapApiItems(data));
    } catch {
      setSuggestionsError(true);
    }
  }, []);

  // เปิด modal → load friends ทันที
  useEffect(() => {
    if (!isNewChatOpen) return;
    const id = setTimeout(() => fetchSuggestions(""), 0);
    return () => clearTimeout(id);
  }, [isNewChatOpen, fetchSuggestions]);

  // debounce search เมื่อพิมพ์
  useEffect(() => {
    if (!isNewChatOpen) return;
    const timer = setTimeout(() => fetchSuggestions(newChatSearch), 300);
    return () => clearTimeout(timer);
  }, [newChatSearch, isNewChatOpen, fetchSuggestions]);

  // เลือกห้องจริง
  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    // mark as read (fire-and-forget)
    apiService.patch(`/api/messages/room/${roomId}/read`, {}).catch(() => {});
    setRealRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, unreadCount: 0 } : r))
    );
  };

  // ─── auto-resize textarea ───────────────────────────────────────────────────
  const autoResizeTextarea = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  };

  // ─── file attachment handler ────────────────────────────────────────────────
  const MAX_IMAGES = 10;
  const MAX_VIDEOS = 5;
  const MAX_IMAGE_SIZE = 20 * 1024 * 1024;  // 20 MB per image
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB per video

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    if (!incoming.length) return;

    const currentImages = attachmentFiles.filter((f) => !f.type.startsWith("video/"));
    const currentVideos = attachmentFiles.filter((f) => f.type.startsWith("video/"));

    const accepted: File[] = [];
    const errors: string[] = [];

    for (const f of incoming) {
      const isVid = f.type.startsWith("video/");
      if (isVid) {
        if (currentVideos.length + accepted.filter((a) => a.type.startsWith("video/")).length >= MAX_VIDEOS) {
          errors.push(`วิดีโอเกินขีดจำกัด (สูงสุด ${MAX_VIDEOS} คลิป): ${f.name}`);
        } else if (f.size > MAX_VIDEO_SIZE) {
          errors.push(`วิดีโอไฟล์ใหญ่เกิน 100 MB: ${f.name}`);
        } else {
          accepted.push(f);
        }
      } else {
        if (currentImages.length + accepted.filter((a) => !a.type.startsWith("video/")).length >= MAX_IMAGES) {
          errors.push(`รูปเกินขีดจำกัด (สูงสุด ${MAX_IMAGES} รูป): ${f.name}`);
        } else if (f.size > MAX_IMAGE_SIZE) {
          errors.push(`รูปไฟล์ใหญ่เกิน 20 MB: ${f.name}`);
        } else {
          accepted.push(f);
        }
      }
    }

    if (errors.length > 0) {
      alert("ไม่สามารถเพิ่มไฟล์บางรายการ:\n\n" + errors.join("\n"));
    }

    if (accepted.length > 0) {
      setAttachmentFiles((prev) => [...prev, ...accepted]);
      setAttachmentPreviews((prev) => [
        ...prev,
        ...accepted.map((f) => ({
          url: URL.createObjectURL(f),
          type: f.type.startsWith("video/") ? "video" : "image",
        })),
      ]);
    }

    e.target.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== idx));
    setAttachmentPreviews((prev) => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // ─── send message (text-only or with media) ─────────────────────────────────
  const handleSendMessage = async () => {
    const hasText = chatMessage.trim().length > 0;
    const hasFiles = attachmentFiles.length > 0;
    if ((!hasText && !hasFiles) || !selectedRoomId || isSendingMessage) return;

    const text = chatMessage.trim();
    const filesToSend = [...attachmentFiles];
    const previewsToRevoke = [...attachmentPreviews];

    // Clear input immediately
    setChatMessage("");
    setAttachmentFiles([]);
    setAttachmentPreviews([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }

    setIsSendingMessage(true);
    try {
      const addMsg = (msg: RealMessage) => {
        setRealMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev; // dedup
          return [...prev, msg];
        });
        setRealRooms((prev) =>
          prev.map((r) =>
            r.id === selectedRoomId
              ? {
                  ...r,
                  lastMessage: {
                    id: msg.id,
                    senderId: msg.senderId,
                    content: msg.content || "📷 Media",
                    createdAt: msg.createdAt,
                    sender: { firstName: "", lastName: "" },
                  },
                  updatedAt: msg.createdAt,
                }
              : r
          )
        );
      };

      // แยก images และ videos
      const imageFiles = filesToSend.filter((f) => !f.type.startsWith("video/"));
      const videoFiles = filesToSend.filter((f) => f.type.startsWith("video/"));

      // 1) ส่ง images ทั้งหมดพร้อมกันใน 1 message (ถ้ามี)
      if (imageFiles.length > 0) {
        const fd = new FormData();
        fd.append("content", "");
        imageFiles.forEach((f) => fd.append("media", f));
        const msg = await apiService.postFormData<RealMessage>(
          `/api/messages/room/${selectedRoomId}/media`,
          fd
        );
        addMsg(msg);
      }

      // 2) ส่ง videos ทีละอัน (ถ้ามี)
      for (const vf of videoFiles) {
        const fd = new FormData();
        fd.append("content", "");
        fd.append("media", vf);
        const msg = await apiService.postFormData<RealMessage>(
          `/api/messages/room/${selectedRoomId}/media`,
          fd
        );
        addMsg(msg);
      }

      // 3) ส่ง text ปิดท้าย (ถ้ามี)
      if (hasText) {
        const msg = await apiService.post<RealMessage>("/api/messages", {
          roomId: selectedRoomId,
          content: text,
        });
        addMsg(msg);
      }

      previewsToRevoke.forEach((p) => URL.revokeObjectURL(p.url));
    } catch {
      // ส่งไม่สำเร็จ — คืน text + files กลับ
      setChatMessage(text);
      setAttachmentFiles(filesToSend);
      setAttachmentPreviews(previewsToRevoke);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const totalRealUnread = realRooms.reduce((sum, r) => sum + r.unreadCount, 0);

  // ฟังก์ชัน reset และปิด modal ทั้งหมด
  const closeNewChatModal = () => {
    setIsNewChatOpen(false);
    setNewChatSearch("");
    setSelectedSuggestions([]);
    setCreateChatError(null);
  };

  const closeGroupNameModal = () => {
    setIsGroupNameOpen(false);
    setGroupName("");
    setGroupAvatarFile(null);
    setGroupAvatarPreview(null);
    setCreateChatError(null);
  };

  // handle group avatar file pick
  const handleGroupAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGroupAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setGroupAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    // reset value เพื่อให้เลือกไฟล์เดิมซ้ำได้
    e.target.value = "";
  };

  // ฟังก์ชันสร้าง Direct Room (1-on-1)
  const handleCreateDirectRoom = async () => {
    const selected = suggestions.find((s) => selectedSuggestions.includes(s.id));
    if (!selected) return;

    setIsCreatingChat(true);
    setCreateChatError(null);
    try {
      await apiService.post("/api/chat-rooms/direct", {
        otherUserId: selected.rawId,
      });
      closeNewChatModal();
      fetchRooms();
    } catch {
      setCreateChatError("ไม่สามารถสร้างแชทได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsCreatingChat(false);
    }
  };

  // ฟังก์ชันสร้าง Group Room
  const handleCreateGroupRoom = async () => {
    if (!groupName.trim()) return;

    const memberIds = suggestions
      .filter((s) => selectedSuggestions.includes(s.id))
      .map((s) => s.rawId);

    setIsCreatingChat(true);
    setCreateChatError(null);
    try {
      if (groupAvatarFile) {
        // ถ้ามีรูปกลุ่ม ส่งเป็น FormData
        const formData = new FormData();
        formData.append("name", groupName.trim());
        // ส่ง memberIds เป็น array โดยใช้ key เดิม (backend จะ parse rawMemberIds)
        memberIds.forEach((id) => formData.append("memberIds", id));
        formData.append("avatar", groupAvatarFile);
        await apiService.postFormData("/api/chat-rooms/group", formData);
      } else {
        await apiService.post("/api/chat-rooms/group", {
          name: groupName.trim(),
          memberIds,
        });
      }
      closeGroupNameModal();
      closeNewChatModal();
      fetchRooms();
    } catch {
      setCreateChatError("ไม่สามารถสร้างกลุ่มได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsCreatingChat(false);
    }
  };

  // เมื่อกดปุ่ม Chat ใน modal
  const handleChatButtonClick = () => {
    if (selectedSuggestions.length === 1) {
      handleCreateDirectRoom();
    } else if (selectedSuggestions.length >= 2) {
      // เปิด modal กรอกชื่อกลุ่ม
      setGroupName("");
      setCreateChatError(null);
      setIsGroupNameOpen(true);
    }
  };

  return (
    <div className="flex h-screen bg-white text-gray-800 overflow-hidden">
      {/* Sidebar */}
      <div className="flex-none h-screen sticky top-0 z-30">
        <Sidebar />
      </div>

      {/* New Message Modal */}
      {isNewChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeNewChatModal}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px]">
            {/* Modal Header */}
            <div className="flex-none flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button
                onClick={closeNewChatModal}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-gray-900 font-semibold text-base">New message</h2>
              <div className="w-8" />
            </div>

            {/* To: Search bar */}
            <div className="flex-none flex items-center gap-2 px-5 py-3 border-b border-gray-100">
              <span className="text-gray-400 text-sm font-medium flex-none">To:</span>
              <input
                type="text"
                placeholder="Search..."
                value={newChatSearch}
                onChange={(e) => setNewChatSearch(e.target.value)}
                autoFocus
                className="flex-1 bg-transparent text-gray-800 text-sm placeholder-gray-300 focus:outline-none"
              />
            </div>

            {/* Suggested / Results label */}
            <div className="flex-none px-5 pt-4 pb-2">
              <p className="text-gray-900 font-semibold text-sm">{suggestionLabel}</p>
            </div>

            {/* Suggestions List — fixed height, always scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {suggestionsError ? (
                /* Error state — ไม่แสดง mock data */
                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">ไม่สามารถโหลดรายชื่อได้</p>
                    <p className="text-xs text-gray-400 mt-1">เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง</p>
                  </div>
                  <button
                    onClick={() => fetchSuggestions(newChatSearch)}
                    className="text-xs text-slate-600 font-medium px-4 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    ลองใหม่
                  </button>
                </div>
              ) : suggestions
                .filter((s) =>
                  newChatSearch === "" ||
                  s.displayName.toLowerCase().includes(newChatSearch.toLowerCase()) ||
                  s.username.toLowerCase().includes(newChatSearch.toLowerCase())
                )
                .length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                  </svg>
                  <p className="text-sm text-gray-400">No results</p>
                </div>
              ) : (
                suggestions
                  .filter((s) =>
                    newChatSearch === "" ||
                    s.displayName.toLowerCase().includes(newChatSearch.toLowerCase()) ||
                    s.username.toLowerCase().includes(newChatSearch.toLowerCase())
                  )
                  .map((s) => {
                    const isSelected = selectedSuggestions.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() =>
                          setSelectedSuggestions((prev) =>
                            isSelected ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                          )
                        }
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        {/* Avatar — ใช้ <img> ธรรมดาเพื่อหลีกเลี่ยง next/image domain restriction */}
                        <div className="relative flex-none w-12 h-12">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={s.avatar || "/default-avatar.svg"}
                            alt={s.displayName}
                            className="rounded-full object-cover w-12 h-12"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg";
                            }}
                          />
                        </div>

                        {/* Name & username */}
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 font-semibold text-sm truncate">{s.displayName}</p>
                          <p className="text-gray-400 text-xs truncate">{s.username}</p>
                        </div>

                        {/* Selection circle */}
                        <div
                          className={`flex-none w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-slate-700 border-slate-700"
                              : "border-gray-300 bg-transparent"
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })
              )}
            </div>

            {/* Chat Button */}
            <div className="flex-none px-5 py-4 border-t border-gray-100">
              {createChatError && !isGroupNameOpen && (
                <p className="text-xs text-red-500 text-center mb-2">{createChatError}</p>
              )}
              <button
                disabled={selectedSuggestions.length === 0 || isCreatingChat}
                onClick={handleChatButtonClick}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  selectedSuggestions.length > 0 && !isCreatingChat
                    ? "bg-slate-700 hover:bg-slate-800 text-white shadow-sm"
                    : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
              >
                {isCreatingChat ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    กำลังสร้าง...
                  </>
                ) : selectedSuggestions.length >= 2 ? (
                  "สร้างกลุ่ม"
                ) : (
                  "Chat"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Name Modal — เด้งขึ้นมาเมื่อเลือก 2+ คน */}
      {isGroupNameOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeGroupNameModal}
          />

          {/* Modal */}
          <div className="relative w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button
                onClick={closeGroupNameModal}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-gray-900 font-semibold text-base">ตั้งชื่อกลุ่ม</h2>
              <div className="w-8" />
            </div>

            {/* Selected members preview */}
            <div className="px-5 pt-4 pb-2">
              <p className="text-xs text-gray-400 mb-3">
                สมาชิก {selectedSuggestions.length} คน
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions
                  .filter((s) => selectedSuggestions.includes(s.id))
                  .map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.avatar || "/default-avatar.svg"}
                        alt={s.displayName}
                        className="w-5 h-5 rounded-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg";
                        }}
                      />
                      <span className="text-xs text-slate-700 font-medium">{s.displayName}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Group Avatar Upload */}
            <div className="px-5 pt-2 pb-1 flex items-center gap-4">
              <input
                ref={groupAvatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleGroupAvatarChange}
              />
              <button
                type="button"
                onClick={() => groupAvatarInputRef.current?.click()}
                className="relative flex-none w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-slate-300 hover:border-slate-500 transition-colors flex items-center justify-center bg-slate-50"
                title="เลือกรูปกลุ่ม"
              >
                {groupAvatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={groupAvatarPreview} alt="group avatar" className="w-full h-full object-cover" />
                ) : (
                  <DefaultGroupAvatar size={64} />
                )}
                {/* overlay icon */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity rounded-full">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </button>
              <div>
                <p className="text-sm font-medium text-gray-700">รูปภาพกลุ่ม</p>
                <p className="text-xs text-gray-400 mt-0.5">กดเพื่อเลือกรูป (ไม่บังคับ)</p>
                {groupAvatarFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setGroupAvatarFile(null);
                      setGroupAvatarPreview(null);
                      // reset input value เพื่อให้เลือกไฟล์ใหม่ได้หลังลบ
                      if (groupAvatarInputRef.current) {
                        groupAvatarInputRef.current.value = "";
                      }
                    }}
                    className="text-xs text-red-400 hover:text-red-600 mt-1 transition-colors"
                  >
                    ลบรูป
                  </button>
                )}
              </div>
            </div>

            {/* Group name input */}
            <div className="px-5 py-4">
              <input
                type="text"
                placeholder="ชื่อกลุ่ม..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && groupName.trim() && !isCreatingChat) {
                    handleCreateGroupRoom();
                  }
                }}
                autoFocus
                maxLength={50}
                className="w-full px-4 py-3 rounded-xl bg-gray-100 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
              />
              {createChatError && (
                <p className="text-xs text-red-500 mt-2">{createChatError}</p>
              )}
            </div>

            {/* Create button */}
            <div className="px-5 pb-5">
              <button
                disabled={!groupName.trim() || isCreatingChat}
                onClick={handleCreateGroupRoom}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  groupName.trim() && !isCreatingChat
                    ? "bg-slate-700 hover:bg-slate-800 text-white shadow-sm"
                    : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
              >
                {isCreatingChat ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    กำลังสร้างกลุ่ม...
                  </>
                ) : (
                  "สร้างกลุ่ม"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Layout */}
      <main className="flex-1 flex h-screen overflow-hidden min-w-0">
        {/* Left Panel — Conversation Window */}
        <div className="flex-1 flex flex-col h-full min-w-0 bg-gray-50">

          {/* ══════════════════════════════════════════════════════════════
              แสดงห้องแชทจริง
          ══════════════════════════════════════════════════════════════ */}
          {selectedRoomId && (() => {
            const selectedRoom = realRooms.find((r) => r.id === selectedRoomId);
            const roomAvatarUrl = selectedRoom?.displayAvatar
              ? apiService.getImageUrl(selectedRoom.displayAvatar)
              : null;

            return (
              <>
                {/* Chat Header */}
                <div className="flex-none flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-none">
                      {roomAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={roomAvatarUrl}
                          alt={selectedRoom?.displayName ?? ""}
                          className="w-11 h-11 rounded-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }}
                        />
                      ) : selectedRoom?.isGroup ? (
                        <DefaultGroupAvatar size={44} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src="/default-avatar.svg" alt="" className="w-11 h-11 rounded-full object-cover" />
                      )}
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900 text-base leading-tight">
                        {selectedRoom?.displayName ?? "..."}
                      </h2>
                      <p className="text-xs text-gray-400">
                        {selectedRoom?.isGroup
                          ? `${selectedRoom.memberCount} สมาชิก`
                          : ""}
                      </p>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    <button className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="More options">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Messages Area */}
                <div
                  ref={messagesContainerRef}
                  onScroll={handleMessagesScroll}
                  onClick={() => seenPopupMsgId && setSeenPopupMsgId(null)}
                  className="flex-1 overflow-y-auto px-6 py-6 space-y-3"
                >
                  {/* Load More indicator */}
                  {isLoadingMore && (
                    <div className="flex justify-center py-2">
                      <svg className="w-5 h-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    </div>
                  )}

                  {/* ไม่มีข้อความเพิ่มเติม */}
                  {!isLoadingMore && messagesPagination && messagesPagination.page >= messagesPagination.totalPages && realMessages.length > 0 && (
                    <div className="flex items-center gap-3 my-2">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400 font-medium px-2">เริ่มต้นการสนทนา</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )}

                  {messagesLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 mt-20">
                      <svg className="w-8 h-8 animate-spin text-slate-300" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <p className="text-sm text-gray-400">กำลังโหลดข้อความ...</p>
                    </div>
                  ) : messagesError ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 mt-20">
                      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500">โหลดข้อความไม่สำเร็จ</p>
                      <button
                        onClick={() => fetchMessages(selectedRoomId, 1, false)}
                        className="text-xs text-slate-600 font-medium px-4 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50"
                      >
                        ลองใหม่
                      </button>
                    </div>
                  ) : realMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 mt-20">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-sm">ยังไม่มีข้อความ</p>
                      <p className="text-xs text-gray-400">พิมพ์ข้อความแรกเพื่อเริ่มสนทนา</p>
                    </div>
                  ) : (
                    realMessages.map((msg, idx) => {
                      const isMine = msg.senderId === currentUserId;
                      const prevMsg = realMessages[idx - 1];
                      const nextMsg = realMessages[idx + 1];

                      // ถ้าห่างกันเกิน 1 นาที ให้ถือว่าเป็นกลุ่มใหม่
                      const TIME_GAP_MS = 1 * 60 * 1000;
                      const prevTimeDiff = prevMsg
                        ? new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()
                        : Infinity;

                      const isFirstInGroup =
                        !prevMsg ||
                        prevMsg.senderId !== msg.senderId ||
                        prevTimeDiff > TIME_GAP_MS;

                      const nextTimeDiff = nextMsg
                        ? new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime()
                        : Infinity;
                      const isLastInGroup =
                        !nextMsg ||
                        nextMsg.senderId !== msg.senderId ||
                        nextTimeDiff > TIME_GAP_MS;

                      const showAvatar = !isMine && isLastInGroup;
                      const showTime = isLastInGroup;
                      const showSenderName = !isMine && selectedRoom?.isGroup && isFirstInGroup;

                      const senderMember = selectedRoom?.members.find((m) => m.userId === msg.senderId);
                      const senderAvatarUrl = senderMember?.avatarUrl
                        ? apiService.getImageUrl(senderMember.avatarUrl)
                        : null;
                      const senderName = senderMember
                        ? `${senderMember.firstName} ${senderMember.lastName}`.trim()
                        : msg.senderId.slice(0, 8);

                      const msgDate = new Date(msg.createdAt);
                      const msgTime = msgDate.toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      });

                      const marginTop = isFirstInGroup ? "mt-3" : "mt-0.5";

                      // ─── Seen / Sent / Reader-avatar logic (ใหม่) ──────────────────────────
                      const msgCreatedAtMs = new Date(msg.createdAt).getTime();

                      // ข้อความสุดท้ายที่ฉันส่ง
                      const isLastMineMsg =
                        isMine &&
                        !realMessages.slice(idx + 1).some((m) => m.senderId === currentUserId);
                      // ข้อความล่าสุดในห้องเป็นของฉันหรือไม่
                      const lastMsgIsMe = realMessages.length > 0
                        ? realMessages[realMessages.length - 1].senderId === currentUserId
                        : false;

                      // ─── คำนวณ "reader ที่อ่านถึงข้อความนี้พอดี" ────────────────────────────
                      // แต่ละ reader จะแสดงรูปที่ข้อความสุดท้ายที่เขาอ่านถึง
                      // โดย "อ่านถึงข้อความนี้" = lastReadAt >= createdAt ของ msg นี้
                      //   AND lastReadAt < createdAt ของ msg ถัดไป (ถ้ามี)
                      // กรอง currentUser ออก (ไม่แสดงรูปตัวเอง)
                      const nextMsgCreatedAtMs = nextMsg
                        ? new Date(nextMsg.createdAt).getTime()
                        : Infinity;

                      const readersAtThisMsg = roomReaders.filter((r) => {
                        if (!r.userId) return false;
                        if (r.userId === currentUserId) return false; // ไม่แสดงรูปตัวเอง
                        if (r.userId === msg.senderId) return false;  // ไม่แสดงรูปคนส่งข้อความนั้น
                        if (!r.lastReadAt) return false;
                        const readAt = new Date(r.lastReadAt).getTime();
                        // อ่านถึงข้อความนี้: readAt >= createdAt ของข้อความนี้
                        if (readAt < msgCreatedAtMs) return false;
                        // แต่ยังไม่ถึงข้อความถัดไป (เพื่อไม่ให้รูปซ้ำซ้อน)
                        if (readAt >= nextMsgCreatedAtMs) return false;
                        return true;
                      });

                      // ─── Sent / Seen ─────────────────────────────────────────────────────────
                      // Seen: แสดงเฉพาะถ้าข้อความล่าสุดในห้องเป็นของฉัน + มีคนอ่านแล้ว
                      // Sent: แสดงเฉพาะถ้าข้อความล่าสุดในห้องเป็นของฉัน + ยังไม่มีใครอ่าน
                      // ทั้งคู่แสดงที่ข้อความสุดท้ายที่ฉันส่งเท่านั้น
                      const seenReadersForLastMine = isLastMineMsg
                        ? roomReaders.filter((r) => {
                            if (r.userId === currentUserId) return false;
                            if (!r.lastReadAt) return false;
                            return new Date(r.lastReadAt).getTime() >= msgCreatedAtMs;
                          })
                        : [];

                      const showSeenWidget = lastMsgIsMe && isLastMineMsg && seenReadersForLastMine.length > 0;
                      const showSentStatus = lastMsgIsMe && isLastMineMsg && seenReadersForLastMine.length === 0;

                      // รูป reader ที่ยังไม่อ่านถึงข้อความล่าสุด จะแสดงอยู่ที่ข้อความที่เขาอ่านถึง
                      // (readersAtThisMsg คำนวณไว้แล้วด้านบน)
                      const showReaderAvatarsHere = readersAtThisMsg.length > 0;

                      // ── Popup JSX ที่ใช้ซ้ำได้ ─────────────────────────────────────────────
                      const SeenPopup = ({ readers }: { readers: typeof seenReadersForLastMine }) => (
                        <div className="absolute bottom-full mb-2 right-0 z-50 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <span className="text-gray-800 font-semibold text-sm">อ่านแล้วโดย</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSeenPopupMsgId(null); }}
                              className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="max-h-60 overflow-y-auto py-1.5">
                            {readers.map((r) => {
                              const rAvatar = r.avatarUrl ? apiService.getImageUrl(r.avatarUrl) : null;
                              const rName = `${r.firstName} ${r.lastName}`.trim() || "Unknown";
                              const rTime = r.lastReadAt
                                ? new Date(r.lastReadAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })
                                : "";
                              return (
                                <div key={r.userId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={rAvatar ?? "/default-avatar.svg"} alt={rName} className="w-9 h-9 rounded-full object-cover flex-none" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-gray-800 text-sm font-medium truncate">{rName}</p>
                                    <p className="text-gray-400 text-xs mt-0.5">{rTime}</p>
                                  </div>
                                  <svg className="w-4 h-4 text-blue-500 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMine ? "items-end" : "items-start"} ${marginTop}`}
                        >
                          {/* ── Message row: avatar + bubble ─────────────────────── */}
                          <div className={`flex items-end gap-2 w-full ${isMine ? "justify-end" : "justify-start"}`}>
                            {/* Avatar ฝั่งซ้าย */}
                            {!isMine && (
                              <div className="w-7 h-7 flex-none self-end">
                                {showAvatar ? (
                                  senderAvatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={senderAvatarUrl}
                                      alt={senderName}
                                      className="w-7 h-7 rounded-full object-cover"
                                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }}
                                    />
                                  ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src="/default-avatar.svg" alt={senderName} className="w-7 h-7 rounded-full" />
                                  )
                                ) : (
                                  <div className="w-7 h-7" />
                                )}
                              </div>
                            )}

                            <div className={`max-w-[65%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                              {/* ชื่อผู้ส่ง */}
                              {showSenderName && (
                                <span className="text-[11px] text-gray-400 mb-0.5 px-1">{senderName}</span>
                              )}

                              {/* Bubble */}
                              <div
                                className={`overflow-hidden ${
                                  isMine
                                    ? `bg-slate-700 text-white ${
                                        isFirstInGroup && isLastInGroup ? "rounded-2xl rounded-br-sm"
                                        : isFirstInGroup ? "rounded-2xl rounded-br-md"
                                        : isLastInGroup ? "rounded-2xl rounded-tr-md rounded-br-sm"
                                        : "rounded-xl rounded-r-md"
                                      }`
                                    : `bg-white text-gray-800 shadow-sm border border-gray-100 ${
                                        isFirstInGroup && isLastInGroup ? "rounded-2xl rounded-bl-sm"
                                        : isFirstInGroup ? "rounded-2xl rounded-bl-md"
                                        : isLastInGroup ? "rounded-2xl rounded-tl-md rounded-bl-sm"
                                        : "rounded-xl rounded-l-md"
                                      }`
                                }`}
                              >
                                {/* Media: images grid + individual videos */}
                                {msg.mediaUrls && (() => {
                                  let allFilenames: string[] = [];
                                  try { allFilenames = JSON.parse(msg.mediaUrls); } catch { allFilenames = []; }
                                  if (allFilenames.length === 0) return null;

                                  const IS_VIDEO = /\.(mp4|webm|ogg|mov|avi|mkv|m4v|3gp|flv|wmv)$/i;
                                  const imageFilenames = allFilenames.filter((f) => !IS_VIDEO.test(f));
                                  const videoFilenames = allFilenames.filter((f) => IS_VIDEO.test(f));

                                  // Build full URLs for images (for lightbox)
                                  const imageUrls = imageFilenames.map((f) => {
                                    const withPrefix = f.startsWith("/uploads/") ? f : `/uploads/${f}`;
                                    return apiService.getImageUrl(withPrefix) ?? "";
                                  });

                                  const imgCount = imageFilenames.length;
                                  // Grid layout:
                                  //   1 → full width (no grid)
                                  //   2 → 2 equal cols
                                  //   3 → 3 equal cols
                                  //   4 → 2×2 grid
                                  //   5+ → 3-col auto-flow
                                  const gridClass =
                                    imgCount === 1 ? "grid-cols-1" :
                                    imgCount === 2 ? "grid-cols-2" :
                                    imgCount === 3 ? "grid-cols-3" :
                                    imgCount === 4 ? "grid-cols-2" :
                                    "grid-cols-3";

                                  // All cells same fixed square height
                                  const cellHeight =
                                    imgCount === 1 ? 280 :
                                    imgCount === 2 ? 200 :
                                    imgCount === 3 ? 140 :
                                    imgCount === 4 ? 160 :
                                    120;

                                  return (
                                    <>
                                      {/* ── Image grid ── */}
                                      {imgCount > 0 && (
                                        <div className={`grid gap-0.5 overflow-hidden ${gridClass}`}>
                                          {imageUrls.map((mediaUrl, mi) => (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                              key={mi}
                                              src={mediaUrl}
                                              alt=""
                                              className="w-full object-cover cursor-pointer transition-opacity hover:opacity-90"
                                              style={{ height: `${cellHeight}px` }}
                                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                              onClick={() => {
                                                setLightboxUrls(imageUrls);
                                                setLightboxIndex(mi);
                                              }}
                                            />
                                          ))}
                                        </div>
                                      )}

                                      {/* ── Videos (each fullwidth) ── */}
                                      {videoFilenames.map((f, vi) => {
                                        const withPrefix = f.startsWith("/uploads/") ? f : `/uploads/${f}`;
                                        const vUrl = apiService.getImageUrl(withPrefix) ?? "";
                                        return (
                                          <div key={vi} className={imgCount > 0 || vi > 0 ? "mt-0.5" : ""}>
                                            <video
                                              src={vUrl}
                                              controls
                                              className="w-full block"
                                              style={{ maxHeight: "280px", minHeight: "120px", objectFit: "contain", background: "#000" }}
                                            />
                                          </div>
                                        );
                                      })}
                                    </>
                                  );
                                })()}
                                {/* Text content */}
                                {msg.content && (
                                  <p className="px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
                                    {msg.content}
                                  </p>
                                )}
                                {/* Media-only: no text padding filler */}
                                {!msg.content && msg.mediaUrls && <div />}
                              </div>

                              {/* Timestamp row */}
                              {showTime && (
                                <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                                  <span className="text-[11px] text-gray-400">{msgTime}</span>

                                  {/* Sent ✓ */}
                                  {showSentStatus && (
                                    <div className="flex items-center gap-0.5">
                                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span className="text-[10px] text-gray-400">Sent</span>
                                    </div>
                                  )}

                                  {/* Seen text only — รูปจะแสดงบรรทัดถัดไป */}
                                  {showSeenWidget && (
                                    <span className="text-[10px] text-gray-400">Seen</span>
                                  )}
                                </div>
                              )}

                              {/* ── Seen reader avatars — บรรทัดใต้ timestamp (ข้อความของฉัน) ─── */}
                              {showSeenWidget && (
                                <div className="relative flex items-center gap-0.5 mt-0.5 px-1 self-end">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSeenPopupMsgId(seenPopupMsgId === msg.id ? null : msg.id); }}
                                    className="flex -space-x-1 hover:opacity-80 transition-opacity"
                                    title="ดูว่าใครอ่านแล้วบ้าง"
                                  >
                                    {seenReadersForLastMine.slice(0, 3).map((r) => {
                                      const rAvatar = r.avatarUrl ? apiService.getImageUrl(r.avatarUrl) : null;
                                      return (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img key={r.userId} src={rAvatar ?? "/default-avatar.svg"} alt={`${r.firstName} ${r.lastName}`.trim()} className="w-4 h-4 rounded-full object-cover border border-white" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }} />
                                      );
                                    })}
                                    {seenReadersForLastMine.length > 3 && (
                                      <div className="w-4 h-4 rounded-full bg-gray-200 border border-white flex items-center justify-center">
                                        <span className="text-[7px] text-gray-600 font-bold leading-none">+{seenReadersForLastMine.length - 3}</span>
                                      </div>
                                    )}
                                  </button>
                                  {seenPopupMsgId === msg.id && <SeenPopup readers={seenReadersForLastMine} />}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ── Reader avatars: แสดงขวาสุดของ screen (นอก bubble column) ─── */}
                          {/* ใช้สำหรับทุกข้อความ (ทั้งของฉันและคนอื่น) ยกเว้น showSeenWidget */}
                          {showReaderAvatarsHere && !showSeenWidget && (
                            <div className="relative flex items-center justify-end gap-0.5 mt-0.5 w-full pr-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSeenPopupMsgId(seenPopupMsgId === msg.id ? null : msg.id); }}
                                className="flex -space-x-1 hover:opacity-80 transition-opacity"
                                title="ดูว่าใครอ่านแล้วบ้าง"
                              >
                                {readersAtThisMsg.slice(0, 3).map((r) => {
                                  const rAvatar = r.avatarUrl ? apiService.getImageUrl(r.avatarUrl) : null;
                                  const rName = `${r.firstName} ${r.lastName}`.trim();
                                  return (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img key={r.userId} src={rAvatar ?? "/default-avatar.svg"} alt={rName} className="w-4 h-4 rounded-full object-cover border border-white" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }} />
                                  );
                                })}
                                {readersAtThisMsg.length > 3 && (
                                  <div className="w-4 h-4 rounded-full bg-gray-200 border border-white flex items-center justify-center">
                                    <span className="text-[7px] text-gray-500 font-bold leading-none">+{readersAtThisMsg.length - 3}</span>
                                  </div>
                                )}
                              </button>
                              {seenPopupMsgId === msg.id && <SeenPopup readers={readersAtThisMsg} />}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="flex-none bg-white border-t border-gray-100">
                  {/* ── Attachment previews strip ──────────────────────────────── */}
                  {attachmentPreviews.length > 0 && (
                    <div className="px-4 pt-3 pb-1">
                      {/* Send plan summary */}
                      {(() => {
                        const imgCount = attachmentFiles.filter((f) => !f.type.startsWith("video/")).length;
                        const vidCount = attachmentFiles.filter((f) => f.type.startsWith("video/")).length;
                        const hasText = chatMessage.trim().length > 0;
                        const parts: string[] = [];
                        if (imgCount > 0) parts.push(`📷 ${imgCount} รูป (1 ข้อความ)`);
                        if (vidCount > 0) parts.push(`🎬 ${vidCount} วิดีโอ (${vidCount} ข้อความ)`);
                        if (hasText) parts.push(`💬 ข้อความ`);
                        return parts.length > 1 ? (
                          <p className="text-[11px] text-gray-400 mb-2">
                            จะส่งเป็น <span className="font-semibold text-slate-600">{parts.length} ข้อความ</span> → {parts.join(" → ")}
                          </p>
                        ) : null;
                      })()}
                      {/* Thumbnails */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {attachmentPreviews.map((p, idx) => (
                          <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex-none">
                            {p.type === "video" ? (
                              <video src={p.url} className="w-full h-full object-cover" muted />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.url} alt="" className="w-full h-full object-cover" />
                            )}
                            <button
                              onClick={() => removeAttachment(idx)}
                              className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            {p.type === "video" && (
                              <div className="absolute bottom-0.5 left-0.5 bg-black/60 rounded px-1">
                                <span className="text-white text-[9px] font-bold">VID</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Input row ─────────────────────────────────────────────── */}
                  <div className="flex items-end gap-2 px-4 py-3">
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    {/* Attach button */}
                    <button
                      ref={attachBtnRef}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-none w-9 h-9 mb-0.5 flex items-center justify-center rounded-full text-gray-400 hover:text-slate-600 hover:bg-gray-100 transition-colors"
                      title="แนบรูปภาพ / วิดีโอ"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>

                    {/* Auto-resize textarea (ไม่ disabled เพื่อให้ focus ไม่หลุด) */}
                    <div className="flex-1 relative">
                      <textarea
                        ref={textareaRef}
                        rows={1}
                        placeholder="พิมพ์ข้อความ..."
                        value={chatMessage}
                        onChange={(e) => {
                          setChatMessage(e.target.value);
                          autoResizeTextarea();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="w-full px-4 py-2.5 rounded-2xl bg-gray-100 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition resize-none leading-relaxed overflow-y-auto"
                        style={{ minHeight: "40px", maxHeight: "120px" }}
                      />
                    </div>

                    {/* Send button */}
                    <button
                      onClick={handleSendMessage}
                      disabled={(chatMessage.trim() === "" && attachmentFiles.length === 0) || isSendingMessage}
                      className={`flex-none w-9 h-9 mb-0.5 flex items-center justify-center rounded-full transition-all ${
                        (chatMessage.trim() || attachmentFiles.length > 0) && !isSendingMessage
                          ? "bg-slate-700 hover:bg-slate-800 text-white shadow-sm"
                          : "bg-gray-100 text-gray-300 cursor-not-allowed"
                      }`}
                      title="ส่ง"
                    >
                      {isSendingMessage ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </>
            );
          })()}

          {/* ── Empty state: ยังไม่เลือกห้อง ── */}
          {!selectedRoomId && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-500 text-base">เลือกการสนทนา</p>
                <p className="text-sm text-gray-400 mt-1">เลือกชื่อจากรายการเพื่อเริ่มแชท</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel — Conversation List */}
        <div className="w-75 min-w-[256px] max-w-[400px] flex flex-col border-l border-gray-100 bg-white h-full">
          {/* Header */}
          <div className="flex-none px-6 pt-8 pb-4">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
                {totalRealUnread > 0 && (
                  <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {totalRealUnread}
                  </span>
                )}
              </div>
              {/* New Chat Button */}
              <button
                onClick={() => setIsNewChatOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600"
                title="New message"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" strokeWidth="2" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-full bg-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>

            {/* Tabs — removed */}
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {roomsLoading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <svg className="w-6 h-6 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="text-xs text-gray-400">กำลังโหลด...</p>
              </div>
            ) : roomsError ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3 px-6 text-center">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500">โหลดไม่สำเร็จ</p>
                <button
                  onClick={fetchRooms}
                  className="text-xs text-slate-600 font-medium px-4 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  ลองใหม่
                </button>
              </div>
            ) : realRooms.filter((r) =>
                r.displayName.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2 px-6">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm">ยังไม่มีห้องแชท</p>
                <button
                  onClick={() => setIsNewChatOpen(true)}
                  className="text-xs text-slate-600 font-medium px-4 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors mt-1"
                >
                  + เริ่มแชทใหม่
                </button>
              </div>
            ) : (
              realRooms
                .filter((r) =>
                  r.displayName.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((room) => {
                  const isActive = selectedRoomId === room.id;
                  const avatarUrl = room.displayAvatar
                    ? apiService.getImageUrl(room.displayAvatar)
                    : null;

                  // ─── Last message preview text ───────────────────────────────────────────
                  let lastMsgText = "ยังไม่มีข้อความ";
                  if (room.lastMessage) {
                    const isSentByMe = room.lastMessage.senderId === currentUserId;
                    const content = room.lastMessage.content;

                    if (room.isGroup) {
                      const prefix = isSentByMe
                        ? "คุณ"
                        : (room.lastMessage.sender.firstName || "").trim() || "?";
                      lastMsgText = `${prefix}: ${content}`;
                    } else {
                      lastMsgText = isSentByMe ? `คุณ: ${content}` : content;
                    }
                  }

                  const timeLabel = room.lastMessage
                    ? formatRoomTime(room.lastMessage.createdAt)
                    : formatRoomTime(room.updatedAt);

                  return (
                    <button
                      key={room.id}
                      onClick={() => handleSelectRoom(room.id)}
                      className={`w-full flex items-center gap-3 px-5 py-3.5 transition-colors text-left ${
                        isActive ? "bg-gray-100" : "hover:bg-gray-50"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-none">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatarUrl}
                            alt={room.displayName}
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : room.isGroup ? (
                          <DefaultGroupAvatar size={48} />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src="/default-avatar.svg"
                            alt={room.displayName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        )}
                        {/* Group badge */}
                        {room.isGroup && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-slate-600 rounded-full flex items-center justify-center border-2 border-white">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                            </svg>
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-sm truncate ${isActive || room.unreadCount > 0 ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                            {room.displayName}
                          </span>
                          <span className="text-xs text-gray-400 flex-none ml-2">{timeLabel}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs truncate ${room.unreadCount > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                            {lastMsgText}
                          </p>
                          {room.unreadCount > 0 && (
                            <span className="ml-2 flex-none bg-blue-500 text-white text-xs font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                              {room.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
            )}
          </div>
        </div>
      </main>

      {/* ── Image Lightbox ────────────────────────────────────────────────────── */}
      {lightboxUrls.length > 0 && (
        <Lightbox
          urls={lightboxUrls}
          index={lightboxIndex}
          onClose={() => setLightboxUrls([])}
          onPrev={() => setLightboxIndex((i) => (i - 1 + lightboxUrls.length) % lightboxUrls.length)}
          onNext={() => setLightboxIndex((i) => (i + 1) % lightboxUrls.length)}
          onGoTo={(i) => setLightboxIndex(i)}
        />
      )}
    </div>
  );
}
