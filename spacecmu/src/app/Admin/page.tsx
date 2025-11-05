"use client";
import { useState } from "react";
import Sidebar from "../../components/Sidebar";

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
  const [activeTab, setActiveTab] = useState("users");
  const [selectedUser, setSelectedUser] = useState("");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementType, setAnnouncementType] = useState("global");

  const tabs = [
    { id: "users", name: "User Management", icon: "👥" },
    { id: "posts", name: "Post Management", icon: "📝" },
    { id: "announcements", name: "Announcements", icon: "📢" },
    { id: "activities", name: "User Activities", icon: "📊" },
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
    <div className="flex min-h-screen bg-white text-gray-800">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-gray-600">Manage SpaceCMU platform</p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          {/* Users Management */}
          {activeTab === "users" && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">User Management</h2>
              <div className="space-y-4">
                {mockUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-medium">{user.name}</h3>
                          <p className="text-sm text-gray-500">{user.username} • {user.email}</p>
                          <p className="text-xs text-gray-400">Joined: {user.joinDate}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.status === "active" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {user.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {user.status === "active" ? (
                        <button
                          onClick={() => handleBanUser(user.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          Ban User
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnbanUser(user.id)}
                          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                        >
                          Unban User
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts Management */}
          {activeTab === "posts" && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Post Management</h2>
              <div className="space-y-4">
                {mockPosts.map((post) => (
                  <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-medium">{post.author}</h3>
                          <p className="text-sm text-gray-700 mt-1">{post.content}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {post.date} • Reports: {post.reports}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          post.status === "active" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {post.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {post.status === "active" ? (
                        <button
                          onClick={() => handleBanPost(post.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          Ban Post
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnbanPost(post.id)}
                          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                        >
                          Unban Post
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Announcements */}
          {activeTab === "announcements" && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Send Announcements</h2>
              <div className="space-y-4">
                {/* Announcement Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Announcement Type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="global"
                        checked={announcementType === "global"}
                        onChange={(e) => setAnnouncementType(e.target.value)}
                        className="mr-2"
                      />
                      Global Announcement
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="private"
                        checked={announcementType === "private"}
                        onChange={(e) => setAnnouncementType(e.target.value)}
                        className="mr-2"
                      />
                      Private Message
                    </label>
                  </div>
                </div>

                {/* User Selection (for private messages) */}
                {announcementType === "private" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select User
                    </label>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Select a user...</option>
                      {mockUsers.filter(user => user.status === "active").map((user) => (
                        <option key={user.id} value={user.username}>
                          {user.name} ({user.username})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Message Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Enter your announcement message..."
                  />
                </div>

                <button
                  onClick={handleSendAnnouncement}
                  disabled={!announcementText || (announcementType === "private" && !selectedUser)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Send {announcementType === "global" ? "Global" : "Private"} Announcement
                </button>
              </div>
            </div>
          )}

          {/* User Activities */}
          {activeTab === "activities" && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">User Activities</h2>
              <div className="space-y-3">
                {mockActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-medium">{activity.user}</h3>
                          <p className="text-sm text-gray-600">{activity.action}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{activity.timestamp}</p>
                      <p className="text-xs text-gray-400">IP: {activity.ip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
            <p className="text-2xl font-bold text-gray-900">1,234</p>
            <p className="text-sm text-green-600">+12% from last month</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
            <p className="text-2xl font-bold text-gray-900">1,180</p>
            <p className="text-sm text-green-600">+8% from last month</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Posts</h3>
            <p className="text-2xl font-bold text-gray-900">5,678</p>
            <p className="text-sm text-green-600">+15% from last month</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Banned Content</h3>
            <p className="text-2xl font-bold text-gray-900">23</p>
            <p className="text-sm text-red-600">+2 this week</p>
          </div>
        </div>
      </div>
    </div>
  );
}
