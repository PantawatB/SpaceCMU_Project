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
  userRole?: string | null;
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
  messageType: "text" | "system" | null;  // null = legacy rows (treat as "text")
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  // sender info joined from backend (always present, null if user deleted)
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

/** shape ของ reader จาก GET /api/messages/room/:roomId/readers */
interface RoomReader {
  userId: string;
  lastReadAt: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

/** shape ของ room details จาก GET /api/chat-rooms/:roomId */
interface RoomDetailMember {
  userId: string;
  role: string;
  joinedAt: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  userRole?: string | null;
}

interface RoomDetail {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  isGroup: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  members: RoomDetailMember[];
  memberCount: number;
}

// ─── Helper: parse Market Card from message content ──────────────────────────

interface MarketCardPayload {
  __type: "market_card";
  itemId?: string;
  title: string;
  price: string;
  description: string;
  imageUrl: string | null;
  imageUrls?: string[];          // all product images (may be absent in old messages)
  sellerName?: string;
  sellerAvatarUrl?: string | null;
  sellerRole?: string | null;
}

function parseMarketCard(content: string): MarketCardPayload | null {
  if (!content.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed.__type === "market_card") return parsed as MarketCardPayload;
  } catch { /* not JSON */ }
  return null;
}

function MarketCardBubble({
  card,
  isMine,
  senderName,
  senderAvatarUrl,
}: {
  card: MarketCardPayload;
  isMine: boolean;
  senderName?: string;
  senderAvatarUrl?: string | null;
}) {
  const [imgIndex, setImgIndex] = React.useState(0);
  const [showModal, setShowModal] = React.useState(false);
  const [modalImgIndex, setModalImgIndex] = React.useState(0);
  const [liveStatus, setLiveStatus] = React.useState<"available" | "sold" | "deleted" | "loading">(
    card.itemId ? "loading" : "available"
  );
  // Live seller role fetched from API — used to backfill old messages that lack sellerRole in payload
  const [liveSellerRole, setLiveSellerRole] = React.useState<string | null | undefined>(undefined);

  // Fetch live status from API (getOptional returns null silently for 404/deleted items)
  React.useEffect(() => {
    if (!card.itemId) return;
    apiService.getOptional<{ status: string; seller?: { role?: string | null } }>(`/api/market/items/${card.itemId}`)
      .then((data) => {
        if (data === null || data.status === "deleted") {
          setLiveStatus("deleted");
        } else {
          setLiveStatus(data.status === "sold" ? "sold" : "available");
          // backfill seller role for old messages that don't have it in payload
          if (data.seller?.role !== undefined) {
            setLiveSellerRole(data.seller.role ?? null);
          }
        }
      })
      .catch(() => {
        setLiveStatus("available"); // fallback: show normally on network error
      });
  }, [card.itemId]);

  const isSold = liveStatus === "sold";
  const isDeleted = liveStatus === "deleted";

  // Effective seller role: prefer payload value, fall back to live API value
  const effectiveSellerRole = card.sellerRole !== undefined ? card.sellerRole : liveSellerRole;

  // Resolve seller display info: prefer payload fields, fallback to message sender
  const resolvedSellerName = card.sellerName ?? senderName ?? "ผู้ขาย";
  const resolvedSellerAvatar = card.sellerAvatarUrl !== undefined
    ? (card.sellerAvatarUrl ?? "/default-avatar.svg")
    : (senderAvatarUrl ?? "/default-avatar.svg");

  // Build a unified images array
  const images: string[] = React.useMemo(() => {
    if (card.imageUrls && card.imageUrls.length > 0) return card.imageUrls;
    if (card.imageUrl) return [card.imageUrl];
    return [];
  }, [card.imageUrls, card.imageUrl]);

  const total = images.length;

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex((p) => (p === 0 ? total - 1 : p - 1));
  };
  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex((p) => (p === total - 1 ? 0 : p + 1));
  };

  const openModal = () => {
    setModalImgIndex(imgIndex);
    setShowModal(true);
  };

  return (
    <>
      {/* ── Card bubble ───────────────────────────────────────────────── */}
      <article
        className={`w-64 overflow-hidden rounded-2xl transition-all ${
          isMine ? "bg-slate-700" : "bg-white border border-gray-100 shadow-sm"
        } ${(isSold || isDeleted) ? "opacity-75" : ""}`}
      >
        {/* Product image with navigation */}
        <div className="w-full h-36 bg-gray-200 overflow-hidden relative">
          {images.length > 0 ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[imgIndex]}
                alt={card.title}
                className={`w-full h-full object-cover transition-all ${(isSold || isDeleted) ? "brightness-50 grayscale" : ""}`}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
              {/* Arrows — only when multiple images and not sold/deleted */}
              {total > 1 && !isSold && !isDeleted && (
                <>
                  <button
                    onClick={prevImg}
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-0.5 z-10 transition-colors"
                    aria-label="Previous image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={nextImg}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-0.5 z-10 transition-colors"
                    aria-label="Next image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <span className="absolute bottom-1.5 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full z-10">
                    {imgIndex + 1}/{total}
                  </span>
                </>
              )}
            </>
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${isMine ? "bg-slate-600" : "bg-gray-200"}`}>
              <svg className={`w-10 h-10 ${isMine ? "text-slate-400" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {/* SOLD stamp */}
          {isSold && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-red-500 rounded px-3 py-1 rotate-[-18deg]">
                <span className="text-red-500 font-black tracking-[0.25em] text-base uppercase" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>SOLD</span>
              </div>
            </div>
          )}
          {/* DELETED stamp */}
          {isDeleted && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-gray-400 rounded px-3 py-1 rotate-[-18deg]">
                <span className="text-gray-400 font-black tracking-[0.15em] text-sm uppercase">REMOVED</span>
              </div>
            </div>
          )}
        </div>

        {/* Card info */}
        <div className="px-3 py-2.5">
          <p className={`font-semibold text-sm truncate ${isMine ? "text-white" : isDeleted ? "text-gray-400" : "text-gray-900"}`}>{card.title}</p>
          <p className={`text-xs mt-0.5 line-clamp-2 ${isMine ? "text-slate-300" : (isSold || isDeleted) ? "text-gray-400" : "text-gray-500"}`}>{card.description}</p>
          <p className={`text-sm font-bold mt-1.5 ${
            isDeleted ? "text-gray-400 line-through" :
            isSold ? (isMine ? "text-slate-400 line-through" : "text-gray-400 line-through") :
            isMine ? "text-orange-300" : "text-orange-600"
          }`}>฿{card.price}</p>
        </div>

        {/* Footer: seller avatar + name + view button */}
        <div className={`flex items-center justify-between px-3 py-2.5 border-t ${isMine ? "border-slate-600" : "border-gray-100"}`}>
          <div className="flex items-center gap-2 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedSellerAvatar}
              alt={resolvedSellerName}
              className={`w-6 h-6 rounded-full object-cover border border-gray-200 flex-none ${(isSold || isDeleted) ? "grayscale" : ""}`}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }}
            />
            <span className={`text-xs font-medium truncate flex items-center gap-1 ${isMine ? "text-slate-200" : (isSold || isDeleted) ? "text-gray-400" : "text-gray-700"}`}>
              {resolvedSellerName}
              {effectiveSellerRole === "official_account" && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-blue-400 shrink-0 flex-none" aria-label="Verified official account">
                  <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
              )}
            </span>
          </div>
          <button
            onClick={openModal}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-colors flex-none ml-2 ${
              isDeleted ? "bg-gray-200 text-gray-400 cursor-pointer" :
              isSold ? "bg-gray-200 text-gray-500 cursor-pointer hover:bg-gray-300" :
              isMine ? "bg-white/15 hover:bg-white/25 text-white" : "bg-gray-900 hover:bg-gray-700 text-white"
            }`}
          >
            view
          </button>
        </div>
      </article>

      {/* ── Product detail modal ──────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-200 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-[900px] max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Content */}
            <div className="flex flex-col md:flex-row h-full overflow-y-auto">
              {/* Left: image gallery */}
              <div className="w-full md:w-1/2 bg-gray-50 p-8 flex items-center justify-center relative">
                <div className="w-full aspect-square max-w-md bg-white rounded-2xl overflow-hidden shadow-md relative flex items-center justify-center">
                  {images.length > 0 ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={images[modalImgIndex]}
                        alt={`${card.title} - ${modalImgIndex + 1}`}
                        className={`w-full h-full object-contain ${(isSold || isDeleted) ? "brightness-60 grayscale" : ""}`}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                      {/* SOLD overlay */}
                      {isSold && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="border-[3px] border-red-500 rounded-md px-6 py-2 rotate-[-18deg]">
                            <span className="text-red-500 font-black tracking-[0.3em] text-3xl uppercase" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>SOLD</span>
                          </div>
                        </div>
                      )}
                      {/* DELETED overlay */}
                      {isDeleted && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="border-[3px] border-gray-400 rounded-md px-5 py-2 rotate-[-18deg]">
                            <span className="text-gray-400 font-black tracking-[0.2em] text-2xl uppercase">REMOVED</span>
                          </div>
                        </div>
                      )}
                      {total > 1 && !isSold && !isDeleted && (
                        <>
                          <button
                            onClick={() => setModalImgIndex((p) => (p === 0 ? total - 1 : p - 1))}
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2.5 shadow-lg transition-all hover:scale-110 z-10"
                            aria-label="Previous"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setModalImgIndex((p) => (p === total - 1 ? 0 : p + 1))}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2.5 shadow-lg transition-all hover:scale-110 z-10"
                            aria-label="Next"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm z-10">
                            {modalImgIndex + 1} / {total}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <svg className="w-32 h-32 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: product details */}
              <div className="w-full md:w-1/2 p-8 flex flex-col">
                {/* Title, badges & Price */}
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
                  <span className={`text-4xl font-bold ${isDeleted || isSold ? "text-gray-400 line-through" : "text-orange-600"}`}>
                    ฿{card.price}
                  </span>
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
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        รายละเอียดสินค้า
                      </h3>
                      <p className={`leading-relaxed whitespace-pre-line ${isSold ? "text-gray-400" : "text-gray-700"}`}>{card.description}</p>
                    </div>
                    <div className="border-t border-gray-200 my-6" />
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        ผู้ขาย
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full overflow-hidden border-2 flex-none ${isSold ? "border-gray-200 grayscale" : "border-gray-200"}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={resolvedSellerAvatar}
                            alt={resolvedSellerName}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }}
                          />
                        </div>
                        <div>
                          <p className={`font-semibold flex items-center gap-1 ${isSold ? "text-gray-400" : "text-gray-900"}`}>
                            {resolvedSellerName}
                            {effectiveSellerRole === "official_account" && (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500 shrink-0 flex-none" aria-label="Verified official account">
                                <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                              </svg>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">ผู้ขาย</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Helper: Post Card (shared via chat) ─────────────────────────────────────

interface PostCardPayload {
  __type: "post_card";
  postId: string;
  content: string;
  category: string;
  authorName: string;
  authorAvatarUrl: string | null;
  imageUrl: string | null;  // first media thumbnail
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

function parsePostCard(content: string): PostCardPayload | null {
  if (!content.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed.__type === "post_card") return parsed as PostCardPayload;
  } catch { /* not JSON */ }
  return null;
}

function postTimeAgo(dateStr: string) {
  const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "เมื่อกี้";
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชม.ที่แล้ว`;
  return `${Math.floor(diff / 86400)} วันที่แล้ว`;
}

function PostCardBubble({ card, isMine }: { card: PostCardPayload; isMine: boolean }) {
  const handleView = () => {
    window.location.href = `/Feeds?postId=${card.postId}&source=chat`;
  };

  return (
    <article
      className={`w-64 select-none overflow-hidden rounded-xl border ${
        isMine ? "border-slate-500 bg-slate-600" : "border-gray-200 bg-white"
      }`}
    >
      {/* Header: author */}
      <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${isMine ? "border-slate-500" : "border-gray-100"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.authorAvatarUrl ? (apiService.getImageUrl(card.authorAvatarUrl) ?? "/default-avatar.svg") : "/default-avatar.svg"}
          alt={card.authorName}
          className="w-7 h-7 rounded-full object-cover flex-none"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }}
        />
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold truncate ${isMine ? "text-white" : "text-gray-800"}`}>{card.authorName}</p>
          <p className={`text-[10px] ${isMine ? "text-slate-300" : "text-gray-400"}`}>{card.category} · {postTimeAgo(card.createdAt)}</p>
        </div>
        {/* Post icon badge */}
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isMine ? "bg-slate-500 text-slate-200" : "bg-gray-100 text-gray-500"}`}>POST</span>
      </div>

      {/* Thumbnail (if any) */}
      {card.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={apiService.getImageUrl(card.imageUrl) ?? card.imageUrl}
          alt=""
          className="w-full h-28 object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      )}

      {/* Content preview */}
      <div className="px-3 py-2">
        <p className={`text-xs leading-relaxed line-clamp-3 ${isMine ? "text-slate-100" : "text-gray-700"}`}>
          {card.content || "(ไม่มีเนื้อหา)"}
        </p>
      </div>

      {/* Stats + View button */}
      <div className={`flex items-center justify-between px-3 py-2.5 border-t ${isMine ? "border-slate-500" : "border-gray-100"}`}>
        <div className={`flex items-center gap-3 text-[11px] ${isMine ? "text-slate-300" : "text-gray-400"}`}>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            {card.likeCount}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {card.commentCount}
          </span>
        </div>
        <button
          onClick={handleView}
          className={`text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-colors flex-none ${
            isMine ? "bg-white/15 hover:bg-white/25 text-white" : "bg-gray-900 hover:bg-gray-700 text-white"
          }`}
        >
          ดูโพสต์
        </button>
      </div>
    </article>
  );
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

  // ─── Room Info Panel state ────────────────────────────────────────────────
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [roomDetail, setRoomDetail] = useState<RoomDetail | null>(null);
  const [roomDetailLoading, setRoomDetailLoading] = useState(false);
  // Group edit state (only for isGroup=true)
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupAvatarFile, setEditGroupAvatarFile] = useState<File | null>(null);
  const [editGroupAvatarPreview, setEditGroupAvatarPreview] = useState<string | null>(null);
  const editGroupAvatarInputRef = useRef<HTMLInputElement>(null);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [saveGroupError, setSaveGroupError] = useState<string | null>(null);
  const [saveGroupSuccess, setSaveGroupSuccess] = useState(false);

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
  // Keep full Suggestion objects so rawId is retained even when suggestions list changes (search replaces list)
  const [selectedSuggestionObjects, setSelectedSuggestionObjects] = useState<Suggestion[]>([]);

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
            // Also update any edited messages
            const updatedPrev = prev.map((m) => {
              const fetched = data.messages.find((fm) => fm.id === m.id);
              if (fetched && fetched.editedAt !== m.editedAt) {
                return { ...m, content: fetched.content, editedAt: fetched.editedAt };
              }
              return m;
            });
            if (newOnes.length === 0 && updatedPrev === prev) return prev;
            if (newOnes.length > 0) {
              requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              });
            }
            const merged = [...updatedPrev, ...newOnes];
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
    setSelectedSuggestionObjects([]);
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
    const selected = selectedSuggestionObjects[0];
    if (!selected) return;

    setIsCreatingChat(true);
    setCreateChatError(null);
    try {
      const result = await apiService.post<{ room: { id: string } }>("/api/chat-rooms/direct", {
        otherUserId: selected.rawId,
      });
      closeNewChatModal();
      await fetchRooms();
      // Auto-select the new/existing room
      if (result?.room?.id) setSelectedRoomId(result.room.id);
    } catch {
      setCreateChatError("ไม่สามารถสร้างแชทได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsCreatingChat(false);
    }
  };

  // ฟังก์ชันสร้าง Group Room
  const handleCreateGroupRoom = async () => {
    if (!groupName.trim()) return;

    const memberIds = selectedSuggestionObjects.map((s) => s.rawId);

    setIsCreatingChat(true);
    setCreateChatError(null);
    try {
      let result: { room: { id: string } } | null = null;
      if (groupAvatarFile) {
        // ถ้ามีรูปกลุ่ม ส่งเป็น FormData
        const formData = new FormData();
        formData.append("name", groupName.trim());
        // ส่ง memberIds เป็น array โดยใช้ key เดิม (backend จะ parse rawMemberIds)
        memberIds.forEach((id) => formData.append("memberIds", id));
        formData.append("avatar", groupAvatarFile);
        result = await apiService.postFormData<{ room: { id: string } }>("/api/chat-rooms/group", formData);
      } else {
        result = await apiService.post<{ room: { id: string } }>("/api/chat-rooms/group", {
          name: groupName.trim(),
          memberIds,
        });
      }
      closeGroupNameModal();
      closeNewChatModal();
      await fetchRooms();
      // Auto-select the new group room
      if (result?.room?.id) setSelectedRoomId(result.room.id);
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

  // ─── Add member modal state ──────────────────────────────────────────────
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [addMemberSuggestions, setAddMemberSuggestions] = useState<Suggestion[]>([]);
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [isAddingMember, setIsAddingMember] = useState(false);

  // ─── Confirm dialog state ─────────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // ─── Message edit/delete state ────────────────────────────────────────────
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null); // messageId with open menu
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // ─── Info Panel: fetch room detail ─────────────────────────────────────────
  const fetchRoomDetail = React.useCallback(async (roomId: string) => {
    setRoomDetailLoading(true);
    try {
      const data = await apiService.get<RoomDetail>(`/api/chat-rooms/${roomId}`);
      setRoomDetail(data);
      setEditGroupName(data.name ?? "");
    } catch {
      // ไม่ critical
    } finally {
      setRoomDetailLoading(false);
    }
  }, []);

  const handleOpenInfoPanel = () => {
    if (!selectedRoomId) return;
    setSaveGroupError(null);
    setSaveGroupSuccess(false);
    setEditGroupAvatarFile(null);
    setEditGroupAvatarPreview(null);
    setIsInfoPanelOpen(true);
    fetchRoomDetail(selectedRoomId);
  };

  // ─── Info Panel: handle edit avatar for group ────────────────────────────
  const handleEditGroupAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditGroupAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setEditGroupAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ─── Info Panel: save group name/avatar ─────────────────────────────────
  const handleSaveGroupInfo = async () => {
    if (!selectedRoomId || !roomDetail?.isGroup) return;

    const nameChanged = editGroupName.trim() !== (roomDetail.name ?? "").trim();
    const avatarChanged = !!editGroupAvatarFile;

    // Nothing changed → skip silently
    if (!nameChanged && !avatarChanged) {
      setSaveGroupSuccess(true);
      setTimeout(() => setSaveGroupSuccess(false), 1500);
      return;
    }

    setIsSavingGroup(true);
    setSaveGroupError(null);
    setSaveGroupSuccess(false);
    try {
      if (avatarChanged) {
        const fd = new FormData();
        if (nameChanged) fd.append("name", editGroupName.trim());
        fd.append("avatar", editGroupAvatarFile!);
        await apiService.patchFormData(`/api/chat-rooms/${selectedRoomId}`, fd);
      } else {
        // Only name changed
        await apiService.patch(`/api/chat-rooms/${selectedRoomId}`, {
          name: editGroupName.trim() || null,
        });
      }
      setSaveGroupSuccess(true);
      // อัปเดต local state
      setRealRooms((prev) =>
        prev.map((r) =>
          r.id === selectedRoomId
            ? {
                ...r,
                name: editGroupName.trim() || null,
                displayName: editGroupName.trim() || r.displayName,
              }
            : r
        )
      );
      // re-fetch room detail + messages (system message จะปรากฏ)
      fetchRoomDetail(selectedRoomId);
      fetchMessages(selectedRoomId, 1, false);
      setEditGroupAvatarFile(null);
      setEditGroupAvatarPreview(null);
      setTimeout(() => setSaveGroupSuccess(false), 2500);
    } catch {
      setSaveGroupError("บันทึกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setIsSavingGroup(false);
    }
  };

  // ─── Add member search ───────────────────────────────────────────────────
  const fetchAddMemberSuggestions = React.useCallback(async (query: string) => {
    if (!roomDetail) return;
    setAddMemberLoading(true);
    try {
      const endpoint = query.trim() === ""
        ? "/api/friends/me"
        : `/api/users/search?query=${encodeURIComponent(query.trim())}`;
      const data = await apiService.get<FriendApiItem[]>(endpoint);
      const existingIds = new Set(roomDetail.members.map((m) => m.userId));
      const mapped = data
        .filter((f) => !existingIds.has(f.id))
        .slice(0, 20)
        .map((f) => ({
          id: parseInt(f.id.replace(/-/g, "").slice(0, 8), 16),
          rawId: f.id,
          displayName: `${f.firstName} ${f.lastName}`.trim() || f.username,
          username: f.username,
          avatar: f.avatarUrl ? (apiService.getImageUrl(f.avatarUrl) ?? "") : "",
        }));
      setAddMemberSuggestions(mapped);
    } catch {
      setAddMemberSuggestions([]);
    } finally {
      setAddMemberLoading(false);
    }
  }, [roomDetail]);

  useEffect(() => {
    if (!isAddMemberOpen) return;
    fetchAddMemberSuggestions("");
  }, [isAddMemberOpen, fetchAddMemberSuggestions]);

  useEffect(() => {
    if (!isAddMemberOpen) return;
    const t = setTimeout(() => fetchAddMemberSuggestions(addMemberSearch), 300);
    return () => clearTimeout(t);
  }, [addMemberSearch, isAddMemberOpen, fetchAddMemberSuggestions]);

  // ─── Add member action ───────────────────────────────────────────────────
  const handleAddMember = async (targetRawId: string) => {
    if (!selectedRoomId || isAddingMember) return;
    setIsAddingMember(true);
    setAddMemberError(null);
    try {
      await apiService.post(`/api/chat-rooms/${selectedRoomId}/members`, { newUserId: targetRawId });
      // Remove from suggestions
      setAddMemberSuggestions((prev) => prev.filter((s) => s.rawId !== targetRawId));
      // Refresh room detail & messages
      fetchRoomDetail(selectedRoomId);
      fetchMessages(selectedRoomId, 1, false);
      fetchRooms();                    } catch (err: unknown) {
                      setAddMemberError((err as { message?: string })?.message ?? "เพิ่มสมาชิกไม่สำเร็จ");
    } finally {
      setIsAddingMember(false);
    }
  };

  // ─── Remove member action ─────────────────────────────────────────────────
  const handleRemoveMember = async (targetUserId: string, targetName: string) => {
    if (!selectedRoomId) return;
    setConfirmDialog({
      title: "นำสมาชิกออก",
      message: `นำ ${targetName} ออกจากกลุ่มหรือไม่?`,
      confirmLabel: "นำออก",
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await apiService.delete(`/api/chat-rooms/${selectedRoomId}/members/${targetUserId}`);
          fetchRoomDetail(selectedRoomId);
          fetchMessages(selectedRoomId, 1, false);
          fetchRooms();
        } catch {
          setConfirmDialog({
            title: "เกิดข้อผิดพลาด",
            message: "ไม่สามารถนำสมาชิกออกได้ กรุณาลองใหม่",
            confirmLabel: "ตกลง",
            onConfirm: () => setConfirmDialog(null),
          });
        }
      },
    });
  };

  // ─── Leave group action ───────────────────────────────────────────────────
  const handleLeaveGroup = async () => {
    if (!selectedRoomId) return;
    setConfirmDialog({
      title: "ออกจากกลุ่ม",
      message: "คุณต้องการออกจากกลุ่มนี้หรือไม่?",
      confirmLabel: "ออกจากกลุ่ม",
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await apiService.post(`/api/chat-rooms/${selectedRoomId}/leave`, {});
          setIsInfoPanelOpen(false);
          setSelectedRoomId(null);
          fetchRooms();
        } catch {
          setConfirmDialog({
            title: "เกิดข้อผิดพลาด",
            message: "ไม่สามารถออกจากกลุ่มได้ กรุณาลองใหม่",
            confirmLabel: "ตกลง",
            onConfirm: () => setConfirmDialog(null),
          });
        }
      },
    });
  };

  // ─── Edit message action ──────────────────────────────────────────────────
  const handleStartEdit = (msg: RealMessage) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
    setActiveMessageMenu(null);
    // focus after render
    setTimeout(() => {
      editInputRef.current?.focus();
      // position cursor at end
      const len = msg.content.length;
      editInputRef.current?.setSelectionRange(len, len);
    }, 50);
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editingContent.trim() || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      const updated = await apiService.patch<RealMessage>(`/api/messages/${messageId}`, {
        content: editingContent.trim(),
      });
      // Update message in local state
      setRealMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: updated.content, editedAt: updated.editedAt }
            : m
        )
      );
      setEditingMessageId(null);
      setEditingContent("");
    } catch {
      // keep edit mode open so user can retry
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  // ─── Delete message action ────────────────────────────────────────────────
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
          const result = await apiService.delete<{
            success: boolean;
            messageId: string;
            systemMessage: RealMessage;
          }>(`/api/messages/${messageId}`);
          // Remove the deleted message and append system message
          setRealMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== messageId);
            if (result.systemMessage) {
              // dedup guard
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

  return (
    <div className="flex h-dvh bg-white text-gray-800 overflow-hidden" style={{ height: '100dvh' }}>
      {/* Sidebar */}
      <div className="flex-none h-screen sticky top-0 z-30">
        <Sidebar hideHamburger={!!selectedRoomId} />
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

            {/* Selected users row — แสดงเมื่อมีคนที่เลือกแล้ว */}
            {selectedSuggestionObjects.length > 0 && (() => {
              const MAX_SHOW = 4;
              const shown = selectedSuggestionObjects.slice(0, MAX_SHOW);
              const extra = selectedSuggestionObjects.length - MAX_SHOW;
              return (
                <div className="flex-none flex items-center gap-2 px-5 py-2.5 border-b border-gray-100 bg-slate-50">
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    {shown.map((sel) => (
                      <button
                        key={sel.id}
                        onClick={() => {
                          setSelectedSuggestions((prev) => prev.filter((id) => id !== sel.id));
                          setSelectedSuggestionObjects((prev) => prev.filter((o) => o.id !== sel.id));
                        }}
                        title={`ลบ ${sel.displayName}`}
                        className="group relative flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium pl-1 pr-2 py-1 rounded-full hover:border-red-300 hover:bg-red-50 transition-colors"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={sel.avatar || "/default-avatar.svg"}
                          alt={sel.displayName}
                          className="w-5 h-5 rounded-full object-cover flex-none"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }}
                        />
                        <span className="group-hover:hidden">{sel.displayName}</span>
                        <span className="hidden group-hover:inline text-red-400">ลบ</span>
                        <svg className="w-3 h-3 text-slate-300 group-hover:text-red-400 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    ))}
                    {extra > 0 && (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-600 text-xs font-semibold">
                        +{extra}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

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
                  (s.displayName ?? "").toLowerCase().includes(newChatSearch.toLowerCase()) ||
                  (s.username ?? "").toLowerCase().includes(newChatSearch.toLowerCase())
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
                    (s.displayName ?? "").toLowerCase().includes(newChatSearch.toLowerCase()) ||
                    (s.username ?? "").toLowerCase().includes(newChatSearch.toLowerCase())
                  )
                  .map((s) => {
                    const isSelected = selectedSuggestions.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSuggestions((prev) => prev.filter((id) => id !== s.id));
                            setSelectedSuggestionObjects((prev) => prev.filter((o) => o.id !== s.id));
                          } else {
                            setSelectedSuggestions((prev) => [...prev, s.id]);
                            setSelectedSuggestionObjects((prev) => [...prev, s]);
                          }
                        }}
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
                {selectedSuggestionObjects
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
        {/* Left Panel — Conversation Window (hidden on mobile when no room selected) */}
        <div className={`flex-1 flex flex-col h-full min-w-0 bg-gray-50 ${selectedRoomId ? "flex" : "hidden lg:flex"}`}>

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
                <div className="flex-none flex items-center justify-between px-4 lg:px-6 py-4 bg-white border-b border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 lg:gap-3">
                    {/* Back button (mobile only) */}
                    <button
                      onClick={() => setSelectedRoomId(null)}
                      className="lg:hidden flex-none w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
                      aria-label="Back"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
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
                      <h2 className="font-semibold text-gray-900 text-base leading-tight flex items-center gap-1">
                        {selectedRoom?.displayName ?? "..."}
                        {(() => {
                          if (!selectedRoom?.isGroup) {
                            const otherMember = selectedRoom?.members.find((m) => m.userId !== currentUserId);
                            if (otherMember?.userRole === "official_account") {
                              return (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500 shrink-0 flex-none" aria-label="Verified official account">
                                  <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                </svg>
                              );
                            }
                          }
                          return null;
                        })()}
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
                    <button
                      onClick={handleOpenInfoPanel}
                      className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      title="ข้อมูลห้องแชท"
                    >
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
                  onClick={() => {
                    if (seenPopupMsgId) setSeenPopupMsgId(null);
                    if (activeMessageMenu) setActiveMessageMenu(null);
                  }}
                  className="flex-1 overflow-y-auto px-3 lg:px-6 py-4 lg:py-6 space-y-3"
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
                      // ใช้ raw สำหรับ date divider (รวม system msg)
                      const prevMsgRaw = realMessages[idx - 1];
                      // skip system messages เมื่อคำนวณ grouping
                      const prevMsg = realMessages.slice(0, idx).reverse().find((m) => m.messageType !== "system");
                      const nextMsg = realMessages.slice(idx + 1).find((m) => m.messageType !== "system");

                      // ─── Date divider: ขึ้นวันใหม่ ────────────────────────────────────────
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

                      // ─── System message: แสดงแบบ centered pill ──────────────────────────
                      const isSystemMsg = msg.messageType === "system";
                      if (isSystemMsg) {
                        return (
                          <React.Fragment key={msg.id}>
                            {showDateDivider && (
                              <div className="flex items-center gap-3 my-3">
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-xs text-gray-400 font-medium px-2">{dateDividerLabel}</span>
                                <div className="flex-1 h-px bg-gray-200" />
                              </div>
                            )}
                            <div className="flex items-center gap-3 my-2">
                              <div className="flex-1 h-px bg-gray-200" />
                              <span className="text-xs text-gray-400 font-medium px-3">{msg.content}</span>
                              <div className="flex-1 h-px bg-gray-200" />
                            </div>
                          </React.Fragment>
                        );
                      }

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

                      const showAvatar = !isMine && (isLastInGroup || editingMessageId === msg.id);
                      const showTime = isLastInGroup;
                      const showSenderName = !isMine && selectedRoom?.isGroup && isFirstInGroup;

                      const senderMember = selectedRoom?.members.find((m) => m.userId === msg.senderId);
                      const senderAvatarUrl = senderMember?.avatarUrl
                        ? apiService.getImageUrl(senderMember.avatarUrl)
                        : msg.senderAvatarUrl
                          ? apiService.getImageUrl(msg.senderAvatarUrl)
                          : null;
                      const senderName = senderMember
                        ? `${senderMember.firstName} ${senderMember.lastName}`.trim()
                        : (msg.senderFirstName || msg.senderLastName)
                          ? `${msg.senderFirstName ?? ""} ${msg.senderLastName ?? ""}`.trim()
                          : "ผู้ใช้";

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
                      const nextMsgRaw = realMessages[idx + 1];
                      const nextMsgCreatedAtMs = nextMsgRaw
                        ? new Date(nextMsgRaw.createdAt).getTime()
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
                        <React.Fragment key={msg.id}>
                          {/* ── Date divider ─────────────────────────────────────── */}
                          {showDateDivider && (
                            <div className="flex items-center gap-3 my-3">
                              <div className="flex-1 h-px bg-gray-200" />
                              <span className="text-xs text-gray-400 font-medium px-2">{dateDividerLabel}</span>
                              <div className="flex-1 h-px bg-gray-200" />
                            </div>
                          )}
                        <div
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

                            <div className={`max-w-[65%] min-w-0 flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                              {/* ชื่อผู้ส่ง */}
                              {showSenderName && (
                                <span className="text-[11px] text-gray-400 mb-0.5 px-1 flex items-center gap-1">
                                  {senderName}
                                  {senderMember?.userRole === "official_account" && (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-blue-500 shrink-0 flex-none" aria-label="Verified official account">
                                      <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </span>
                              )}

                              {/* ── Edit/Delete action buttons (own messages only) ─── */}
                              {isMine && activeMessageMenu === msg.id && editingMessageId !== msg.id && (
                                <div className="flex items-center gap-1 mb-1 self-end">
                                  {/* ซ่อนปุ่มแก้ไขถ้าเป็น market card, post card หรือมีไฟล์แนบ */}
                                  {!parseMarketCard(msg.content) && !parsePostCard(msg.content) && !msg.mediaUrls && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleStartEdit(msg); }}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium transition-colors"
                                      title="แก้ไขข้อความ"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      แก้ไข
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 hover:bg-red-100 text-red-500 text-[11px] font-medium transition-colors"
                                    title="ลบข้อความ"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    ลบ
                                  </button>
                                </div>
                              )}

                              {/* ── Inline edit mode ─────────────────────────────── */}
                              {editingMessageId === msg.id ? (
                                <div className="w-full flex flex-col gap-1.5">
                                  <textarea
                                    ref={editInputRef}
                                    value={editingContent}
                                    onChange={(e) => setEditingContent(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSaveEdit(msg.id);
                                      }
                                      if (e.key === "Escape") handleCancelEdit();
                                    }}
                                    rows={1}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none leading-relaxed"
                                    style={{ minHeight: "40px", maxHeight: "120px" }}
                                  />
                                  <div className="flex items-center gap-1.5 self-end">
                                    <button
                                      onClick={handleCancelEdit}
                                      className="px-3 py-1 rounded-full text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                                    >
                                      ยกเลิก
                                    </button>
                                    <button
                                      onClick={() => handleSaveEdit(msg.id)}
                                      disabled={!editingContent.trim() || isSavingEdit}
                                      className="px-3 py-1 rounded-full text-xs font-medium text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                    >
                                      {isSavingEdit && (
                                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                      )}
                                      บันทึก
                                    </button>
                                  </div>
                                </div>
                              ) : (
                              /* ── Normal Bubble ────────────────────────────────── */
                              <div
                                className={`overflow-hidden min-w-0 ${
                                  isMine
                                    ? `bg-slate-700 text-white cursor-pointer select-none ${
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
                                onClick={(e) => {
                                  if (!isMine) return;
                                  e.stopPropagation();
                                  setActiveMessageMenu((prev) => prev === msg.id ? null : msg.id);
                                }}
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
                                {/* Market Card or Post Card or Text content */}
                                {msg.content && (() => {
                                  const card = parseMarketCard(msg.content);
                                  if (card) {
                                    // Build sender display info for fallback (when card was sent before sellerName was added to payload)
                                    const senderFullName = [msg.senderFirstName, msg.senderLastName].filter(Boolean).join(" ") || undefined;
                                    const senderAvatar = msg.senderAvatarUrl
                                      ? (apiService.getImageUrl(msg.senderAvatarUrl) ?? msg.senderAvatarUrl)
                                      : null;
                                    return (
                                      <MarketCardBubble
                                        card={card}
                                        isMine={isMine}
                                        senderName={senderFullName}
                                        senderAvatarUrl={senderAvatar}
                                      />
                                    );
                                  }
                                  const postCard = parsePostCard(msg.content);
                                  if (postCard) {
                                    return <PostCardBubble card={postCard} isMine={isMine} />;
                                  }
                                  return (
                                    <p className="px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap wrap-break-word min-w-0 max-w-full">
                                      {msg.content}
                                    </p>
                                  );
                                })()}
                                {/* Media-only: no text padding filler */}
                                {!msg.content && msg.mediaUrls && <div />}
                              </div>
                              )} {/* end of edit/normal ternary */}

                              {/* Edited label — แสดงใต้ bubble */}
                              {msg.editedAt && editingMessageId !== msg.id && (
                                <span className={`text-[10px] text-gray-400 italic px-1 mt-0.5 ${isMine ? "self-end" : "self-start"}`}>
                                  แก้ไขแล้ว
                                </span>
                              )}

                              {/* Timestamp row */}
                              {showTime && editingMessageId !== msg.id && (
                                <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                                  <span className="text-[11px] text-gray-400">{msgTime}</span>
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
                        </React.Fragment>
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

        {/* Right Panel — Conversation List (hidden on mobile when room selected) */}
        <div className={`w-full lg:w-75 lg:min-w-[256px] lg:max-w-[400px] flex flex-col border-l border-gray-100 bg-white h-full ${selectedRoomId ? "hidden lg:flex" : "flex"}`}>
          {/* Header */}
          <div className="flex-none px-4 lg:px-6 pt-14 lg:pt-8 pb-4">
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
                (r.displayName ?? "").toLowerCase().includes(searchQuery.toLowerCase())
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
                  (r.displayName ?? "").toLowerCase().includes(searchQuery.toLowerCase())
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
                    const rawContent = room.lastMessage.content;
                    // ถ้าเป็น market card หรือ post card ให้แสดง label แทน JSON
                    const content = parseMarketCard(rawContent) ? "🛍️ สินค้า" : parsePostCard(rawContent) ? "📬 โพสต์" : rawContent;

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
                          <span className={`text-sm truncate flex items-center gap-1 ${isActive || room.unreadCount > 0 ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                            {room.displayName}
                            {!room.isGroup && (() => {
                              const otherMember = room.members.find((m) => m.userId !== currentUserId);
                              if (otherMember?.userRole === "official_account") {
                                return (
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-blue-500 shrink-0 flex-none" aria-label="Verified official account">
                                    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                  </svg>
                                );
                              }
                              return null;
                            })()}
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

      {/* ── Add Member Modal ──────────────────────────────────────────────────── */}
      {isAddMemberOpen && selectedRoomId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsAddMemberOpen(false)}
          />
          <div className="relative w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[520px]">
            {/* Header */}
            <div className="flex-none flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button
                onClick={() => setIsAddMemberOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-gray-900 font-semibold text-base">เพิ่มสมาชิก</h2>
              <div className="w-8" />
            </div>

            {/* Search */}
            <div className="flex-none flex items-center gap-2 px-5 py-3 border-b border-gray-100">
              <span className="text-gray-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" strokeWidth="2" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="ค้นหาผู้ใช้..."
                value={addMemberSearch}
                onChange={(e) => setAddMemberSearch(e.target.value)}
                autoFocus
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {addMemberLoading ? (
                <div className="flex items-center justify-center h-full">
                  <svg className="w-6 h-6 animate-spin text-slate-300" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              ) : addMemberSuggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                  </svg>
                  <p className="text-sm text-gray-400">ไม่พบผู้ใช้</p>
                </div>
              ) : (
                addMemberSuggestions.map((s) => (
                  <div
                    key={s.rawId}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.avatar || "/default-avatar.svg"}
                      alt={s.displayName}
                      className="w-10 h-10 rounded-full object-cover flex-none"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{s.displayName}</p>
                      <p className="text-xs text-gray-400 truncate">{s.username}</p>
                    </div>
                    <button
                      onClick={() => handleAddMember(s.rawId)}
                      disabled={isAddingMember}
                      className="flex-none px-3 py-1.5 rounded-full bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      เพิ่ม
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Error */}
            {addMemberError && (
              <div className="flex-none px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-red-500 text-center">{addMemberError}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Room Info Popup Modal ─────────────────────────────────────────────── */}
      {isInfoPanelOpen && selectedRoomId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsInfoPanelOpen(false)}
          />
          {/* Modal */}
          <div className="relative w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex-none flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-gray-900 font-semibold text-base">
                {roomDetail?.isGroup ? "ข้อมูลกลุ่ม" : "ข้อมูลแชท"}
              </h2>
              <button
                onClick={() => setIsInfoPanelOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {roomDetailLoading ? (
                <div className="flex items-center justify-center h-40">
                  <svg className="w-6 h-6 animate-spin text-slate-300" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              ) : roomDetail ? (
                <>
                  {/* ── Direct Chat: แสดงสมาชิก ─────────────────────────────── */}
                  {!roomDetail.isGroup && (
                    <div className="px-5 py-5">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                        สมาชิกในแชท
                      </p>
                      <div className="flex flex-col gap-4">
                        {roomDetail.members.map((m) => {
                          const mAvatarUrl = m.avatarUrl ? apiService.getImageUrl(m.avatarUrl) : null;
                          const mName = `${m.firstName} ${m.lastName}`.trim() || "ไม่ระบุชื่อ";
                          const isMe = m.userId === currentUserId;
                          return (
                            <div key={m.userId} className="flex items-center gap-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={mAvatarUrl ?? "/default-avatar.svg"}
                                alt={mName}
                                className="w-12 h-12 rounded-full object-cover flex-none ring-2 ring-gray-100"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate flex items-center gap-1">
                                  {mName}
                                  {m.userRole === "official_account" && (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-blue-500 shrink-0 flex-none" aria-label="Verified official account">
                                      <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">{isMe ? "คุณ" : "สมาชิก"}</p>
                              </div>
                              {isMe && (
                                <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">You</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Group Chat: รูป + ชื่อ + สมาชิก ────────────────────── */}
                  {roomDetail.isGroup && (
                    <>
                      {/* Avatar + Name edit */}
                      <div className="px-5 py-5 border-b border-gray-100">
                        {/* Group avatar centered */}
                        <div className="flex flex-col items-center mb-5">
                          <input
                            ref={editGroupAvatarInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleEditGroupAvatarChange}
                          />
                          <button
                            type="button"
                            onClick={() => editGroupAvatarInputRef.current?.click()}
                            className="relative w-24 h-24 rounded-full overflow-hidden group"
                            title="เปลี่ยนรูปกลุ่ม"
                          >
                            {editGroupAvatarPreview ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={editGroupAvatarPreview} alt="preview" className="w-full h-full object-cover" />
                            ) : roomDetail.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={apiService.getImageUrl(roomDetail.avatarUrl) ?? "/default-avatar.svg"}
                                alt="group"
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }}
                              />
                            ) : (
                              <DefaultGroupAvatar size={96} />
                            )}
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="text-white text-[10px] font-medium">เปลี่ยนรูป</span>
                            </div>
                          </button>
                          {/* Camera hint always visible below avatar */}
                          <p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            กดรูปเพื่อเปลี่ยนรูปกลุ่ม
                          </p>
                          {editGroupAvatarFile && (
                            <button
                              type="button"
                              onClick={() => { setEditGroupAvatarFile(null); setEditGroupAvatarPreview(null); }}
                              className="text-xs text-red-400 hover:text-red-500 mt-1 transition-colors"
                            >
                              ยกเลิกรูปใหม่
                            </button>
                          )}
                        </div>

                        {/* Group name input */}
                        <div className="mb-4">
                          <label className="text-xs text-gray-500 font-medium mb-1.5 block">ชื่อกลุ่ม</label>
                          <input
                            type="text"
                            value={editGroupName}
                            onChange={(e) => setEditGroupName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !isSavingGroup) handleSaveGroupInfo(); }}
                            placeholder="ชื่อกลุ่ม..."
                            maxLength={50}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-gray-100 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                          />
                        </div>

                        {saveGroupError && <p className="text-xs text-red-500 mb-3">{saveGroupError}</p>}
                        {saveGroupSuccess && (
                          <div className="flex items-center gap-1.5 mb-3">
                            <svg className="w-3.5 h-3.5 text-green-500 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <p className="text-xs text-green-600">บันทึกเรียบร้อยแล้ว</p>
                          </div>
                        )}

                        <button
                          onClick={handleSaveGroupInfo}
                          disabled={isSavingGroup}
                          className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                            !isSavingGroup ? "bg-slate-700 hover:bg-slate-800 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          {isSavingGroup ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                              กำลังบันทึก...
                            </>
                          ) : "บันทึก"}
                        </button>
                      </div>

                      {/* Members list */}
                      <div className="px-5 py-5">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            สมาชิก · {roomDetail.memberCount} คน
                          </p>
                          {/* Add member button */}
                          <button
                            onClick={() => {
                              setAddMemberSearch("");
                              setAddMemberError(null);
                              setIsAddMemberOpen(true);
                            }}
                            className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-full transition-colors"
                            title="เพิ่มสมาชิก"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            เพิ่มสมาชิก
                          </button>
                        </div>
                        <div className="flex flex-col gap-3">
                          {roomDetail.members.map((m) => {
                            const mAvatarUrl = m.avatarUrl ? apiService.getImageUrl(m.avatarUrl) : null;
                            const mName = `${m.firstName} ${m.lastName}`.trim() || "ไม่ระบุชื่อ";
                            const isMe = m.userId === currentUserId;
                            return (
                              <div key={m.userId} className="flex items-center gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={mAvatarUrl ?? "/default-avatar.svg"}
                                  alt={mName}
                                  className="w-10 h-10 rounded-full object-cover flex-none"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate flex items-center gap-1">
                                    {mName}
                                    {m.userRole === "official_account" && (
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-blue-500 shrink-0 flex-none" aria-label="Verified official account">
                                        <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-400">{m.userId === roomDetail.createdBy ? "ผู้สร้างกลุ่ม" : "สมาชิก"}</p>
                                </div>
                                <div className="flex items-center gap-1.5 flex-none">
                                  {m.userId === roomDetail.createdBy && (
                                    <span className="text-[10px] font-semibold bg-slate-700 text-white px-2 py-0.5 rounded-full">ผู้สร้าง</span>
                                  )}
                          {isMe ? (
                                    <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">You</span>
                                  ) : (
                                    /* Remove member button — always visible */
                                    <button
                                      onClick={() => handleRemoveMember(m.userId, mName)}
                                      className="w-7 h-7 flex items-center justify-center rounded-full bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
                                      title={`นำ ${mName} ออกจากกลุ่ม`}
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Leave group button */}
                        <div className="mt-6 pt-5 border-t border-gray-100">
                          <button
                            onClick={handleLeaveGroup}
                            className="w-full py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 border border-red-100 transition-colors flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            ออกจากกลุ่ม
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Confirm Dialog ─────────────────────────────────────────────── */}
      {confirmDialog && (
        <div className="fixed inset-0 z-100 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setConfirmDialog(null)}
          />
          <div className="relative w-full max-w-xs mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-gray-900 font-semibold text-base mb-1.5">{confirmDialog.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-3.5 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <div className="w-px bg-gray-100" />
              <button
                onClick={confirmDialog.onConfirm}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                  confirmDialog.danger
                    ? "text-red-500 hover:bg-red-50"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {confirmDialog.confirmLabel ?? "ยืนยัน"}
              </button>
            </div>
          </div>
        </div>
      )}

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
