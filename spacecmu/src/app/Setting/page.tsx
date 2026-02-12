"use client";
import { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Chatbox from "../../components/Chatbox";
import { useUser } from "@/contexts/UserContext";
import { apiService } from "@/lib/api";

export default function SettingPage() {
  const { activeUser } = useUser();
  const [activeTab, setActiveTab] = useState("profile");
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [newBanner, setNewBanner] = useState<string | null>(null);
  const [bio, setBio] = useState(activeUser?.bio || "");
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  });
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    showEmail: false,
    allowMessages: true,
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewBanner(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePhoto = () => {
    // TODO: Implement photo save logic
    console.log("Saving new photo:", newPhoto);
    setShowPhotoModal(false);
    setNewPhoto(null);
  };

  const handleSaveBanner = () => {
    // TODO: Implement banner save logic
    console.log("Saving new banner:", newBanner);
    setShowBannerModal(false);
    setNewBanner(null);
  };

  const handleCancelPhoto = () => {
    setShowPhotoModal(false);
    setNewPhoto(null);
  };

  const handleCancelBanner = () => {
    setShowBannerModal(false);
    setNewBanner(null);
  };

  const handleSaveBio = async () => {
    try {
      await apiService.patch('/api/users/profile/bio', { bio });
      alert('Bio updated successfully!');
    } catch (error) {
      console.error('Error updating bio:', error);
      alert('Failed to update bio. Please try again.');
    }
  };

  const tabs = [
    { id: "profile", name: "Profile" },
    { id: "account", name: "Account" },
    { id: "notifications", name: "Notifications" },
    { id: "privacy", name: "Privacy" },
    { id: "appearance", name: "Appearance" },
    { id: "official", name: "Official Account" },
  ];

  const officialAccounts = [
    {
      id: 1,
      name: "CMU Official",
      username: "@cmu_official",
      avatar: "/cmulogo.png",
      bio: "Official account of Chiang Mai University",
      followers: "500K",
      isFollowing: false,
    },
    {
      id: 2,
      name: "CMU Library",
      username: "@cmu_library",
      avatar: "/cmu.png",
      bio: "Central Library - Chiang Mai University",
      followers: "12K",
      isFollowing: true,
    },
    {
      id: 3,
      name: "CMU Engineering",
      username: "@cmu_engineering",
      avatar: "/cmulogo.png",
      bio: "Faculty of Engineering, CMU",
      followers: "25K",
      isFollowing: false,
    },
    {
      id: 4,
      name: "CMU Student Affairs",
      username: "@cmu_student",
      avatar: "/cmu.png",
      bio: "Student Affairs Division - CMU",
      followers: "18K",
      isFollowing: true,
    },
  ];

  const [followingState, setFollowingState] = useState(
    officialAccounts.reduce((acc, account) => {
      acc[account.id] = account.isFollowing;
      return acc;
    }, {} as Record<number, boolean>)
  );

  const toggleFollow = (accountId: number) => {
    setFollowingState((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));
  };

  return (
    <div className="flex h-screen bg-white text-gray-800 overflow-hidden">
      {/* Sidebar: keep fixed/sticky so it won't scroll with the main content */}
      <div className="flex-none h-screen sticky top-0 z-30">
        <Sidebar />
      </div>
      
      {/* Main content: fixed container with internal scroll */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Fixed header area (Search + Title + Tabs) */}
        <div className="flex-none pt-8 px-8 pb-4 bg-white z-10">
          {/* Search bar */}
          <div className="mb-6">
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-10 pr-3 py-2 rounded-full bg-white text-sm placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-8 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 font-semibold text-lg transition-all ${
                  activeTab === tab.id
                    ? "text-gray-800 border-b-2 border-black"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 min-w-0">
          <div className="max-w-3xl pt-8 ">          {/* Profile Settings */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              {/* Banner Picture Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-lg font-bold text-gray-800 mb-6">Banner Picture</h2>
                <div className="flex flex-col gap-4">
                  <div className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-gray-200">
                    {activeUser?.bannerUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeUser.bannerUrl}
                        alt="Banner"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-linear-to-r from-pink-200 via-yellow-200 to-green-200" />
                    )}
                  </div>
                  <div>
                    <button
                      onClick={() => setShowBannerModal(true)}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Change banner
                    </button>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF. Max 5MB. Recommended size: 1500x500</p>
                  </div>
                </div>
              </div>

              {/* Profile Picture Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-lg font-bold text-gray-800 mb-6">Profile Picture</h2>
                <div className="flex items-center gap-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeUser?.avatarUrl || "/tanjiro.jpg"}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <div>
                    <button 
                      onClick={() => setShowPhotoModal(true)}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Change photo
                    </button>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF. Max 5MB</p>
                  </div>
                </div>
              </div>

              {/* Username Section (Read-only) */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Username</h2>
                <div className="relative">
                  <input
                    type="text"
                    value={`@${activeUser?.username || ""}`}
                    disabled
                    className="w-full px-4 py-3 text-gray-500 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-2">Username cannot be changed</p>
                </div>
              </div>

              {/* Name Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Name</h2>
                <input
                  type="text"
                  defaultValue={`${activeUser?.firstName || ""} ${activeUser?.lastName || ""}`.trim()}
                  className="w-full px-4 py-3 text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors"
                  placeholder="Enter your name"
                />
                <div className="flex justify-start mt-4">
                  <button className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors">
                    Save Name
                  </button>
                </div>
              </div>

              {/* Student ID Section (Read-only) */}
              {activeUser?.studentId && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">Student ID</h2>
                  <div className="relative">
                    <input
                      type="text"
                      value={activeUser.studentId}
                      disabled
                      className="w-full px-4 py-3 text-gray-500 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

              {/* Faculty Section (Read-only) */}
              {activeUser?.faculty && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">Faculty</h2>
                  <div className="relative">
                    <input
                      type="text"
                      value={activeUser.faculty}
                      disabled
                      className="w-full px-4 py-3 text-gray-500 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

              {/* Major Section */}
              {activeUser?.major && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">Major</h2>
                  <input
                    type="text"
                    defaultValue={activeUser.major}
                    className="w-full px-4 py-3 text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors"
                    placeholder="Enter your major"
                  />
                </div>
              )}

              {/* Year Section */}
              {activeUser?.year && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">Year</h2>
                  <input
                    type="number"
                    defaultValue={activeUser.year}
                    className="w-full px-4 py-3 text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors"
                    placeholder="Enter your year"
                    min="1"
                    max="6"
                  />
                </div>
              )}

              {/* Bio Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Bio</h2>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-4 py-3 text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors resize-none"
                  placeholder="Tell us about yourself"
                />
                <div className="flex justify-start mt-4">
                  <button 
                    onClick={handleSaveBio}
                    className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
                  >
                    Save Bio
                  </button>
                </div>
              </div>

              
            </div>
          )}

          {/* Account Settings */}
          {activeTab === "account" && (
            <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-red-600 mb-2">Delete Account</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Once you delete your account, there is no going back. Please be certain. All your data, posts, and connections will be permanently removed.
                  </p>
                  <button className="px-6 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors">
                    Delete my account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-lg font-bold text-gray-800 mb-6">Notification Preferences</h2>
              
              <div className="space-y-1">
                {/* Email Notifications */}
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div>
                    <h3 className="font-semibold text-gray-800">Email notifications</h3>
                    <p className="text-sm text-gray-500">Receive email about your activity</p>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, email: !notifications.email })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      (activeUser?.notificationSettings?.email ?? notifications.email) ? "bg-black" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        (activeUser?.notificationSettings?.email ?? notifications.email) ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Push Notifications */}
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div>
                    <h3 className="font-semibold text-gray-800">Push notifications</h3>
                    <p className="text-sm text-gray-500">Receive push notifications on your device</p>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, push: !notifications.push })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      (activeUser?.notificationSettings?.push ?? notifications.push) ? "bg-black" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        (activeUser?.notificationSettings?.push ?? notifications.push) ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* SMS Notifications */}
                <div className="flex items-center justify-between py-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">SMS notifications</h3>
                    <p className="text-sm text-gray-500">Receive SMS about important updates</p>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, sms: !notifications.sms })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      (activeUser?.notificationSettings?.sms ?? notifications.sms) ? "bg-black" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        (activeUser?.notificationSettings?.sms ?? notifications.sms) ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Privacy */}
          {activeTab === "privacy" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-lg font-bold text-gray-800 mb-6">Privacy Settings</h2>
              
              <div className="space-y-1">
                {/* Profile Visibility */}
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div>
                    <h3 className="font-semibold text-gray-800">Profile visible</h3>
                    <p className="text-sm text-gray-500">Make your profile visible to others</p>
                  </div>
                  <button
                    onClick={() => setPrivacy({ ...privacy, profileVisible: !privacy.profileVisible })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      (activeUser?.privacySettings?.profileVisible ?? privacy.profileVisible) ? "bg-black" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        (activeUser?.privacySettings?.profileVisible ?? privacy.profileVisible) ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Show Email */}
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div>
                    <h3 className="font-semibold text-gray-800">Show email</h3>
                    <p className="text-sm text-gray-500">Display email on your profile</p>
                  </div>
                  <button
                    onClick={() => setPrivacy({ ...privacy, showEmail: !privacy.showEmail })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      (activeUser?.privacySettings?.showEmail ?? privacy.showEmail) ? "bg-black" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        (activeUser?.privacySettings?.showEmail ?? privacy.showEmail) ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Allow Messages */}
                <div className="flex items-center justify-between py-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">Allow messages</h3>
                    <p className="text-sm text-gray-500">Let others send you messages</p>
                  </div>
                  <button
                    onClick={() => setPrivacy({ ...privacy, allowMessages: !privacy.allowMessages })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      (activeUser?.privacySettings?.allowMessages ?? privacy.allowMessages) ? "bg-black" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        (activeUser?.privacySettings?.allowMessages ?? privacy.allowMessages) ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Appearance */}
          {activeTab === "appearance" && (
            <div className="space-y-4">
              {/* Theme Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-lg font-bold text-gray-800 mb-6">Theme</h2>
                <div className="flex gap-4">
                  <button className={`flex-1 py-3 px-4 border-2 rounded-lg text-center font-semibold text-gray-800 hover:bg-gray-50 transition-colors ${
                    (activeUser?.theme || "light") === "light" ? "border-black" : "border-gray-200"
                  }`}>
                    Light
                  </button>
                  <button className={`flex-1 py-3 px-4 border-2 rounded-lg text-center font-semibold text-gray-800 hover:bg-gray-50 transition-colors ${
                    activeUser?.theme === "dark" ? "border-black" : "border-gray-200"
                  }`}>
                    Dark
                  </button>
                </div>
              </div>

              {/* Language Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-lg font-bold text-gray-800 mb-6">Language</h2>
                <select 
                  defaultValue={activeUser?.language || "en"}
                  className="w-full px-4 py-3 text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors bg-white"
                >
                  <option value="th">ไทย (Thai)</option>
                  <option value="en">English</option>
                  <option value="ja">日本語 (Japanese)</option>
                  <option value="zh">中文 (Chinese)</option>
                </select>
              </div>
            </div>
          )}

          {/* Official Account */}
          {activeTab === "official" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-lg font-bold text-gray-800 mb-2">Suggested Official Accounts</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Follow verified official accounts to stay updated with important announcements
                </p>

                <div className="space-y-4">
                  {officialAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-start gap-4 p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={account.avatar}
                        alt={account.name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-800">{account.name}</h3>
                          {/* Verified Badge */}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="w-5 h-5 text-blue-500"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">{account.username}</p>
                        <p className="text-sm text-gray-600 mb-2">{account.bio}</p>
                        <p className="text-xs text-gray-400">{account.followers} followers</p>
                      </div>
                      <button
                        onClick={() => toggleFollow(account.id)}
                        className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                          followingState[account.id]
                            ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            : "bg-black text-white hover:bg-gray-800"
                        }`}
                      >
                        {followingState[account.id] ? "Following" : "Follow"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </main>

      {/* Chatbox - Bottom Right */}
      <Chatbox />

      {/* Photo Change Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Change Profile Photo</h2>
                <button
                  onClick={handleCancelPhoto}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5 text-gray-600"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8">
              <div className="grid grid-cols-2 gap-8">
                {/* Left: Current Photo */}
                <div className="flex flex-col items-center">
                  <p className="text-sm font-semibold text-gray-600 mb-4">Current Photo</p>
                  <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-gray-200 shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeUser?.avatarUrl || "/tanjiro.jpg"}
                      alt="Current Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Right: New Photo Upload */}
                <div className="flex flex-col items-center">
                  <p className="text-sm font-semibold text-gray-600 mb-4">New Photo</p>
                  <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-dashed border-gray-300 shadow-lg bg-gray-50 flex items-center justify-center group hover:border-blue-400 transition-colors">
                    {newPhoto ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={newPhoto}
                          alt="New Profile"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => setNewPhoto(null)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-8 h-8 text-white"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <label htmlFor="photo-upload" className="cursor-pointer flex flex-col items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-12 h-12 text-gray-400 group-hover:text-blue-500 transition-colors"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                          />
                        </svg>
                        <span className="text-sm text-gray-500 mt-3 group-hover:text-blue-600 transition-colors">
                          Click to upload
                        </span>
                      </label>
                    )}
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    JPG, PNG or GIF<br />Max 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCancelPhoto}
                className="px-6 py-2.5 rounded-full text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePhoto}
                disabled={!newPhoto}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                  newPhoto
                    ? "bg-black text-white hover:bg-gray-800"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Update Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner Change Modal */}
      {showBannerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Change Banner Photo</h2>
                <button
                  onClick={handleCancelBanner}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5 text-gray-600"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8">
              <div className="space-y-6">
                {/* Current Banner */}
                <div className="flex flex-col">
                  <p className="text-sm font-semibold text-gray-600 mb-4">Current Banner</p>
                  <div className="relative w-full h-56 rounded-xl overflow-hidden border-4 border-gray-200 shadow-lg">
                    {activeUser?.bannerUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeUser.bannerUrl}
                        alt="Current Banner"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-linear-to-r from-pink-200 via-yellow-200 to-green-200" />
                    )}
                  </div>
                </div>

                {/* New Banner Upload */}
                <div className="flex flex-col">
                  <p className="text-sm font-semibold text-gray-600 mb-4">New Banner</p>
                  <div className="relative w-full h-56 rounded-xl overflow-hidden border-4 border-dashed border-gray-300 shadow-lg bg-gray-50 flex items-center justify-center group hover:border-blue-400 transition-colors">
                    {newBanner ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={newBanner}
                          alt="New Banner"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => setNewBanner(null)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-10 h-10 text-white"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <label htmlFor="banner-upload" className="cursor-pointer flex flex-col items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-16 h-16 text-gray-400 group-hover:text-blue-500 transition-colors"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                          />
                        </svg>
                        <span className="text-sm text-gray-500 mt-3 group-hover:text-blue-600 transition-colors">
                          Click to upload
                        </span>
                        <span className="text-xs text-gray-400 mt-1">
                          Recommended size: 1500x500
                        </span>
                      </label>
                    )}
                    <input
                      id="banner-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={handleBannerUpload}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    JPG, PNG or GIF • Max 5MB • Recommended size: 1500x500 pixels
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCancelBanner}
                className="px-6 py-2.5 rounded-full text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBanner}
                disabled={!newBanner}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                  newBanner
                    ? "bg-black text-white hover:bg-gray-800"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Update Banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
