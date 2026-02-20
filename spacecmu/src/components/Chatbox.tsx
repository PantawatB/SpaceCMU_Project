"use client";

import { useState } from "react";
import Image from "next/image";

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

const Chatbox = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [chatMessage, setChatMessage] = useState("");

  // Mock data - replace with real data from API
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
      avatar: "/noobcat.png",
      lastMessage: "See you tomorrow!",
      time: "1h ago",
      unread: 0,
      online: true,
    },
    {
      id: 3,
      name: "Mike Wilson",
      avatar: "/noobcat.png",
      lastMessage: "Thanks for your help!",
      time: "3h ago",
      unread: 1,
      online: false,
    },
  ];

  const mockMessages: Message[] = [
    {
      id: 1,
      text: "Hey! How are you?",
      time: "10:30 AM",
      isMine: false,
    },
    {
      id: 2,
      text: "I'm good! How about you?",
      time: "10:32 AM",
      isMine: true,
    },
    {
      id: 3,
      text: "Great! Want to grab lunch later?",
      time: "10:33 AM",
      isMine: false,
    },
    {
      id: 4,
      text: "Sure! What time works for you?",
      time: "10:35 AM",
      isMine: true,
    },
  ];

  return (
    <>
      {/* Small Screen: iPhone-style Circular Button - Hidden at lg breakpoint (same as Sidebar) */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        {!isChatOpen && !selectedChat && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="w-14 h-14 rounded-full bg-white/80 backdrop-blur-xl shadow-2xl flex items-center justify-center border border-white/20 hover:scale-110 transition-all duration-300 active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6 text-blue-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </svg>
            {mockChats.filter((c) => c.unread > 0).length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {mockChats.reduce((sum, c) => sum + c.unread, 0)}
              </span>
            )}
          </button>
        )}

        {/* Full Chat on Mobile */}
        {(isChatOpen || selectedChat) && (
          <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {!selectedChat ? (
              <>
                {/* Chat List Header - Mobile */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-6 h-6 text-blue-500"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                      />
                    </svg>
                    <h3 className="font-bold text-gray-800 text-lg">Messages</h3>
                    {mockChats.filter((c) => c.unread > 0).length > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {mockChats.reduce((sum, c) => sum + c.unread, 0)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition p-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Chat List - Mobile */}
                <div className="flex-1 overflow-y-auto">
                  {mockChats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => setSelectedChat(chat.id)}
                      className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 cursor-pointer transition border-b border-gray-50 active:bg-gray-100"
                    >
                      <div className="relative">
                        <Image
                          src={chat.avatar}
                          alt={chat.name}
                          width={52}
                          height={52}
                          className="rounded-full object-cover"
                        />
                        {chat.online && (
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-base text-gray-800 truncate">
                            {chat.name}
                          </h4>
                          <span className="text-xs text-gray-400">{chat.time}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-500 truncate">
                            {chat.lastMessage}
                          </p>
                          {chat.unread > 0 && (
                            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2">
                              {chat.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Individual Chat Header - Mobile */}
                <div className="flex-none flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedChat(null)}
                      className="text-gray-400 hover:text-gray-600 transition p-1.5 rounded-full hover:bg-gray-100"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 19.5L8.25 12l7.5-7.5"
                        />
                      </svg>
                    </button>
                    <div className="relative">
                      <Image
                        src={
                          mockChats.find((c) => c.id === selectedChat)?.avatar ||
                          "/noobcat.png"
                        }
                        alt="chat"
                        width={44}
                        height={44}
                        className="rounded-full object-cover w-11 h-11"
                      />
                      {mockChats.find((c) => c.id === selectedChat)?.online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-base text-gray-900 leading-tight">
                        {mockChats.find((c) => c.id === selectedChat)?.name}
                      </h4>
                      <p className={`text-xs leading-tight ${mockChats.find((c) => c.id === selectedChat)?.online ? "text-green-500" : "text-gray-400"}`}>
                        {mockChats.find((c) => c.id === selectedChat)?.online
                          ? "Active now"
                          : "Offline"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages - Mobile */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50">
                  {mockMessages.map((msg, idx) => {
                    const prevMsg = mockMessages[idx - 1];
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
                                src={mockChats.find((c) => c.id === selectedChat)?.avatar || "/noobcat.png"}
                                alt="avatar"
                                width={28}
                                height={28}
                                className="rounded-full object-cover w-7 h-7"
                              />
                            ) : (
                              <div className="w-7 h-7" />
                            )}
                          </div>
                        )}
                        <div className={`max-w-[72%] flex flex-col ${msg.isMine ? "items-end" : "items-start"}`}>
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              msg.isMine
                                ? "bg-slate-700 text-white rounded-br-sm"
                                : "bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100"
                            }`}
                          >
                            {msg.text}
                          </div>
                          <span className="text-[11px] text-gray-400 mt-0.5 px-1">{msg.time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Message Input - Mobile */}
                <div className="flex-none px-4 py-4 border-t border-gray-100 bg-white">
                  <div className="flex items-center gap-2">
                    {/* Attachment */}
                    <button className="flex-none w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>

                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && chatMessage.trim()) {
                          e.preventDefault();
                          console.log("Send message:", chatMessage);
                          setChatMessage("");
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
                      onClick={() => {
                        if (chatMessage.trim()) {
                          console.log("Send message:", chatMessage);
                          setChatMessage("");
                        }
                      }}
                      disabled={!chatMessage.trim()}
                      className={`flex-none w-9 h-9 flex items-center justify-center rounded-full transition-all ${
                        chatMessage.trim()
                          ? "bg-slate-700 hover:bg-slate-800 text-white shadow-sm active:bg-slate-900"
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
            )}
          </div>
        )}
      </div>

      {/* Desktop: Original Design - Show at lg breakpoint and above */}
      <div className="hidden lg:block fixed bottom-6 right-6 z-50">
        {/* Chat List View */}
        {!selectedChat && (
          <div
            className={`bg-white rounded-2xl shadow-2xl transition-all duration-300 ${
              isChatOpen ? "w-80 h-[480px]" : "w-80 h-14"
            }`}
          >
          {/* Chat Header */}
          <div
            className="flex items-center justify-between px-5 py-3 border-b border-gray-100 cursor-pointer"
            onClick={() => setIsChatOpen(!isChatOpen)}
          >
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 text-blue-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                />
              </svg>
              <h3 className="font-bold text-gray-800">Messages</h3>
              {mockChats.filter((c) => c.unread > 0).length > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {mockChats.reduce((sum, c) => sum + c.unread, 0)}
                </span>
              )}
            </div>
            <button className="text-gray-400 hover:text-gray-600 transition">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className={`w-5 h-5 transition-transform duration-300 ${
                  isChatOpen ? "rotate-0" : "rotate-180"
                }`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>
          </div>

          {/* Chat List */}
          {isChatOpen && (
            <div className="overflow-y-auto h-[calc(100%-56px)]">
              {mockChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat.id)}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 cursor-pointer transition border-b border-gray-50"
                >
                  <div className="relative">
                    <Image
                      src={chat.avatar}
                      alt={chat.name}
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                    {chat.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-sm text-gray-800 truncate">
                        {chat.name}
                      </h4>
                      <span className="text-xs text-gray-400">{chat.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500 truncate">
                        {chat.lastMessage}
                      </p>
                      {chat.unread > 0 && (
                        <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2">
                          {chat.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Individual Chat View */}
      {selectedChat && (
        <div className="bg-white rounded-2xl shadow-2xl w-80 h-[520px] flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setSelectedChat(null)}
                className="text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
              <div className="relative">
                <Image
                  src={
                    mockChats.find((c) => c.id === selectedChat)?.avatar ||
                    "/noobcat.png"
                  }
                  alt="chat"
                  width={36}
                  height={36}
                  className="rounded-full object-cover w-9 h-9"
                />
                {mockChats.find((c) => c.id === selectedChat)?.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
                )}
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-900 leading-tight">
                  {mockChats.find((c) => c.id === selectedChat)?.name}
                </h4>
                <p className={`text-xs leading-tight ${mockChats.find((c) => c.id === selectedChat)?.online ? "text-green-500" : "text-gray-400"}`}>
                  {mockChats.find((c) => c.id === selectedChat)?.online
                    ? "Active now"
                    : "Offline"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedChat(null);
                setIsChatOpen(false);
              }}
              className="text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50">
            {mockMessages.map((msg, idx) => {
              const prevMsg = mockMessages[idx - 1];
              const showAvatar = !msg.isMine && (!prevMsg || prevMsg.isMine);
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-1.5 ${msg.isMine ? "justify-end" : "justify-start"}`}
                >
                  {/* Receiver avatar */}
                  {!msg.isMine && (
                    <div className="w-6 h-6 flex-none">
                      {showAvatar ? (
                        <Image
                          src={mockChats.find((c) => c.id === selectedChat)?.avatar || "/noobcat.png"}
                          alt="avatar"
                          width={24}
                          height={24}
                          className="rounded-full object-cover w-6 h-6"
                        />
                      ) : (
                        <div className="w-6 h-6" />
                      )}
                    </div>
                  )}
                  <div className={`max-w-[72%] flex flex-col ${msg.isMine ? "items-end" : "items-start"}`}>
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                        msg.isMine
                          ? "bg-slate-700 text-white rounded-br-sm"
                          : "bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5 px-1">{msg.time}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Message Input */}
          <div className="flex-none px-3 py-3 border-t border-gray-100 bg-white rounded-b-2xl">
            <div className="flex items-center gap-1.5">
              {/* Attachment */}
              <button className="flex-none w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              <input
                type="text"
                placeholder="Type a message..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && chatMessage.trim()) {
                    e.preventDefault();
                    // TODO: Send message API call
                    console.log("Send message:", chatMessage);
                    setChatMessage("");
                  }
                }}
                className="flex-1 px-3 py-2 rounded-full bg-gray-100 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
              />

              {/* Emoji */}
              <button className="flex-none w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Send */}
              <button
                onClick={() => {
                  if (chatMessage.trim()) {
                    // TODO: Send message API call
                    console.log("Send message:", chatMessage);
                    setChatMessage("");
                  }
                }}
                disabled={!chatMessage.trim()}
                className={`flex-none w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                  chatMessage.trim()
                    ? "bg-slate-700 hover:bg-slate-800 text-white shadow-sm"
                    : "bg-gray-100 text-gray-300 cursor-not-allowed"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Chatbox;
