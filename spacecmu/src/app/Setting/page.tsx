"use client";
import { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Chatbox from "../../components/Chatbox";
import Image from "next/image";

export default function SettingPage() {
  const [activeTab, setActiveTab] = useState("profile");
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

  const tabs = [
    { id: "profile", name: "Profile" },
    { id: "account", name: "Account" },
    { id: "notifications", name: "Notifications" },
    { id: "privacy", name: "Privacy" },
    { id: "appearance", name: "Appearance" },
  ];

  return (
    <div className="flex min-h-screen bg-white text-gray-800">
      <Sidebar />
      
      <main className="flex-1 p-8">
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
              className="w-full pl-10 pr-3 py-2 rounded-full bg-white text-sm text-gray-900 placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8 flex gap-8 border-b border-gray-200">
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

        {/* Content */}
        <div className="max-w-3xl min-h-[600px]">
          {/* Profile Settings */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              {/* Profile Picture Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-lg font-bold text-gray-800 mb-6">Profile Picture</h2>
                <div className="flex items-center gap-6">
                  <Image
                    src="/tanjiro.jpg"
                    alt="Profile"
                    width={80}
                    height={80}
                    className="rounded-full"
                  />
                  <div>
                    <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">
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
                    defaultValue="@6506xxxxx"
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
                  defaultValue="Kamado Tanjiro"
                  className="w-full px-4 py-3 text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors"
                  placeholder="Enter your name"
                />
              </div>

              {/* Bio Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Bio</h2>
                <textarea
                  rows={4}
                  defaultValue="CMU Student | CPE Major"
                  className="w-full px-4 py-3 text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors resize-none"
                  placeholder="Tell us about yourself"
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button className="px-6 py-2 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors">
                  Save Changes
                </button>
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
                      notifications.email ? "bg-black" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        notifications.email ? "translate-x-5" : "translate-x-0"
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
                      notifications.push ? "bg-black" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        notifications.push ? "translate-x-5" : "translate-x-0"
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
                      notifications.sms ? "bg-black" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        notifications.sms ? "translate-x-5" : "translate-x-0"
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
                      privacy.profileVisible ? "bg-black" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        privacy.profileVisible ? "translate-x-5" : "translate-x-0"
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
                      privacy.showEmail ? "bg-black" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        privacy.showEmail ? "translate-x-5" : "translate-x-0"
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
                      privacy.allowMessages ? "bg-black" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        privacy.allowMessages ? "translate-x-5" : "translate-x-0"
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
                  <button className="flex-1 py-3 px-4 border-2 border-black rounded-lg text-center font-semibold text-gray-800 hover:bg-gray-50 transition-colors">
                    Light
                  </button>
                  <button className="flex-1 py-3 px-4 border-2 border-gray-200 rounded-lg text-center font-semibold text-gray-800 hover:bg-gray-50 transition-colors">
                    Dark
                  </button>
                  <button className="flex-1 py-3 px-4 border-2 border-gray-200 rounded-lg text-center font-semibold text-gray-800 hover:bg-gray-50 transition-colors">
                    Auto
                  </button>
                </div>
              </div>

              {/* Language Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-lg font-bold text-gray-800 mb-6">Language</h2>
                <select className="w-full px-4 py-3 text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors bg-white">
                  <option>ไทย (Thai)</option>
                  <option>English</option>
                  <option>日本語 (Japanese)</option>
                  <option>中文 (Chinese)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Chatbox - Bottom Right */}
      <Chatbox />
    </div>
  );
}
