"use client";
import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Chatbox from "../../components/Chatbox";
import NotificationsPanel from "../../components/NotificationsPanel";
import { useUser } from "@/contexts/UserContext";
import { apiService } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

export default function SettingPage() {
  const { activeUser, activeMode, officialMode, refreshUser } = useUser();
  const { showSuccess, showError } = useToast();
  const [showMobileNotif, setShowMobileNotif] = useState(false);
  const [mobileNotifUnread, setMobileNotifUnread] = useState(0);
  const [activeTab, setActiveTab] = useState("profile");
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newBanner, setNewBanner] = useState<string | null>(null);
  const [newBannerFile, setNewBannerFile] = useState<File | null>(null);
  const [bio, setBio] = useState(activeUser?.bio || "");
  const [name, setName] = useState(`${activeUser?.firstName || ""} ${activeUser?.lastName || ""}`.trim());
  const [isSavingName, setIsSavingName] = useState(false);

  // Official accounts from API
  type OfficialAccount = {
    id: string;
    name: string;
    username: string;
    faculty: string;
    avatarUrl: string | null;
    bio: string | null;
    userId: string;
  };
  const [officialAccounts, setOfficialAccounts] = useState<OfficialAccount[]>([]);
  const [officialLoading, setOfficialLoading] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError('File size must be less than 5MB');
        return;
      }
      
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        showError('Only JPG, PNG, GIF, or WEBP files are allowed');
        return;
      }
      
      setNewPhotoFile(file);
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
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError('File size must be less than 5MB');
        return;
      }
      
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        showError('Only JPG, PNG, GIF, or WEBP files are allowed');
        return;
      }
      
      setNewBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewBanner(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePhoto = async () => {
    if (!newPhotoFile) {
      showError('Please select a photo first');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('avatar', newPhotoFile);

      await apiService.patchFormData<{ message: string; user: { id: string; avatarUrl: string } }>(
        '/api/users/profile/avatar',
        formData
      );


      showSuccess('Profile photo updated successfully!');
      
      // Refresh user data
      await refreshUser();
      
      setShowPhotoModal(false);
      setNewPhoto(null);
      setNewPhotoFile(null);
    } catch (error) {
      console.error('Error updating avatar:', error);
      showError(error instanceof Error ? error.message : 'Failed to update profile photo. Please try again.');
    }
  };

  const handleSaveBanner = async () => {
    if (!newBannerFile) {
      showError('Please select a banner first');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('banner', newBannerFile);

      await apiService.patchFormData<{ message: string; bannerUrl: string }>(
        '/api/settings/banner',
        formData
      );

      showSuccess('Banner updated successfully!');
      
      // Refresh user data
      await refreshUser();
      
      setShowBannerModal(false);
      setNewBanner(null);
      setNewBannerFile(null);
    } catch (error) {
      console.error('Error updating banner:', error);
      showError(error instanceof Error ? error.message : 'Failed to update banner. Please try again.');
    }
  };

  const handleCancelPhoto = () => {
    setShowPhotoModal(false);
    setNewPhoto(null);
    setNewPhotoFile(null);
  };

  const handleCancelBanner = () => {
    setShowBannerModal(false);
    setNewBanner(null);
    setNewBannerFile(null);
  };

  const handleSaveBio = async () => {
    try {
      await apiService.patch('/api/users/profile/bio', { bio });
      showSuccess('Bio updated successfully!');
    } catch (error) {
      console.error('Error updating bio:', error);
      showError('Failed to update bio. Please try again.');
    }
  };

  // ชื่อแก้ได้เฉพาะ Anonymous และ Official Account เท่านั้น (Public ล็อก)
  const isNameEditable = activeMode === 'ANONYMOUS' || officialMode !== null;

  const handleSaveName = async () => {
    if (!isNameEditable) return;
    const trimmed = name.trim();
    if (!trimmed) {
      showError('กรุณาใส่ชื่อ');
      return;
    }
    setIsSavingName(true);
    try {
      // แยก firstName / lastName ด้วย space แรก
      const spaceIdx = trimmed.indexOf(' ');
      const firstName = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
      const lastName  = spaceIdx === -1 ? ''      : trimmed.slice(spaceIdx + 1);
      await apiService.patch('/api/settings/profile', { firstName, lastName });
      await refreshUser();
      showSuccess('อัปเดตชื่อเรียบร้อยแล้ว!');
    } catch (error) {
      console.error('Error updating name:', error);
      showError(error instanceof Error ? error.message : 'ไม่สามารถอัปเดตชื่อได้ กรุณาลองใหม่');
    } finally {
      setIsSavingName(false);
    }
  };

  const tabs = [
    { id: "profile", name: "Profile" },
    { id: "appearance", name: "Appearance" },
    { id: "official", name: "Official Account" },
  ];

  // Fetch official accounts from API when tab is opened
  useEffect(() => {
    if (activeTab !== "official") return;
    setOfficialLoading(true);
    apiService.get<OfficialAccount[]>("/api/users/official-accounts")
      .then((data) => setOfficialAccounts(data))
      .catch(() => setOfficialAccounts([]))
      .finally(() => setOfficialLoading(false));
  }, [activeTab]);

  return (
    <div className="flex h-dvh bg-white text-gray-800 overflow-hidden" style={{ height: '100dvh' }}>
      {/* Sidebar: keep fixed/sticky so it won't scroll with the main content */}
      <div className="flex-none h-screen sticky top-0 z-30">
        <Sidebar />
      </div>
      
      {/* Main content: fixed container with internal scroll */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Fixed header area (Title + Tabs) */}
        <div className="flex-none pt-5 sm:pt-8 px-4 sm:px-8 pb-0 bg-white z-10">
          {/* Header */}
          <div className="mb-6 sm:mb-6 sm:ml-10 ml-12 md:ml-10 lg:ml-0.5">
            <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>
          </div>

          {/* Navigation Tabs — horizontally scrollable on mobile */}
          <div className="flex gap-4 sm:gap-8 border-b border-gray-200 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 font-semibold text-base sm:text-base whitespace-nowrap shrink-0 transition-all ${
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
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8 min-w-0">
          <div className="max-w-3xl pt-5 sm:pt-8">          {/* Profile Settings */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              {/* Banner Picture Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8">
                <h2 className="text-lg font-bold text-gray-800 mb-6">Banner Picture</h2>
                <div className="flex flex-col gap-4">
                  <div className="relative w-full h-48 rounded-xl overflow-hidden border-2 border-gray-200">
                    {activeUser?.bannerUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={apiService.getImageUrl(activeUser.bannerUrl) || ""}
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8">
                <h2 className="text-lg font-bold text-gray-800 mb-6">Profile Picture</h2>
                <div className="flex items-center gap-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={apiService.getImageUrl(activeUser?.avatarUrl) || "/default-avatar.svg"}
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8">
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800">Name</h2>
                  {!isNameEditable && (
                    <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Public — แก้ไขไม่ได้
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => isNameEditable && setName(e.target.value.slice(0, 50))}
                  disabled={!isNameEditable}
                  maxLength={50}
                  className={`w-full px-4 py-3 border rounded-lg transition-colors ${
                    isNameEditable
                      ? "text-gray-900 border-gray-200 focus:outline-none focus:border-black"
                      : "text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed"
                  }`}
                  placeholder="Enter your name"
                />
                {isNameEditable && (
                  <p className={`text-xs mt-1 text-right ${name.length >= 50 ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                    {name.length}/50
                  </p>
                )}
                {isNameEditable ? (
                  <div className="flex justify-start mt-3">
                    <button
                      onClick={handleSaveName}
                      disabled={isSavingName || !name.trim()}
                      className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                        isSavingName || !name.trim()
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-black text-white hover:bg-gray-800"
                      }`}
                    >
                      {isSavingName && (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      )}
                      {isSavingName ? 'กำลังบันทึก...' : 'Save Name'}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-2">
                    สามารถเปลี่ยนชื่อได้เฉพาะในโหมด Anonymous หรือ Official Account เท่านั้น
                  </p>
                )}
              </div>

              {/* Student ID Section (Read-only) */}
              {activeUser?.studentId && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8">
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
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8">
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
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8">
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
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8">
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Bio</h2>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 160))}
                  maxLength={160}
                  className="w-full px-4 py-3 text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors resize-none"
                  placeholder="Tell us about yourself"
                />
                <p className={`text-xs mt-1 text-right ${bio.length >= 160 ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                  {bio.length}/160
                </p>
                <div className="flex justify-start mt-3">
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
          {activeTab === "account" && null}

          {/* Notifications */}
          {activeTab === "notifications" && null}

          {/* Privacy */}
          {activeTab === "privacy" && null}

          {/* Appearance */}
          {activeTab === "appearance" && (
            <div className="space-y-4">
              {/* Coming Soon banner */}
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 font-medium">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                ฟีเจอร์นี้ยังไม่เปิดใช้งาน — Coming soon
              </div>

              {/* Theme Section — locked */}
              <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8 select-none">
                <div className="absolute inset-0 bg-white/60 rounded-2xl z-10 cursor-not-allowed" />
                <h2 className="text-lg font-bold text-gray-400 mb-6">Theme</h2>
                <div className="flex gap-4">
                  <button disabled className="flex-1 py-3 px-4 border-2 border-gray-200 rounded-lg text-center font-semibold text-gray-300 cursor-not-allowed">
                    Light
                  </button>
                  <button disabled className="flex-1 py-3 px-4 border-2 border-gray-200 rounded-lg text-center font-semibold text-gray-300 cursor-not-allowed">
                    Dark
                  </button>
                </div>
              </div>

              {/* Language Section — locked */}
              <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8 select-none">
                <div className="absolute inset-0 bg-white/60 rounded-2xl z-10 cursor-not-allowed" />
                <h2 className="text-lg font-bold text-gray-400 mb-6">Language</h2>
                <select
                  disabled
                  className="w-full px-4 py-3 text-gray-300 border border-gray-200 rounded-lg bg-white cursor-not-allowed"
                >
                  <option>English</option>
                </select>
              </div>
            </div>
          )}

          {/* Official Account */}
          {activeTab === "official" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8">
                <h2 className="text-lg font-bold text-gray-800 mb-2">Official Accounts</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Official accounts registered in the SpaceCMU system
                </p>

                {/* Loading */}
                {officialLoading && (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
                  </div>
                )}

                {/* Empty state */}
                {!officialLoading && officialAccounts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <svg className="w-20 h-20 text-gray-200 mb-4" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                      <circle cx="12" cy="8" r="4" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.58-7 8-7s8 3 8 7" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 3.5a4 4 0 010 9" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 14c2.21.9 4 2.87 4 5" />
                    </svg>
                    <p className="text-gray-400 font-semibold text-base">ยังไม่มี Official Account ในระบบ</p>
                    <p className="text-gray-300 text-sm mt-1">Official accounts will appear here once they are created</p>
                  </div>
                )}

                {/* Account list */}
                {!officialLoading && officialAccounts.length > 0 && (
                  <div className="space-y-4">
                    {officialAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-start gap-4 p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={apiService.getImageUrl(account.avatarUrl) || "/default-avatar.svg"}
                          alt={account.name}
                          className="w-14 h-14 rounded-full object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-800 truncate">{account.name}</h3>
                            {/* Verified Badge */}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-500 shrink-0">
                              <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <p className="text-sm text-gray-500 mb-1">@{account.username}</p>
                          {account.faculty && (
                            <p className="text-xs text-blue-600 font-medium mb-1">{account.faculty}</p>
                          )}
                          {account.bio && (
                            <p className="text-sm text-gray-600 line-clamp-2">{account.bio}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      </main>

      {/* Chatbox - Bottom Right */}
      <Chatbox />

      {/* Notifications Panel */}
      <NotificationsPanel
        userId={activeUser?.id ?? null}
        mobileOpen={showMobileNotif}
        onMobileClose={() => setShowMobileNotif(false)}
        onUnreadChange={setMobileNotifUnread}
      />

      {/* Mobile Notification Bell — above chatbox, hidden on lg+ */}
      <div className="lg:hidden fixed bottom-24 right-4 z-30">
        <button
          onClick={() => setShowMobileNotif((prev) => !prev)}
          className="w-14 h-14 rounded-full bg-white shadow-2xl flex items-center justify-center border border-gray-200 hover:scale-110 transition-all duration-200 active:scale-95 relative"
          aria-label="Notifications"
        >
          <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {mobileNotifUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              {mobileNotifUnread > 99 ? "99+" : mobileNotifUnread}
            </span>
          )}
        </button>
      </div>

      {/* Photo Change Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-800">Change Profile Photo</h2>
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
            <div className="p-4 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                {/* Left: Current Photo */}
                <div className="flex flex-col items-center">
                  <p className="text-sm font-semibold text-gray-600 mb-4">Current Photo</p>
                  <div className="relative w-32 h-32 sm:w-48 sm:h-48 rounded-full overflow-hidden border-4 border-gray-200 shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={apiService.getImageUrl(activeUser?.avatarUrl) || "/default-avatar.svg"}
                      alt="Current Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Right: New Photo Upload */}
                <div className="flex flex-col items-center">
                  <p className="text-sm font-semibold text-gray-600 mb-4">New Photo</p>
                  <div className="relative w-32 h-32 sm:w-48 sm:h-48 rounded-full overflow-hidden border-4 border-dashed border-gray-300 shadow-lg bg-gray-50 flex items-center justify-center group hover:border-blue-400 transition-colors">
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
                      accept="image/jpeg,image/png,image/gif,image/webp"
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
            <div className="px-4 sm:px-8 py-4 sm:py-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
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
            <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-800">Change Banner Photo</h2>
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
            <div className="p-4 sm:p-8">
              <div className="space-y-6">
                <div className="flex flex-col">
                  <p className="text-sm font-semibold text-gray-600 mb-4">Current Banner</p>
                  <div className="relative w-full h-56 rounded-xl overflow-hidden border-4 border-gray-200 shadow-lg">
                    {activeUser?.bannerUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={apiService.getImageUrl(activeUser.bannerUrl) || ""}
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
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleBannerUpload}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    JPG, PNG, GIF or WEBP • Max 5MB • Recommended size: 1500x500 pixels
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-8 py-4 sm:py-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
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
