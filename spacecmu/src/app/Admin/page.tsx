"use client";
import { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Chatbox from "../../components/Chatbox";

// Mock Data
const mockUsers = [
  { id: 1, name: "Kamado Tanjiro", username: "@6506xxxxx", email: "tanjiro@cmu.ac.th", status: "active", joinDate: "2024-01-15" },
  { id: 2, name: "Zenitsu Agatsuma", username: "@6507xxxxx", email: "zenitsu@cmu.ac.th", status: "banned", joinDate: "2024-02-10" },
  { id: 3, name: "Inosuke Hashibira", username: "@6508xxxxx", email: "inosuke@cmu.ac.th", status: "active", joinDate: "2024-03-05" },
  { id: 4, name: "Nezuko Kamado", username: "@6509xxxxx", email: "nezuko@cmu.ac.th", status: "active", joinDate: "2024-01-20" },
];

const mockPosts = [
  { id: 1, author: "Kamado Tanjiro", content: "ใครมี slide วิชา CPE112 ให้หน่อยครับ", status: "active", date: "2024-11-05", reports: 0 },
  { id: 2, author: "Zenitsu Agatsuma", content: "ขายของต้องห้าม illegal content", status: "banned", date: "2024-11-04", reports: 15 },
  { id: 3, author: "Inosuke Hashibira", content: "หาเพื่อนทำโปรเจคกลุ่ม", status: "active", date: "2024-11-03", reports: 0 },
];

const mockActivities = [
  { id: 1, user: "Kamado Tanjiro", action: "Created a post", timestamp: "2024-11-05 14:30", ip: "192.168.1.1" },
  { id: 2, user: "Zenitsu Agatsuma", action: "Reported a post", timestamp: "2024-11-05 13:45", ip: "192.168.1.2" },
  { id: 3, user: "Inosuke Hashibira", action: "Liked a post", timestamp: "2024-11-05 12:15", ip: "192.168.1.3" },
  { id: 4, user: "Nezuko Kamado", action: "Updated profile", timestamp: "2024-11-05 11:00", ip: "192.168.1.4" },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedUser, setSelectedUser] = useState("");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementType, setAnnouncementType] = useState("global");
  const [searchQuery, setSearchQuery] = useState("");

  const tabs = [
    { id: "dashboard", name: "Dashboard", icon: "📊" },
    { id: "users", name: "Users", icon: "👥" },
    { id: "posts", name: "Posts", icon: "📝" },
    { id: "announcements", name: "Messages", icon: "📢" },
    { id: "activities", name: "Activities", icon: "⚡" },
  ];

  const handleBanUser = (userId: number) => {
    console.log(`Banning user ${userId}`);
    // Mock action
  };

  const handleUnbanUser = (userId: number) => {
    console.log(`Unbanning user ${userId}`);
    // Mock action
  };

  const handleBanPost = (postId: number) => {
    console.log(`Banning post ${postId}`);
    // Mock action
  };

  const handleUnbanPost = (postId: number) => {
    console.log(`Unbanning post ${postId}`);
    // Mock action
  };

  const handleSendAnnouncement = () => {
    if (announcementType === "global") {
      console.log(`Sending global announcement: ${announcementText}`);
    } else {
      console.log(`Sending private announcement to ${selectedUser}: ${announcementText}`);
    }
    setAnnouncementText("");
    setSelectedUser("");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === tab.id
                  ? "bg-black text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Dashboard */}
          {activeTab === "dashboard" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-2">👥</div>
                <div className="text-2xl font-bold text-gray-900">1,234</div>
                <div className="text-sm text-gray-500">Total Users</div>
                <div className="text-xs text-green-600 mt-1">↑ 12%</div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-2xl font-bold text-gray-900">1,180</div>
                <div className="text-sm text-gray-500">Active Users</div>
                <div className="text-xs text-green-600 mt-1">↑ 8%</div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-2">📝</div>
                <div className="text-2xl font-bold text-gray-900">5,678</div>
                <div className="text-sm text-gray-500">Total Posts</div>
                <div className="text-xs text-green-600 mt-1">↑ 15%</div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-2">🚫</div>
                <div className="text-2xl font-bold text-gray-900">23</div>
                <div className="text-sm text-gray-500">Banned</div>
                <div className="text-xs text-red-600 mt-1">↑ 2 this week</div>
              </div>
            </div>
          )}

          {/* Users Management */}
          {activeTab === "users" && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="bg-white p-4 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔍</span>
                  <input
                    type="text"
                    placeholder="Search by name or username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              {/* User List */}
              {(() => {
                const filteredUsers = mockUsers.filter((user) => 
                  user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  user.username.toLowerCase().includes(searchQuery.toLowerCase())
                );
                
                if (filteredUsers.length === 0) {
                  return (
                    <div className="bg-white p-8 rounded-xl border border-gray-100 text-center">
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="text-gray-500">No users found matching &ldquo;{searchQuery}&rdquo;</p>
                    </div>
                  );
                }
                
                return filteredUsers.map((user) => (
                  <div key={user.id} className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{user.name}</h3>
                          <p className="text-xs text-gray-500">{user.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.status === "active" 
                            ? "bg-green-50 text-green-700" 
                            : "bg-red-50 text-red-700"
                        }`}>
                          {user.status === "active" ? "✓ Active" : "✕ Banned"}
                        </span>
                        {user.status === "active" ? (
                          <button
                            onClick={() => handleBanUser(user.id)}
                            className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                          >
                            Ban
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnbanUser(user.id)}
                            className="px-4 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
                          >
                            Unban
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Posts Management */}
          {activeTab === "posts" && (
            <div className="space-y-3">
              {mockPosts.map((post) => (
                <div key={post.id} className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-900">{post.author}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          post.status === "active" 
                            ? "bg-green-50 text-green-700" 
                            : "bg-red-50 text-red-700"
                        }`}>
                          {post.status === "active" ? "✓" : "✕"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{post.content}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>📅 {post.date}</span>
                        <span>🚩 {post.reports} reports</span>
                      </div>
                    </div>
                    <div>
                      {post.status === "active" ? (
                        <button
                          onClick={() => handleBanPost(post.id)}
                          className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                        >
                          Ban
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnbanPost(post.id)}
                          className="px-4 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
                        >
                          Unban
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Announcements */}
          {activeTab === "announcements" && (
            <div className="bg-white p-6 rounded-xl border border-gray-100">
              <div className="space-y-5">
                {/* Announcement Type */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setAnnouncementType("global")}
                    className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
                      announcementType === "global"
                        ? "bg-black text-white"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    🌐 Global
                  </button>
                  <button
                    onClick={() => setAnnouncementType("private")}
                    className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
                      announcementType === "private"
                        ? "bg-black text-white"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    👤 Private
                  </button>
                </div>

                {/* User Selection (for private messages) */}
                {announcementType === "private" && (
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="">Select user...</option>
                    {mockUsers.filter(user => user.status === "active").map((user) => (
                      <option key={user.id} value={user.username}>
                        {user.name} ({user.username})
                      </option>
                    ))}
                  </select>
                )}

                {/* Message Content */}
                <textarea
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  rows={5}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                  placeholder="Type your message..."
                />

                <button
                  onClick={handleSendAnnouncement}
                  disabled={!announcementText || (announcementType === "private" && !selectedUser)}
                  className="w-full py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  📤 Send {announcementType === "global" ? "to Everyone" : "Message"}
                </button>
              </div>
            </div>
          )}

          {/* User Activities */}
          {activeTab === "activities" && (
            <div className="space-y-2">
              {mockActivities.map((activity) => (
                <div key={activity.id} className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                        ⚡
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-gray-900">{activity.user}</h3>
                        <p className="text-xs text-gray-500">{activity.action}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{activity.timestamp}</p>
                      <p className="text-xs text-gray-400">{activity.ip}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chatbox - Bottom Right */}
      <Chatbox />
    </div>
  );
}
