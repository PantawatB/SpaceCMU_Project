"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Sidebar from "../../components/Sidebar";
import Image from "next/image";
import { apiService } from "@/lib/api";

interface Suggestion {
  id: number;
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

interface Chat {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
}

interface Message {
  id: number;
  text: string;
  time: string;
  isMine: boolean;
}

const mockChats: Chat[] = [
  {
    id: 1,
    name: "John Doe",
    avatar: "/noobcat.png",
    lastMessage: "Hey! How are you?",
    time: "2m ago",
    unread: 2,
    online: true,
  },
  {
    id: 2,
    name: "Jane Smith",
    avatar: "/tanjiro.jpg",
    lastMessage: "See you tomorrow!",
    time: "1h ago",
    unread: 0,
    online: true,
  },
  {
    id: 3,
    name: "Mike Wilson",
    avatar: "/zenitsu.jpg",
    lastMessage: "Thanks for your help!",
    time: "3h ago",
    unread: 1,
    online: false,
  },
  {
    id: 4,
    name: "Sara Lee",
    avatar: "/shinobu.jpg",
    lastMessage: "Can you send me the notes?",
    time: "Yesterday",
    unread: 0,
    online: false,
  },
  {
    id: 5,
    name: "Kyojuro Rengoku",
    avatar: "/kyojuro.jpg",
    lastMessage: "Set your heart ablaze! 🔥",
    time: "Yesterday",
    unread: 3,
    online: true,
  },
  {
    id: 6,
    name: "Nezuko Chan",
    avatar: "/nezuko.jpg",
    lastMessage: "🎋",
    time: "Mon",
    unread: 0,
    online: false,
  },
];

const mockMessagesMap: Record<number, Message[]> = {
  1: [
    { id: 1, text: "Hey! How are you?", time: "10:30 AM", isMine: false },
    { id: 2, text: "I'm good! How about you?", time: "10:32 AM", isMine: true },
    { id: 3, text: "Great! Want to grab lunch later?", time: "10:33 AM", isMine: false },
    { id: 4, text: "Sure! What time works for you?", time: "10:35 AM", isMine: true },
    { id: 5, text: "How about 12:30 at the cafeteria?", time: "10:36 AM", isMine: false },
    { id: 6, text: "Sounds perfect 👍", time: "10:37 AM", isMine: true },
  ],
  2: [
    { id: 1, text: "Hey, are you coming to the study group?", time: "9:00 AM", isMine: false },
    { id: 2, text: "Yes, I'll be there at 3 PM", time: "9:05 AM", isMine: true },
    { id: 3, text: "See you tomorrow!", time: "9:06 AM", isMine: false },
  ],
  3: [
    { id: 1, text: "I really needed that!", time: "Yesterday", isMine: false },
    { id: 2, text: "No problem, anytime 😊", time: "Yesterday", isMine: true },
    { id: 3, text: "Thanks for your help!", time: "Yesterday", isMine: false },
  ],
  4: [
    { id: 1, text: "Did you go to lecture today?", time: "Mon", isMine: false },
    { id: 2, text: "Yes I did, it was great!", time: "Mon", isMine: true },
    { id: 3, text: "Can you send me the notes?", time: "Mon", isMine: false },
  ],
  5: [
    { id: 1, text: "Training session at 7 AM tomorrow?", time: "Yesterday", isMine: false },
    { id: 2, text: "I'll be there!", time: "Yesterday", isMine: true },
    { id: 3, text: "Set your heart ablaze! 🔥", time: "Yesterday", isMine: false },
  ],
  6: [
    { id: 1, text: "🎋", time: "Mon", isMine: false },
  ],
};

export default function ChatPage() {
  const [selectedChatId, setSelectedChatId] = useState<number | null>(1);
  const [chatMessage, setChatMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [messagesState, setMessagesState] = useState<Record<number, Message[]>>(mockMessagesMap);
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsError, setSuggestionsError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New message modal state
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const [selectedSuggestions, setSelectedSuggestions] = useState<number[]>([]);

  // derive label จาก search text โดยตรง
  const suggestionLabel = newChatSearch.trim() === "" ? "Suggested" : "Results";

  const mapApiItems = (items: FriendApiItem[]): Suggestion[] =>
    items.slice(0, 10).map((f) => ({
      id: parseInt(f.id.replace(/-/g, "").slice(0, 8), 16),
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

  const filteredChats = chats.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedChat = chats.find((c) => c.id === selectedChatId) || null;
  const currentMessages = useMemo(
    () => (selectedChatId ? messagesState[selectedChatId] || [] : []),
    [selectedChatId, messagesState]
  );

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  // Mark as read when selecting a chat
  const handleSelectChat = (chatId: number) => {
    setSelectedChatId(chatId);
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c))
    );
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim() || !selectedChatId) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newMessage: Message = {
      id: Date.now(),
      text: chatMessage.trim(),
      time: timeStr,
      isMine: true,
    };

    setMessagesState((prev) => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), newMessage],
    }));

    // Update last message in chat list
    setChats((prev) =>
      prev.map((c) =>
        c.id === selectedChatId
          ? { ...c, lastMessage: chatMessage.trim(), time: "Just now" }
          : c
      )
    );

    setChatMessage("");
  };

  const totalUnread = chats.reduce((sum, c) => sum + c.unread, 0);

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
            onClick={() => {
              setIsNewChatOpen(false);
              setNewChatSearch("");
              setSelectedSuggestions([]);
            }}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px]">
            {/* Modal Header */}
            <div className="flex-none flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button
                onClick={() => {
                  setIsNewChatOpen(false);
                  setNewChatSearch("");
                  setSelectedSuggestions([]);
                }}
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
                            src={s.avatar || "/noobcat.png"}
                            alt={s.displayName}
                            className="rounded-full object-cover w-12 h-12"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = "/noobcat.png";
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
              <button
                disabled={selectedSuggestions.length === 0}
                onClick={() => {
                  // TODO: open/create chat with selected users
                  setIsNewChatOpen(false);
                  setNewChatSearch("");
                  setSelectedSuggestions([]);
                }}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  selectedSuggestions.length > 0
                    ? "bg-slate-700 hover:bg-slate-800 text-white shadow-sm"
                    : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
              >
                Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Layout */}
      <main className="flex-1 flex h-screen overflow-hidden min-w-0">
        {/* Left Panel — Conversation Window */}
        <div className="flex-1 flex flex-col h-full min-w-0 bg-gray-50">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="flex-none flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Image
                      src={selectedChat.avatar}
                      alt={selectedChat.name}
                      width={44}
                      height={44}
                      className="rounded-full object-cover w-11 h-11"
                    />
                    {selectedChat.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 text-base leading-tight">
                      {selectedChat.name}
                    </h2>
                    <p className={`text-xs ${selectedChat.online ? "text-green-500" : "text-gray-400"}`}>
                      {selectedChat.online ? "Active now" : "Offline"}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                  <button className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Voice call">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </button>
                  <button className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Video call">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="More options">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
                {/* Date separator */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium px-2">Today</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {currentMessages.map((msg, idx) => {
                  const prevMsg = currentMessages[idx - 1];
                  const showAvatar = !msg.isMine && (!prevMsg || prevMsg.isMine);

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${msg.isMine ? "justify-end" : "justify-start"}`}
                    >
                      {/* Receiver avatar */}
                      {!msg.isMine && (
                        <div className="w-7 h-7 flex-none">
                          {showAvatar ? (
                            <Image
                              src={selectedChat.avatar}
                              alt={selectedChat.name}
                              width={28}
                              height={28}
                              className="rounded-full object-cover w-7 h-7"
                            />
                          ) : (
                            <div className="w-7 h-7" />
                          )}
                        </div>
                      )}

                      <div className={`max-w-[65%] flex flex-col ${msg.isMine ? "items-end" : "items-start"}`}>
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            msg.isMine
                              ? "bg-slate-700 text-white rounded-br-sm"
                              : "bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100"
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[11px] text-gray-400 mt-1 px-1">{msg.time}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="flex-none px-6 py-4 bg-white border-t border-gray-100">
                <div className="flex items-center gap-3">
                  {/* Attachment */}
                  <button className="flex-none w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>

                  <input
                    type="text"
                    placeholder="พิมพ์ข้อความ..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 px-4 py-2.5 rounded-full bg-gray-100 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                  />

                  {/* Emoji */}
                  <button className="flex-none w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>

                  {/* Send */}
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim()}
                    className={`flex-none w-9 h-9 flex items-center justify-center rounded-full transition-all ${
                      chatMessage.trim()
                        ? "bg-slate-700 hover:bg-slate-800 text-white shadow-sm"
                        : "bg-gray-100 text-gray-300 cursor-not-allowed"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
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
                {totalUnread > 0 && (
                  <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {totalUnread}
                  </span>
                )}
              </div>
              {/* New Chat Button */}
              <button
                onClick={() => setIsNewChatOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600"
                title="New message"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
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
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 px-6">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm">ไม่พบการสนทนา</p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isActive = chat.id === selectedChatId;
                return (
                  <button
                    key={chat.id}
                    onClick={() => handleSelectChat(chat.id)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 transition-colors text-left group ${
                      isActive
                        ? "bg-gray-100"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-none">
                      <Image
                        src={chat.avatar}
                        alt={chat.name}
                        width={48}
                        height={48}
                        className="rounded-full object-cover w-12 h-12"
                      />
                      {chat.online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-sm truncate ${isActive || chat.unread > 0 ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                          {chat.name}
                        </span>
                        <span className="text-xs text-gray-400 flex-none ml-2">{chat.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-xs truncate ${chat.unread > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                          {chat.lastMessage}
                        </p>
                        {chat.unread > 0 && (
                          <span className="ml-2 flex-none bg-blue-500 text-white text-xs font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                            {chat.unread}
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
    </div>
  );
}
