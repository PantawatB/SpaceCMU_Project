"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { apiService } from "@/lib/api";

// ─── Types (same as Chat page) ─────────────────────────────────────────────

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
  sender: { firstName: string; lastName: string };
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

interface RealMessage {
  id: string;
  roomId: string;
  senderId: string;
  receiverId: string | null;
  content: string;
  isRead: boolean;
  mediaUrls: string | null;
  mediaType: string | null;
  messageType: "text" | "system" | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  senderFirstName: string | null;
  senderLastName: string | null;
  senderAvatarUrl: string | null;
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

interface RoomReader {
  userId: string;
  lastReadAt: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
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

interface Suggestion {
  id: number;
  rawId: string;
  displayName: string;
  username: string;
  avatar: string;
}

interface MarketCardPayload {
  __type: "market_card";
  itemId?: string;
  title: string;
  price: string;
  description: string;
  imageUrl: string | null;
  imageUrls?: string[];
  sellerName?: string;
  sellerAvatarUrl?: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseMarketCard(content: string): MarketCardPayload | null {
  if (!content.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed.__type === "market_card") return parsed as MarketCardPayload;
  } catch { /* not JSON */ }
  return null;
}

function formatRoomTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffMin < 1) return "ตอนนี้";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay === 1) return "Yesterday";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (diffDay < 7) return days[date.getDay()];
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function DefaultGroupAvatar({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full bg-linear-to-br from-slate-500 to-slate-700 flex-none"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    </div>
  );
}

// ─── Mini Market Card (compact for chatbox) ────────────────────────────────

function MiniMarketCard({ card, isMine, senderName, senderAvatarUrl }: {
  card: MarketCardPayload;
  isMine: boolean;
  senderName?: string;
  senderAvatarUrl?: string | null;
}) {
  const [showModal, setShowModal] = useState(false);
  const [liveStatus, setLiveStatus] = useState<"available" | "sold" | "deleted" | "loading">(
    card.itemId ? "loading" : "available"
  );
  const images = useMemo(() => {
    if (card.imageUrls && card.imageUrls.length > 0) return card.imageUrls;
    if (card.imageUrl) return [card.imageUrl];
    return [];
  }, [card.imageUrls, card.imageUrl]);

  const resolvedSellerName = card.sellerName ?? senderName ?? "ผู้ขาย";
  const resolvedSellerAvatar = card.sellerAvatarUrl !== undefined
    ? (card.sellerAvatarUrl ?? "/default-avatar.svg")
    : (senderAvatarUrl ?? "/default-avatar.svg");

  const [modalIdx, setModalIdx] = useState(0);
  const total = images.length;

  // Fetch live status from API (getOptional returns null silently for 404/deleted items)
  useEffect(() => {
    if (!card.itemId) return;
    apiService.getOptional<{ status: string }>(`/api/market/items/${card.itemId}`)
      .then((data) => {
        if (data === null || data.status === "deleted") {
          setLiveStatus("deleted");
        } else {
          setLiveStatus(data.status === "sold" ? "sold" : "available");
        }
      })
      .catch(() => {
        setLiveStatus("available"); // fallback: show normally on network error
      });
  }, [card.itemId]);

  const isSold = liveStatus === "sold";
  const isDeleted = liveStatus === "deleted";

  return (
    <>
      {/* ── Card bubble ── */}
      <article className={`w-52 overflow-hidden rounded-xl transition-all ${
        isMine ? "bg-slate-600" : "bg-white border border-gray-100 shadow-sm"
      } ${(isSold || isDeleted) ? "opacity-75" : ""}`}>
        {/* Image */}
        <div className="w-full h-28 bg-gray-200 overflow-hidden relative">
          {images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[0]} alt={card.title}
              className={`w-full h-full object-cover transition-all ${(isSold || isDeleted) ? "brightness-50 grayscale" : ""}`}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${isMine ? "bg-slate-500" : "bg-gray-200"}`}>
              <svg className={`w-8 h-8 ${isMine ? "text-slate-400" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {total > 1 && !isSold && !isDeleted && (
            <span className="absolute bottom-1 right-1.5 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full">{total} รูป</span>
          )}
          {/* SOLD stamp */}
          {isSold && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-red-500 rounded px-2 py-0.5 rotate-[-18deg]">
                <span className="text-red-500 font-black tracking-[0.2em] text-sm uppercase" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>SOLD</span>
              </div>
            </div>
          )}
          {/* DELETED stamp */}
          {isDeleted && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-gray-400 rounded px-2 py-0.5 rotate-[-18deg]">
                <span className="text-gray-400 font-black tracking-[0.15em] text-xs uppercase">REMOVED</span>
              </div>
            </div>
          )}
        </div>
        {/* Info */}
        <div className="px-2.5 py-2">
          <p className={`font-semibold text-xs truncate ${isMine ? "text-white" : isDeleted ? "text-gray-400" : "text-gray-900"}`}>{card.title}</p>
          <p className={`text-[11px] font-bold mt-0.5 ${
            isDeleted ? "text-gray-400" :
            isSold ? (isMine ? "text-slate-400 line-through" : "text-gray-400 line-through") :
            isMine ? "text-orange-300" : "text-orange-600"
          }`}>฿{card.price}</p>
        </div>
        {/* Footer */}
        <div className={`flex items-center justify-between px-2.5 py-2 border-t ${isMine ? "border-slate-500" : "border-gray-100"}`}>
          <div className="flex items-center gap-1.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolvedSellerAvatar} alt={resolvedSellerName}
              className={`w-5 h-5 rounded-full object-cover border border-gray-200 flex-none ${(isSold || isDeleted) ? "grayscale" : ""}`}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }} />
            <span className={`text-[10px] font-medium truncate ${isMine ? "text-slate-200" : (isSold || isDeleted) ? "text-gray-400" : "text-gray-600"}`}>{resolvedSellerName}</span>
          </div>
          <button
            onClick={() => { setModalIdx(0); setShowModal(true); }}
            className={`text-[10px] font-semibold px-2 py-1 rounded-lg flex-none ml-1.5 transition-colors ${
              isDeleted ? "bg-gray-200 text-gray-400 cursor-pointer" :
              isSold ? "bg-gray-200 text-gray-500 cursor-pointer hover:bg-gray-300" :
              isMine ? "bg-white/15 hover:bg-white/25 text-white" : "bg-gray-900 hover:bg-gray-700 text-white"
            }`}
          >
            view
          </button>
        </div>
      </article>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="relative bg-white rounded-2xl shadow-2xl w-[900px] max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="flex flex-col md:flex-row h-full overflow-y-auto">
              {/* Left: images */}
              <div className="w-full md:w-1/2 bg-gray-50 p-8 flex items-center justify-center">
                <div className="w-full aspect-square max-w-md bg-white rounded-2xl overflow-hidden shadow-md relative flex items-center justify-center">
                  {images.length > 0 ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={images[modalIdx]} alt={card.title}
                        className={`w-full h-full object-contain ${(isSold || isDeleted) ? "brightness-60 grayscale" : ""}`}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      {/* SOLD overlay on modal image */}
                      {isSold && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="border-[3px] border-red-500 rounded-md px-5 py-2 rotate-[-18deg]">
                            <span className="text-red-500 font-black tracking-[0.3em] text-3xl uppercase" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>SOLD</span>
                          </div>
                        </div>
                      )}
                      {/* DELETED overlay on modal image */}
                      {isDeleted && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="border-[3px] border-gray-400 rounded-md px-5 py-2 rotate-[-18deg]">
                            <span className="text-gray-400 font-black tracking-[0.2em] text-2xl uppercase">REMOVED</span>
                          </div>
                        </div>
                      )}
                      {total > 1 && !isSold && !isDeleted && (
                        <>
                          <button onClick={() => setModalIdx((p) => (p === 0 ? total - 1 : p - 1))}
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2.5 shadow-lg transition-all hover:scale-110 z-10" aria-label="Previous">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                          </button>
                          <button onClick={() => setModalIdx((p) => (p === total - 1 ? 0 : p + 1))}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2.5 shadow-lg transition-all hover:scale-110 z-10" aria-label="Next">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                          </button>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm z-10">{modalIdx + 1} / {total}</div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <svg className="w-32 h-32 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                  )}
                </div>
              </div>
              {/* Right: details */}
              <div className="w-full md:w-1/2 p-8 flex flex-col">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <h2 className={`text-3xl font-bold ${isDeleted ? "text-gray-400" : "text-gray-900"}`}>{card.title}</h2>
                    {isSold && (
                      <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold tracking-widest uppercase">SOLD</span>
                    )}
                    {isDeleted && (
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-bold tracking-widest uppercase">ถูกลบแล้ว</span>
                    )}
                  </div>
                  <span className={`text-4xl font-bold ${isDeleted ? "text-gray-400 line-through" : isSold ? "text-gray-400 line-through" : "text-orange-600"}`}>฿{card.price}</span>
                </div>
                {isDeleted ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <p className="text-gray-500 font-medium">สินค้านี้ถูกลบออกจากตลาดแล้ว</p>
                    <p className="text-gray-400 text-sm">ผู้ขายได้นำสินค้าออกจากระบบ</p>
                  </div>
                ) : (
                  <>
                    <div className="border-t border-gray-200 my-6" />
                    <div className="mb-6 flex-1">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">รายละเอียดสินค้า</h3>
                      <p className={`leading-relaxed whitespace-pre-line ${isSold ? "text-gray-400" : "text-gray-700"}`}>{card.description}</p>
                    </div>
                    <div className="border-t border-gray-200 my-6" />
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">ผู้ขาย</h3>
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full overflow-hidden border-2 flex-none ${isSold ? "border-gray-200 grayscale" : "border-gray-200"}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={resolvedSellerAvatar} alt={resolvedSellerName} className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }} />
                        </div>
                        <div>
                          <p className={`font-semibold ${isSold ? "text-gray-400" : "text-gray-900"}`}>{resolvedSellerName}</p>
                          <p className="text-sm text-gray-500">ผู้ขาย</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                <div className="mt-auto text-center"><p className="text-xs text-gray-400">🛍️ สินค้าจากตลาด SpaceCMU</p></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Chatbox Component ────────────────────────────────────────────────

const Chatbox = () => {
  // ── UI state ──────────────────────────────────────────────────────────────
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  // Pending DM: open a chat UI for a user without creating a room yet
  const [pendingDmUser, setPendingDmUser] = useState<{
    id: string;
    displayName: string;
    avatarUrl: string | null;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const [selectedSuggestions, setSelectedSuggestions] = useState<number[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsError, setSuggestionsError] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [createChatError, setCreateChatError] = useState<string | null>(null);
  const [isGroupNameOpen, setIsGroupNameOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupAvatarFile, setGroupAvatarFile] = useState<File | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | null>(null);
  const [lightboxUrls, setLightboxUrls] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // ── Message edit/delete state ─────────────────────────────────────────────
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // ── Confirm dialog state ──────────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // ── Data state ────────────────────────────────────────────────────────────
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<ChatRoomApiItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState(false);
  const [messages, setMessages] = useState<RealMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<MessagePagination | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [readers, setReaders] = useState<RoomReader[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<{ url: string; type: string }[]>([]);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const selectedRoomIdRef = useRef<string | null>(null);
  const isLoadingMoreRef = useRef(false);
  const prevMsgCountRef = useRef(0);

  useEffect(() => { selectedRoomIdRef.current = selectedRoomId; }, [selectedRoomId]);

  // ── fetch current user ────────────────────────────────────────────────────
  useEffect(() => {
    apiService.get<{ activeUser: { id: string } }>("/api/users/me")
      .then((d) => setCurrentUserId(d.activeUser?.id ?? null))
      .catch(() => {});
  }, []);

  // ── fetch rooms ───────────────────────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    setRoomsLoading(true); setRoomsError(false);
    try { setRooms(await apiService.get<ChatRoomApiItem[]>("/api/chat-rooms/me")); }
    catch { setRoomsError(true); }
    finally { setRoomsLoading(false); }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // ── fetch messages ────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (roomId: string, page = 1, prepend = false) => {
    if (page === 1) { setMessagesLoading(true); setMessagesError(false); }
    else { setIsLoadingMore(true); }
    try {
      const data = await apiService.get<GetRoomMessagesResponse>(`/api/messages/room/${roomId}?limit=40&page=${page}`);
      if (prepend) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          return [...data.messages.filter((m) => !ids.has(m.id)), ...prev];
        });
      } else {
        setMessages(data.messages);
      }
      setPagination(data.pagination);
    } catch { if (page === 1) setMessagesError(true); }
    finally {
      if (page === 1) setMessagesLoading(false);
      else setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedRoomId) return;
    setMessages([]); setPagination(null); setReaders([]);
    fetchMessages(selectedRoomId, 1, false);
  }, [selectedRoomId, fetchMessages]);

  // ── polling every 5s ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedRoomId) return;

    const markRead = async (roomId: string) => {
      try { await apiService.patch(`/api/messages/room/${roomId}/read`, {}); } catch { /* ignore */ }
    };
    const fetchReaders = async (roomId: string) => {
      try { setReaders(await apiService.get<RoomReader[]>(`/api/messages/room/${roomId}/readers`)); }
      catch { /* ignore */ }
    };
    const markAndFetch = async (roomId: string) => {
      await markRead(roomId);
      await fetchReaders(roomId);
    };

    markAndFetch(selectedRoomId);

    const interval = setInterval(() => {
      const roomId = selectedRoomIdRef.current;
      if (!roomId) return;
      markAndFetch(roomId);
      apiService.get<GetRoomMessagesResponse>(`/api/messages/room/${roomId}?limit=40&page=1`)
        .then(async (data) => {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const newOnes = data.messages.filter((m) => !ids.has(m.id));
            const updated = prev.map((m) => {
              const fetched = data.messages.find((fm) => fm.id === m.id);
              return fetched && fetched.editedAt !== m.editedAt ? { ...m, content: fetched.content, editedAt: fetched.editedAt } : m;
            });
            if (newOnes.length > 0) requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }));
            if (newOnes.length === 0 && updated === prev) return prev;
            const merged = [...updated, ...newOnes];
            const seen = new Set<string>();
            return merged.filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          });
          await markAndFetch(roomId);
        }).catch(() => {});
    }, 5000);

    const onVisibility = () => {
      const roomId = selectedRoomIdRef.current;
      if (roomId && !document.hidden) markAndFetch(roomId);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisibility); };
  }, [selectedRoomId]);

  // ── scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    if (messagesLoading) return;
    if (isLoadingMoreRef.current) return; // กำลังโหลดข้อความเก่า ไม่ scroll
    if (selectedRoomId && messages.length > 0) messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messagesLoading, selectedRoomId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const prev = prevMsgCountRef.current;
    prevMsgCountRef.current = messages.length;
    if (isLoadingMoreRef.current) return; // กำลังโหลดข้อความเก่า → ไม่ scroll
    if (messages.length === 0) return;
    if (messages.length > prev && prev > 0) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── scroll load more ──────────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current || !selectedRoomId || !pagination) return;
    const el = messagesContainerRef.current;
    if (el.scrollTop <= 60 && !isLoadingMore && pagination.page < pagination.totalPages) {
      const prevH = el.scrollHeight;
      isLoadingMoreRef.current = true; // block scroll-to-bottom ก่อน fetch
      fetchMessages(selectedRoomId, pagination.page + 1, true).then(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevH;
          isLoadingMoreRef.current = false;
        }));
      });
    }
  }, [selectedRoomId, isLoadingMore, pagination, fetchMessages]);

  // ── select room ───────────────────────────────────────────────────────────
  const handleSelectRoom = useCallback((roomId: string) => {
    setSelectedRoomId(roomId);
    setActiveMessageMenu(null); setEditingMessageId(null);
    apiService.patch(`/api/messages/room/${roomId}/read`, {}).catch(() => {});
    setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, unreadCount: 0 } : r));
  }, []);

  // ── suggestions (new chat modal) ──────────────────────────────────────────
  const fetchSuggestions = useCallback(async (query: string) => {
    setSuggestionsError(false);
    try {
      const endpoint = query.trim() === "" ? "/api/friends/me" : `/api/users/search?query=${encodeURIComponent(query.trim())}`;
      const data = await apiService.get<FriendApiItem[]>(endpoint);
      setSuggestions(data.slice(0, 10).map((f) => ({
        id: parseInt(f.id.replace(/-/g, "").slice(0, 8), 16),
        rawId: f.id,
        displayName: `${f.firstName} ${f.lastName}`.trim() || f.username,
        username: f.username,
        avatar: f.avatarUrl ? (apiService.getImageUrl(f.avatarUrl) ?? "") : "",
      })));
    } catch { setSuggestionsError(true); }
  }, []);

  useEffect(() => {
    if (!isNewChatOpen) return;
    const id = setTimeout(() => fetchSuggestions(""), 0);
    return () => clearTimeout(id);
  }, [isNewChatOpen, fetchSuggestions]);

  useEffect(() => {
    if (!isNewChatOpen) return;
    const t = setTimeout(() => fetchSuggestions(newChatSearch), 300);
    return () => clearTimeout(t);
  }, [newChatSearch, isNewChatOpen, fetchSuggestions]);

  // ── create direct room ────────────────────────────────────────────────────
  const handleCreateDirectRoom = async () => {
    const sel = suggestions.find((s) => selectedSuggestions.includes(s.id));
    if (!sel) return;
    setIsCreatingChat(true); setCreateChatError(null);
    try {
      const r = await apiService.post<{ room: { id: string } }>("/api/chat-rooms/direct", { otherUserId: sel.rawId });
      setIsNewChatOpen(false); setNewChatSearch(""); setSelectedSuggestions([]);
      await fetchRooms();
      if (r?.room?.id) { setSelectedRoomId(r.room.id); }
    } catch { setCreateChatError("ไม่สามารถสร้างแชทได้"); }
    finally { setIsCreatingChat(false); }
  };

  // ── create group room ─────────────────────────────────────────────────────
  const handleCreateGroupRoom = async () => {
    if (!groupName.trim()) return;
    const memberIds = suggestions.filter((s) => selectedSuggestions.includes(s.id)).map((s) => s.rawId);
    setIsCreatingChat(true); setCreateChatError(null);
    try {
      let result: { room: { id: string } } | null = null;
      if (groupAvatarFile) {
        const fd = new FormData();
        fd.append("name", groupName.trim());
        memberIds.forEach((id) => fd.append("memberIds", id));
        fd.append("avatar", groupAvatarFile);
        result = await apiService.postFormData<{ room: { id: string } }>("/api/chat-rooms/group", fd);
      } else {
        result = await apiService.post<{ room: { id: string } }>("/api/chat-rooms/group", { name: groupName.trim(), memberIds });
      }
      setIsGroupNameOpen(false); setGroupName(""); setGroupAvatarFile(null); setGroupAvatarPreview(null);
      setIsNewChatOpen(false); setNewChatSearch(""); setSelectedSuggestions([]);
      await fetchRooms();
      if (result?.room?.id) { setSelectedRoomId(result.room.id); }
    } catch { setCreateChatError("ไม่สามารถสร้างกลุ่มได้"); }
    finally { setIsCreatingChat(false); }
  };

  const handleGroupAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGroupAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setGroupAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleChatButtonClick = () => {
    if (selectedSuggestions.length === 1) {
      handleCreateDirectRoom();
    } else if (selectedSuggestions.length >= 2) {
      setGroupName(""); setCreateChatError(null); setIsGroupNameOpen(true);
    }
  };

  // ── message edit ──────────────────────────────────────────────────────────
  const handleStartEdit = (msg: RealMessage) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
    setActiveMessageMenu(null);
    setTimeout(() => {
      editInputRef.current?.focus();
      const len = msg.content.length;
      editInputRef.current?.setSelectionRange(len, len);
    }, 50);
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editingContent.trim() || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      const updated = await apiService.patch<RealMessage>(`/api/messages/${messageId}`, { content: editingContent.trim() });
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, content: updated.content, editedAt: updated.editedAt } : m));
      setEditingMessageId(null); setEditingContent("");
    } catch { /* keep edit open */ }
    finally { setIsSavingEdit(false); }
  };

  const handleCancelEdit = () => { setEditingMessageId(null); setEditingContent(""); };

  // ── message delete ────────────────────────────────────────────────────────
  const handleDeleteMessage = (messageId: string) => {
    setActiveMessageMenu(null);
    setConfirmDialog({
      title: "ลบข้อความ",
      message: "ต้องการลบข้อความนี้หรือไม่?",
      confirmLabel: "ลบ",
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const result = await apiService.delete<{ success: boolean; messageId: string; systemMessage: RealMessage }>(`/api/messages/${messageId}`);
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== messageId);
            if (result.systemMessage) {
              if (filtered.some((m) => m.id === result.systemMessage.id)) return filtered;
              return [...filtered, result.systemMessage];
            }
            return filtered;
          });
        } catch {
          setConfirmDialog({
            title: "เกิดข้อผิดพลาด",
            message: "ไม่สามารถลบข้อความได้ กรุณาลองใหม่",
            confirmLabel: "ตกลง",
            onConfirm: () => setConfirmDialog(null),
          });
        }
      },
    });
  };

  // ── send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    const hasText = chatMessage.trim().length > 0;
    const hasFiles = attachmentFiles.length > 0;
    if (!hasText && !hasFiles) return;
    if (isSending) return;

    // ── Pending DM: create room on first message ──────────────────────────
    if (!selectedRoomId && pendingDmUser) {
      const text = chatMessage.trim();
      const files = [...attachmentFiles];
      const previews = [...attachmentPreviews];
      setChatMessage(""); setAttachmentFiles([]); setAttachmentPreviews([]);
      if (textareaRef.current) { textareaRef.current.style.height = "auto"; textareaRef.current.focus(); }
      setIsSending(true);
      try {
        const r = await apiService.post<{ room: { id: string } }>("/api/chat-rooms/direct", {
          otherUserId: pendingDmUser.id,
        });
        const roomId = r?.room?.id;
        if (!roomId) throw new Error("ไม่สามารถสร้างห้องแชทได้");
        await fetchRooms();
        setPendingDmUser(null);
        setSelectedRoomId(roomId);
        apiService.patch(`/api/messages/room/${roomId}/read`, {}).catch(() => {});
        // Send the message(s)
        const addMsg = (msg: RealMessage) => {
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          setRooms((prev) => prev.map((r2) => r2.id === roomId ? {
            ...r2,
            lastMessage: { id: msg.id, senderId: msg.senderId, content: msg.content || "📷 Media", createdAt: msg.createdAt, sender: { firstName: "", lastName: "" } },
            updatedAt: msg.createdAt,
          } : r2));
        };
        const imgs = files.filter((f) => !f.type.startsWith("video/"));
        const vids = files.filter((f) => f.type.startsWith("video/"));
        if (imgs.length > 0) {
          const fd = new FormData(); fd.append("content", ""); imgs.forEach((f) => fd.append("media", f));
          addMsg(await apiService.postFormData<RealMessage>(`/api/messages/room/${roomId}/media`, fd));
        }
        for (const vf of vids) {
          const fd = new FormData(); fd.append("content", ""); fd.append("media", vf);
          addMsg(await apiService.postFormData<RealMessage>(`/api/messages/room/${roomId}/media`, fd));
        }
        if (hasText) addMsg(await apiService.post<RealMessage>("/api/messages", { roomId, content: text }));
        previews.forEach((p) => URL.revokeObjectURL(p.url));
      } catch {
        setChatMessage(text); setAttachmentFiles(files); setAttachmentPreviews(previews);
      } finally { setIsSending(false); }
      return;
    }

    if (!selectedRoomId) return;

    const text = chatMessage.trim();
    const files = [...attachmentFiles];
    const previews = [...attachmentPreviews];
    setChatMessage(""); setAttachmentFiles([]); setAttachmentPreviews([]);
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; textareaRef.current.focus(); }

    setIsSending(true);
    try {
      const addMsg = (msg: RealMessage) => {
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
        setRooms((prev) => prev.map((r) => r.id === selectedRoomId ? {
          ...r,
          lastMessage: { id: msg.id, senderId: msg.senderId, content: msg.content || "📷 Media", createdAt: msg.createdAt, sender: { firstName: "", lastName: "" } },
          updatedAt: msg.createdAt,
        } : r));
      };
      const imgs = files.filter((f) => !f.type.startsWith("video/"));
      const vids = files.filter((f) => f.type.startsWith("video/"));
      if (imgs.length > 0) {
        const fd = new FormData(); fd.append("content", ""); imgs.forEach((f) => fd.append("media", f));
        addMsg(await apiService.postFormData<RealMessage>(`/api/messages/room/${selectedRoomId}/media`, fd));
      }
      for (const vf of vids) {
        const fd = new FormData(); fd.append("content", ""); fd.append("media", vf);
        addMsg(await apiService.postFormData<RealMessage>(`/api/messages/room/${selectedRoomId}/media`, fd));
      }
      if (hasText) addMsg(await apiService.post<RealMessage>("/api/messages", { roomId: selectedRoomId, content: text }));
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    } catch {
      setChatMessage(text); setAttachmentFiles(files); setAttachmentPreviews(previews);
    } finally { setIsSending(false); }
  };

  // ── file attachment ───────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    if (!incoming.length) return;
    const accepted = incoming.slice(0, 10 - attachmentFiles.length);
    setAttachmentFiles((p) => [...p, ...accepted]);
    setAttachmentPreviews((p) => [...p, ...accepted.map((f) => ({ url: URL.createObjectURL(f), type: f.type.startsWith("video/") ? "video" : "image" }))]);
    e.target.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachmentFiles((p) => p.filter((_, i) => i !== idx));
    setAttachmentPreviews((p) => { URL.revokeObjectURL(p[idx].url); return p.filter((_, i) => i !== idx); });
  };

  // ── open direct chat (triggered by global event) ──────────────────────────
  const openDirectChat = useCallback(async (targetUserId: string) => {
    // If there is already a direct room with this user, open it
    const existingRoom = rooms.find(
      (r) =>
        !r.isGroup &&
        r.members.length === 2 &&
        r.members.some((m) => m.userId === targetUserId)
    );
    if (existingRoom) {
      setIsChatOpen(true);
      setPendingDmUser(null);
      handleSelectRoom(existingRoom.id);
      return;
    }
    // No existing room — open a "pending DM" chat view without creating a room yet
    // Fetch the target user's info to show their name/avatar
    try {
      const userData = await apiService.get<{
        id: string;
        firstName?: string;
        lastName?: string;
        avatarUrl?: string | null;
      }>(`/api/users/${targetUserId}`);
      const displayName = [userData.firstName, userData.lastName].filter(Boolean).join(" ") || "ผู้ใช้";
      setIsChatOpen(true);
      setSelectedRoomId(null);
      setPendingDmUser({
        id: targetUserId,
        displayName,
        avatarUrl: userData.avatarUrl ?? null,
      });
    } catch {
      // Fallback: create room immediately if we can't fetch user info
      try {
        const r = await apiService.post<{ room: { id: string } }>("/api/chat-rooms/direct", {
          otherUserId: targetUserId,
        });
        await fetchRooms();
        if (r?.room?.id) {
          setIsChatOpen(true);
          setSelectedRoomId(r.room.id);
          apiService.patch(`/api/messages/room/${r.room.id}/read`, {}).catch(() => {});
        }
      } catch { /* ignore */ }
    }
  }, [rooms, fetchRooms, handleSelectRoom]);

  // Listen for openDirectChat custom event fired from other pages
  useEffect(() => {
    const handler = (e: Event) => {
      const userId = (e as CustomEvent<string>).detail;
      if (userId) openDirectChat(userId);
    };
    window.addEventListener("openDirectChat", handler);
    return () => window.removeEventListener("openDirectChat", handler);
  }, [openDirectChat]);

  // ── derived ───────────────────────────────────────────────────────────────
  const totalUnread = rooms.reduce((s, r) => s + r.unreadCount, 0);
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const roomAvatarUrl = selectedRoom?.displayAvatar ? apiService.getImageUrl(selectedRoom.displayAvatar) : null;
  const IS_VIDEO = /\.(mp4|webm|ogg|mov|avi|m4v|3gp|flv|wmv)$/i;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating button (collapsed) ────────────────────────────────────── */}
      {!isChatOpen && !selectedRoomId && (
        <div className="fixed bottom-6 right-6 z-50">
          {/* Large screen: Messages pill bar */}
          <button
            onClick={() => setIsChatOpen(true)}
            className="hidden md:flex items-center gap-4 bg-white shadow-2xl border border-gray-200 rounded-2xl px-8 py-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-blue-500 flex-none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            <span className="font-bold text-gray-800 text-base">Messages</span>
            {totalUnread > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalUnread > 99 ? "99+" : totalUnread}</span>
            )}
            <svg className="w-5 h-5 text-gray-400 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
          </button>
          {/* Small screen: circle button */}
          <button
            onClick={() => setIsChatOpen(true)}
            className="md:hidden w-14 h-14 rounded-full bg-white shadow-2xl flex items-center justify-center border border-gray-200 hover:scale-110 transition-all duration-200 active:scale-95 relative"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-blue-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{totalUnread > 99 ? "99+" : totalUnread}</span>
            )}
          </button>
        </div>
      )}

      {/* ── Chat List panel ────────────────────────────────────────────────── */}
      {isChatOpen && !selectedRoomId && (
        <div className="fixed bottom-6 right-6 z-50 w-80 h-[480px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800">Messages</span>
              {totalUnread > 0 && <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalUnread}</span>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsNewChatOpen(true)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="New message">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
              <button onClick={() => setIsChatOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="flex-none px-3 py-2 border-b border-gray-50">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth="2" /><line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" /></svg>
              </span>
              <input type="text" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-full bg-gray-100 text-xs placeholder-gray-400 focus:outline-none" />
            </div>
          </div>

          {/* Room list */}
          <div className="flex-1 overflow-y-auto">
            {roomsLoading ? (
              <div className="flex items-center justify-center h-full">
                <svg className="w-5 h-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
              </div>
            ) : roomsError ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <p className="text-xs text-gray-500">โหลดไม่สำเร็จ</p>
                <button onClick={fetchRooms} className="text-xs text-slate-600 px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50">ลองใหม่</button>
              </div>
            ) : rooms.filter((r) => r.displayName.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                <p className="text-xs">ยังไม่มีแชท</p>
                <button onClick={() => setIsNewChatOpen(true)} className="text-xs text-slate-600 px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50">+ เริ่มใหม่</button>
              </div>
            ) : (
              rooms.filter((r) => r.displayName.toLowerCase().includes(searchQuery.toLowerCase())).map((room) => {
                const av = room.displayAvatar ? apiService.getImageUrl(room.displayAvatar) : null;
                let lastText = "ยังไม่มีข้อความ";
                if (room.lastMessage) {
                  const isMe = room.lastMessage.senderId === currentUserId;
                  const content = parseMarketCard(room.lastMessage.content) ? "🛍️ สินค้า" : room.lastMessage.content;
                  lastText = isMe ? `คุณ: ${content}` : content;
                }
                const timeLabel = room.lastMessage ? formatRoomTime(room.lastMessage.createdAt) : formatRoomTime(room.updatedAt);
                return (
                  <button key={room.id} onClick={() => handleSelectRoom(room.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50">
                    <div className="relative flex-none">
                      {av ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={av} alt={room.displayName} className="w-10 h-10 rounded-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      ) : room.isGroup ? <DefaultGroupAvatar size={40} /> : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src="/default-avatar.svg" alt="" className="w-10 h-10 rounded-full" />
                      )}
                      {room.isGroup && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-slate-600 rounded-full flex items-center justify-center border border-white">
                          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-sm truncate ${room.unreadCount > 0 ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>{room.displayName}</span>
                        <span className="text-[10px] text-gray-400 flex-none ml-1">{timeLabel}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-xs truncate ${room.unreadCount > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>{lastText}</p>
                        {room.unreadCount > 0 && (
                          <span className="ml-1 flex-none bg-blue-500 text-white text-[10px] font-bold min-w-4 h-4 rounded-full flex items-center justify-center px-1">{room.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── Individual Chat View ──────────────────────────────────────────── */}
      {(selectedRoomId || pendingDmUser) && (
        <div className="fixed bottom-6 right-6 z-50 w-80 h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-none flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => { setSelectedRoomId(null); setPendingDmUser(null); setIsChatOpen(true); }} className="flex-none w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <div className="relative flex-none">
                {pendingDmUser ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pendingDmUser.avatarUrl ? (apiService.getImageUrl(pendingDmUser.avatarUrl) ?? "/default-avatar.svg") : "/default-avatar.svg"}
                    alt="" className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }} />
                ) : roomAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={roomAvatarUrl} alt="" className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }} />
                ) : selectedRoom?.isGroup ? <DefaultGroupAvatar size={32} /> : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/default-avatar.svg" alt="" className="w-8 h-8 rounded-full" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate leading-tight">
                  {pendingDmUser ? pendingDmUser.displayName : (selectedRoom?.displayName ?? "...")}
                </p>
                {!pendingDmUser && selectedRoom?.isGroup && <p className="text-[10px] text-gray-400">{selectedRoom.memberCount} สมาชิก</p>}
              </div>
            </div>
            <button onClick={() => { setSelectedRoomId(null); setPendingDmUser(null); setIsChatOpen(false); }}
              className="flex-none w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 bg-gray-50" onClick={() => setActiveMessageMenu(null)}>
            {/* Pending DM: show empty state prompt */}
            {pendingDmUser && !selectedRoomId ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 px-4 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pendingDmUser.avatarUrl ? (apiService.getImageUrl(pendingDmUser.avatarUrl) ?? "/default-avatar.svg") : "/default-avatar.svg"}
                  alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md mb-1"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }} />
                <p className="text-xs font-semibold text-gray-700">{pendingDmUser.displayName}</p>
                <p className="text-[11px] text-gray-400">ยังไม่มีการสนทนา<br />เริ่มส่งข้อความแรกได้เลย!</p>
              </div>
            ) : (
              <>
            {/* Loading more indicator */}
            {isLoadingMore && (
              <div className="flex justify-center py-2">
                <svg className="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
              </div>
            )}
            {/* End of history indicator */}
            {!isLoadingMore && pagination && pagination.page >= pagination.totalPages && messages.length > 0 && (
              <div className="flex justify-center py-2">
                <span className="text-[10px] text-gray-300">— เริ่มต้นการสนทนา —</span>
              </div>
            )}
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <svg className="w-5 h-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
              </div>
            ) : messagesError ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <p className="text-xs text-gray-500">โหลดไม่สำเร็จ</p>
                <button onClick={() => selectedRoomId && fetchMessages(selectedRoomId, 1, false)} className="text-xs text-slate-600 px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50">ลองใหม่</button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-1">
                <p className="text-xs">ยังไม่มีข้อความ</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMine = msg.senderId === currentUserId;
                const prevMsgRaw = messages[idx - 1];
                const isSystem = msg.messageType === "system";

                // Date divider
                const msgDay = new Date(msg.createdAt).toDateString();
                const prevDay = prevMsgRaw ? new Date(prevMsgRaw.createdAt).toDateString() : null;
                const showDateDivider = prevDay !== msgDay;
                const dateDividerLabel = (() => {
                  const d = new Date(msg.createdAt);
                  const today = new Date();
                  const yesterday = new Date(today);
                  yesterday.setDate(today.getDate() - 1);
                  if (d.toDateString() === today.toDateString()) return "วันนี้";
                  if (d.toDateString() === yesterday.toDateString()) return "เมื่อวาน";
                  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
                })();

                if (isSystem) {
                  return (
                    <React.Fragment key={msg.id}>
                      {showDateDivider && (
                        <div className="flex items-center gap-2 my-1">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-[10px] text-gray-400 px-2">{dateDividerLabel}</span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                      )}
                      <div className="flex items-center gap-2 my-1">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-[10px] text-gray-400 px-2">{msg.content}</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                    </React.Fragment>
                  );
                }

                const prevMsg = messages.slice(0, idx).reverse().find((m) => m.messageType !== "system");
                const nextMsg = messages.slice(idx + 1).find((m) => m.messageType !== "system");
                const TIME_GAP = 60 * 1000;
                const prevDiff = prevMsg ? new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() : Infinity;
                const nextDiff = nextMsg ? new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime() : Infinity;
                const isFirst = !prevMsg || prevMsg.senderId !== msg.senderId || prevDiff > TIME_GAP;
                const isLast = !nextMsg || nextMsg.senderId !== msg.senderId || nextDiff > TIME_GAP;
                const showAvatar = !isMine && (isLast || editingMessageId === msg.id);
                const showTime = isLast;
                const showSenderName = !isMine && selectedRoom?.isGroup && isFirst;

                const senderMember = selectedRoom?.members.find((m) => m.userId === msg.senderId);
                const senderAv = senderMember?.avatarUrl
                  ? apiService.getImageUrl(senderMember.avatarUrl)
                  : msg.senderAvatarUrl ? apiService.getImageUrl(msg.senderAvatarUrl) : null;
                const senderName = senderMember
                  ? `${senderMember.firstName} ${senderMember.lastName}`.trim()
                  : `${msg.senderFirstName ?? ""} ${msg.senderLastName ?? ""}`.trim() || "ผู้ใช้";

                const msgTime = new Date(msg.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });

                const isLastMine = isMine && !messages.slice(idx + 1).some((m) => m.senderId === currentUserId);
                const msgMs = new Date(msg.createdAt).getTime();
                const seenReaders = isLastMine
                  ? readers.filter((r) => r.userId !== currentUserId && r.lastReadAt && new Date(r.lastReadAt).getTime() >= msgMs)
                  : [];
                const lastMsgIsMe = messages.length > 0 && messages[messages.length - 1].senderId === currentUserId;
                const showSeen = lastMsgIsMe && isLastMine && seenReaders.length > 0;
                const showSent = lastMsgIsMe && isLastMine && seenReaders.length === 0;
                const marginTop = isFirst ? "mt-2.5" : "mt-0.5";
                const isEditing = editingMessageId === msg.id;
                const canEdit = isMine && !parseMarketCard(msg.content) && !msg.mediaUrls;

                return (
                  <React.Fragment key={msg.id}>
                    {showDateDivider && (
                      <div className="flex items-center gap-2 my-1">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-[10px] text-gray-400 px-2">{dateDividerLabel}</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                    )}
                  <div className={`flex flex-col ${isMine ? "items-end" : "items-start"} ${marginTop}`}>
                    <div className={`flex items-end gap-1.5 w-full ${isMine ? "justify-end" : "justify-start"}`}>
                      {/* Avatar */}
                      {!isMine && (
                        <div className="w-6 h-6 flex-none self-end">
                          {showAvatar ? (
                            senderAv ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={senderAv} alt={senderName} className="w-6 h-6 rounded-full object-cover"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }} />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src="/default-avatar.svg" alt="" className="w-6 h-6 rounded-full" />
                            )
                          ) : <div className="w-6 h-6" />}
                        </div>
                      )}

                      {/* Bubble + menu */}
                      <div className={`max-w-[75%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                        {showSenderName && (
                          <span className="text-[10px] text-gray-400 mb-0.5 px-1">{senderName}</span>
                        )}

                        {/* Edit/Delete action buttons (own messages, click to toggle) */}
                        {isMine && activeMessageMenu === msg.id && editingMessageId !== msg.id && (
                          <div className="flex items-center gap-1 mb-1 self-end">
                            {canEdit && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStartEdit(msg); }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                แก้ไข
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 hover:bg-red-100 text-red-500 text-[11px] font-medium transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              ลบ
                            </button>
                          </div>
                        )}

                        {isEditing ? (
                          /* Edit mode */
                          <div className="w-full flex flex-col gap-1.5">
                            <textarea
                              ref={editInputRef}
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit(msg.id); }
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                              rows={1}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none leading-relaxed"
                              style={{ minHeight: "40px", maxHeight: "120px", minWidth: "180px" }}
                            />
                            <div className="flex items-center gap-1.5 self-end">
                              <button onClick={handleCancelEdit}
                                className="px-3 py-1 rounded-full text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">ยกเลิก</button>
                              <button onClick={() => handleSaveEdit(msg.id)} disabled={!editingContent.trim() || isSavingEdit}
                                className="px-3 py-1 rounded-full text-xs font-medium text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1">
                                {isSavingEdit && <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>}
                                บันทึก
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`overflow-hidden ${isMine
                              ? `bg-slate-700 text-white cursor-pointer select-none ${isFirst && isLast ? "rounded-2xl rounded-br-sm" : isFirst ? "rounded-2xl rounded-br-md" : isLast ? "rounded-2xl rounded-tr-md rounded-br-sm" : "rounded-xl rounded-r-md"}`
                              : `bg-white text-gray-800 shadow-sm border border-gray-100 ${isFirst && isLast ? "rounded-2xl rounded-bl-sm" : isFirst ? "rounded-2xl rounded-bl-md" : isLast ? "rounded-2xl rounded-tl-md rounded-bl-sm" : "rounded-xl rounded-l-md"}`
                            }`}
                            onClick={(e) => {
                              if (!isMine) return;
                              e.stopPropagation();
                              setActiveMessageMenu((prev) => prev === msg.id ? null : msg.id);
                            }}
                          >
                            {/* Media */}
                            {msg.mediaUrls && (() => {
                              let fnames: string[] = [];
                              try { fnames = JSON.parse(msg.mediaUrls); } catch { /* ignore */ }
                              if (!fnames.length) return null;
                              const imgFnames = fnames.filter((f) => !IS_VIDEO.test(f));
                              const vidFnames = fnames.filter((f) => IS_VIDEO.test(f));
                              const imgUrls = imgFnames.map((f) => apiService.getImageUrl(f.startsWith("/uploads/") ? f : `/uploads/${f}`) ?? "");
                              const gridClass = imgFnames.length === 1 ? "grid-cols-1" : imgFnames.length === 2 ? "grid-cols-2" : "grid-cols-3";
                              const cellH = imgFnames.length === 1 ? 160 : imgFnames.length === 2 ? 110 : 80;
                              return (
                                <>
                                  {imgUrls.length > 0 && (
                                    <div className={`grid gap-0.5 ${gridClass}`}>
                                      {imgUrls.map((u, mi) => (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img key={mi} src={u} alt="" className="w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                          style={{ height: cellH }}
                                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                          onClick={() => { setLightboxUrls(imgUrls); setLightboxIndex(mi); }} />
                                      ))}
                                    </div>
                                  )}
                                  {vidFnames.map((f, vi) => {
                                    const vUrl = apiService.getImageUrl(f.startsWith("/uploads/") ? f : `/uploads/${f}`) ?? "";
                                    return <div key={vi} className={imgUrls.length > 0 || vi > 0 ? "mt-0.5" : ""}><video src={vUrl} controls className="w-full block" style={{ maxHeight: 160, minHeight: 80, objectFit: "contain", background: "#000" }} /></div>;
                                  })}
                                </>
                              );
                            })()}
                            {/* Market card or text */}
                            {msg.content && (() => {
                              const card = parseMarketCard(msg.content);
                              if (card) {
                                const snFull = [msg.senderFirstName, msg.senderLastName].filter(Boolean).join(" ") || undefined;
                                const snAv = msg.senderAvatarUrl ? (apiService.getImageUrl(msg.senderAvatarUrl) ?? msg.senderAvatarUrl) : null;
                                return <MiniMarketCard card={card} isMine={isMine} senderName={snFull} senderAvatarUrl={snAv} />;
                              }
                              return (
                                <p className="px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
                                  {msg.content}
                                </p>
                              );
                            })()}
                            {!msg.content && msg.mediaUrls && <div />}
                          </div>
                        )}

                        {/* Edited label */}
                        {msg.editedAt && editingMessageId !== msg.id && (
                          <span className={`text-[10px] text-gray-400 italic px-1 mt-0.5 ${isMine ? "self-end" : "self-start"}`}>แก้ไขแล้ว</span>
                        )}

                        {/* Time + Sent/Seen */}
                        {showTime && !isEditing && (
                          <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                            <span className="text-[10px] text-gray-400">{msgTime}</span>
                            {showSent && (
                              <div className="flex items-center gap-0.5">
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                <span className="text-[10px] text-gray-400">Sent</span>
                              </div>
                            )}
                            {showSeen && <span className="text-[10px] text-gray-400">Seen</span>}
                          </div>
                        )}
                        {/* Seen reader avatars */}
                        {showSeen && !isEditing && (
                          <div className="flex -space-x-1 mt-0.5 px-1 self-end">
                            {seenReaders.slice(0, 3).map((r) => {
                              const ra = r.avatarUrl ? apiService.getImageUrl(r.avatarUrl) : null;
                              // eslint-disable-next-line @next/next/no-img-element
                              return <img key={r.userId} src={ra ?? "/default-avatar.svg"} alt="" className="w-3.5 h-3.5 rounded-full object-cover border border-white"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }} />;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  </React.Fragment>
                );
              })
            )}
            <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Attachment previews */}
          {attachmentPreviews.length > 0 && (
            <div className="flex-none px-3 pt-2 pb-1 border-t border-gray-100 bg-white">
              <div className="flex items-center gap-1.5 flex-wrap">
                {attachmentPreviews.map((p, idx) => (
                  <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex-none">
                    {p.type === "video" ? <video src={p.url} className="w-full h-full object-cover" muted /> : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button onClick={() => removeAttachment(idx)} className="absolute top-0 right-0 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex-none flex items-end gap-1.5 px-3 py-2.5 border-t border-gray-100 bg-white">
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileChange} />
            <button onClick={() => fileInputRef.current?.click()} className="flex-none w-8 h-8 mb-0.5 flex items-center justify-center rounded-full text-gray-400 hover:text-slate-600 hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            </button>
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="พิมพ์ข้อความ..."
              value={chatMessage}
              onChange={(e) => {
                setChatMessage(e.target.value);
                const ta = textareaRef.current;
                if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 80) + "px"; }
              }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              className="flex-1 px-3 py-2 rounded-2xl bg-gray-100 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition resize-none leading-relaxed overflow-y-auto"
              style={{ minHeight: "36px", maxHeight: "80px" }}
            />
            <button
              onClick={handleSend}
              disabled={(chatMessage.trim() === "" && attachmentFiles.length === 0) || isSending}
              className={`flex-none w-8 h-8 mb-0.5 flex items-center justify-center rounded-full transition-all ${(chatMessage.trim() || attachmentFiles.length > 0) && !isSending ? "bg-slate-700 hover:bg-slate-800 text-white shadow-sm" : "bg-gray-100 text-gray-300 cursor-not-allowed"}`}
            >
              {isSending ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── New Chat Modal ────────────────────────────────────────────────── */}
      {isNewChatOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsNewChatOpen(false); setNewChatSearch(""); setSelectedSuggestions([]); }} />
          <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px]">
            <div className="flex-none flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={() => { setIsNewChatOpen(false); setNewChatSearch(""); setSelectedSuggestions([]); }}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h2 className="font-semibold text-base text-gray-900">New message</h2>
              <div className="w-8" />
            </div>
            <div className="flex-none flex items-center gap-2 px-5 py-3 border-b border-gray-100">
              <span className="text-gray-400 text-sm font-medium flex-none">To:</span>
              <input type="text" placeholder="Search..." value={newChatSearch} onChange={(e) => setNewChatSearch(e.target.value)} autoFocus
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-300 focus:outline-none" />
            </div>
            <div className="flex-none px-5 pt-4 pb-2">
              <p className="text-gray-900 font-semibold text-sm">{newChatSearch.trim() === "" ? "Suggested" : "Results"}</p>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {suggestionsError ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">ไม่สามารถโหลดรายชื่อได้</p>
                    <p className="text-xs text-gray-400 mt-1">เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง</p>
                  </div>
                  <button onClick={() => fetchSuggestions(newChatSearch)} className="text-xs text-slate-600 font-medium px-4 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50">ลองใหม่</button>
                </div>
              ) : suggestions.filter((s) =>
                  newChatSearch === "" ||
                  s.displayName.toLowerCase().includes(newChatSearch.toLowerCase()) ||
                  s.username.toLowerCase().includes(newChatSearch.toLowerCase())
                ).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>
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
                    const isSel = selectedSuggestions.includes(s.id);
                    return (
                      <button key={s.id} onClick={() => setSelectedSuggestions((p) => isSel ? p.filter((id) => id !== s.id) : [...p, s.id])}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left">
                        <div className="relative flex-none w-12 h-12">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={s.avatar || "/default-avatar.svg"} alt={s.displayName} className="rounded-full object-cover w-12 h-12"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{s.displayName}</p>
                          <p className="text-xs text-gray-400 truncate">{s.username}</p>
                        </div>
                        <div className={`flex-none w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSel ? "bg-slate-700 border-slate-700" : "border-gray-300 bg-transparent"}`}>
                          {isSel && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                      </button>
                    );
                  })
              )}
            </div>
            <div className="flex-none px-5 py-4 border-t border-gray-100">
              {createChatError && !isGroupNameOpen && <p className="text-xs text-red-500 text-center mb-2">{createChatError}</p>}
              <button disabled={selectedSuggestions.length === 0 || isCreatingChat} onClick={handleChatButtonClick}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${selectedSuggestions.length > 0 && !isCreatingChat ? "bg-slate-700 hover:bg-slate-800 text-white shadow-sm" : "bg-slate-100 text-slate-300 cursor-not-allowed"}`}>
                {isCreatingChat ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>กำลังสร้าง...</>
                ) : selectedSuggestions.length >= 2 ? "สร้างกลุ่ม" : "Chat"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Group Name Modal ──────────────────────────────────────────────── */}
      {isGroupNameOpen && (
        <div className="fixed inset-0 z-110 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsGroupNameOpen(false); setGroupName(""); setGroupAvatarFile(null); setGroupAvatarPreview(null); }} />
          <div className="relative w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={() => { setIsGroupNameOpen(false); setGroupName(""); setGroupAvatarFile(null); setGroupAvatarPreview(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h2 className="font-semibold text-base text-gray-900">ตั้งชื่อกลุ่ม</h2>
              <div className="w-8" />
            </div>
            {/* Selected members preview */}
            <div className="px-5 pt-4 pb-2">
              <p className="text-xs text-gray-400 mb-3">สมาชิก {selectedSuggestions.length} คน</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.filter((s) => selectedSuggestions.includes(s.id)).map((s) => (
                  <div key={s.id} className="flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.avatar || "/default-avatar.svg"} alt={s.displayName} className="w-5 h-5 rounded-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }} />
                    <span className="text-xs text-slate-700 font-medium">{s.displayName}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Group Avatar */}
            <div className="px-5 pt-2 pb-1 flex items-center gap-4">
              <input ref={groupAvatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleGroupAvatarChange} />
              <button type="button" onClick={() => groupAvatarInputRef.current?.click()}
                className="relative flex-none w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-slate-300 hover:border-slate-500 transition-colors flex items-center justify-center bg-slate-50">
                {groupAvatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={groupAvatarPreview} alt="group avatar" className="w-full h-full object-cover" />
                ) : <DefaultGroupAvatar size={64} />}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity rounded-full">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
              </button>
              <div>
                <p className="text-sm font-medium text-gray-700">รูปภาพกลุ่ม</p>
                <p className="text-xs text-gray-400 mt-0.5">กดเพื่อเลือกรูป (ไม่บังคับ)</p>
                {groupAvatarFile && (
                  <button type="button" onClick={() => { setGroupAvatarFile(null); setGroupAvatarPreview(null); if (groupAvatarInputRef.current) groupAvatarInputRef.current.value = ""; }}
                    className="text-xs text-red-400 hover:text-red-600 mt-1 transition-colors">ลบรูป</button>
                )}
              </div>
            </div>
            {/* Group name input */}
            <div className="px-5 py-4">
              <input type="text" placeholder="ชื่อกลุ่ม..." value={groupName} onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && groupName.trim()) handleCreateGroupRoom(); }}
                autoFocus className="w-full px-4 py-3 rounded-xl bg-gray-100 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition" />
            </div>
            {/* Create button */}
            <div className="px-5 pb-5">
              {createChatError && <p className="text-xs text-red-500 text-center mb-2">{createChatError}</p>}
              <button disabled={!groupName.trim() || isCreatingChat} onClick={handleCreateGroupRoom}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${groupName.trim() && !isCreatingChat ? "bg-slate-700 hover:bg-slate-800 text-white shadow-sm" : "bg-slate-100 text-slate-300 cursor-not-allowed"}`}>
                {isCreatingChat ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>กำลังสร้าง...</>
                ) : "สร้างกลุ่ม"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightboxUrls.length > 0 && (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/80" onClick={() => setLightboxUrls([])}>
          <button className="absolute top-4 right-4 w-9 h-9 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors" onClick={() => setLightboxUrls([])}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          {lightboxUrls.length > 1 && (
            <>
              <button className="absolute left-4 w-9 h-9 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors" onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i - 1 + lightboxUrls.length) % lightboxUrls.length); }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button className="absolute right-4 w-9 h-9 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors" onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i + 1) % lightboxUrls.length); }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 text-white text-sm px-3 py-1 rounded-full">{lightboxIndex + 1} / {lightboxUrls.length}</div>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxUrls[lightboxIndex]} alt="" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl select-none" onClick={(e) => e.stopPropagation()} draggable={false} />
        </div>
      )}

      {/* ── Confirm Dialog ────────────────────────────────────────────────── */}
      {confirmDialog && (
        <div className="fixed inset-0 z-300 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDialog(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs mx-4 overflow-hidden flex flex-col">
            <div className="px-5 pt-5 pb-3">
              <h3 className="font-semibold text-gray-900 text-base">{confirmDialog.title}</h3>
              <p className="text-sm text-gray-500 mt-1.5">{confirmDialog.message}</p>
            </div>
            <div className="flex items-center gap-2 px-5 pb-5 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${confirmDialog.danger ? "bg-red-500 hover:bg-red-600" : "bg-slate-700 hover:bg-slate-800"}`}
              >
                {confirmDialog.confirmLabel ?? "ตกลง"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbox;
