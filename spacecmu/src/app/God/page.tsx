"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { useUser } from "@/contexts/UserContext";
import { apiService, type GodStats, type GodUser, type GodActivity } from "@/lib/api";

type TabId = "dashboard" | "users" | "announcements" | "activities" | "official";

interface LocalAnnouncement {
  id: number;
  type: "global" | "private";
  target?: string;
  message: string;
  sentAt: string;
}


export default function GodPage() {
  const router = useRouter();
  const { activeUser, isLoading } = useUser();

  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [stats, setStats] = useState<GodStats | null>(null);
  const [users, setUsers] = useState<GodUser[]>([]);
  const [activities, setActivities] = useState<GodActivity[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [annType, setAnnType] = useState<"global" | "private">("global");
  const [annTarget, setAnnTarget] = useState("");
  const [annMsg, setAnnMsg] = useState("");
  const [annHistory, setAnnHistory] = useState<LocalAnnouncement[]>([]);
  const [annSending, setAnnSending] = useState(false);

  // Official Account state
  const [offFirstName, setOffFirstName] = useState("");
  const [offUsername, setOffUsername] = useState("");
  const [offFaculty, setOffFaculty] = useState("");
  const [offCreating, setOffCreating] = useState(false);
  const [offSearch, setOffSearch] = useState("");
  const [offSearchResults, setOffSearchResults] = useState<GodUser[]>([]);
  const [offSearchLoading, setOffSearchLoading] = useState(false);
  const [offSelectedUser, setOffSelectedUser] = useState<GodUser | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStats = useCallback(async () => {
    setLoadingData(true);
    try {
      const data = await apiService.getGodStats();
      setStats(data);
    } catch {
      showToast("Failed to load stats", false);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingData(true);
    try {
      const data = await apiService.getGodUsers();
      setUsers(data);
    } catch {
      showToast("Failed to load users", false);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const fetchActivities = useCallback(async () => {
    setLoadingData(true);
    try {
      const data = await apiService.getGodActivities();
      setActivities(data);
    } catch {
      showToast("Failed to load activities", false);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && activeUser?.role !== "god") {
      router.replace("/Feeds");
    }
  }, [isLoading, activeUser, router]);

  useEffect(() => {
    if (activeUser?.role !== "god") return;
    if (activeTab === "dashboard") fetchStats();
    else if (activeTab === "users") fetchUsers();
    else if (activeTab === "activities") fetchActivities();
  }, [activeTab, activeUser, fetchStats, fetchUsers, fetchActivities]);

  const handleSetRole = async (userId: string, role: "user" | "admin") => {
    setActionLoading(`role-${userId}`);
    try {
      await apiService.setGodUserRole(userId, role);
      showToast(`Role updated to ${role}`);
      fetchUsers();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to update role", false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetStatus = async (userId: string, status: "active" | "banned") => {
    setActionLoading(`status-${userId}`);
    try {
      await apiService.setGodUserStatus(userId, status);
      showToast(`Status updated to ${status}`);
      fetchUsers();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to update status", false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!annMsg.trim()) return;
    if (annType === "private" && !annTarget.trim()) return;
    setAnnSending(true);
    await new Promise((r) => setTimeout(r, 600));
    setAnnHistory((prev) => [
      {
        id: Date.now(),
        type: annType,
        target: annType === "private" ? annTarget : undefined,
        message: annMsg,
        sentAt: new Date().toLocaleString(),
      },
      ...prev,
    ]);
    setAnnMsg("");
    setAnnTarget("");
    setAnnSending(false);
    showToast(annType === "global" ? "Announcement sent to everyone" : `Message sent to ${annTarget}`);
  };

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOffSearchChange = useCallback((q: string) => {
    setOffSearch(q);
    setOffSelectedUser(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setOffSearchResults([]);
      setOffSearchLoading(false);
      return;
    }
    setOffSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await apiService.searchUsers(q);
        setOffSearchResults(results);
      } catch {
        setOffSearchResults([]);
      } finally {
        setOffSearchLoading(false);
      }
    }, 300);
  }, []);

  const handleSelectOffUser = useCallback((user: GodUser) => {
    setOffSelectedUser((prev) => prev?.id === user.id ? null : user);
  }, []);

  const handleCreateOfficialAccount = async () => {
    if (!offFirstName.trim() || !offUsername.trim() || !offFaculty.trim()) return;
    setOffCreating(true);
    await new Promise((r) => setTimeout(r, 700));
    const username = offUsername.trim();
    setOffFirstName("");
    setOffUsername("");
    setOffFaculty("");
    setOffSelectedUser(null);
    setOffCreating(false);
    showToast(`Official account @${username} created`);
  };

  const filteredUsers = users.filter(
    (u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs: { id: TabId; name: string }[] = [
    { id: "dashboard",     name: "Dashboard" },
    { id: "users",         name: "Users" },
    { id: "announcements", name: "Messages" },
    { id: "activities",    name: "Activities" },
    { id: "official",      name: "Official Accounts" },
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="w-7 h-7 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
      </div>
    );
  }

  if (activeUser?.role !== "god") return null;

  const activeUsers = stats ? stats.totalUsers - stats.totalBanned : null;

  return (
    <div className="flex h-screen bg-white text-slate-800 overflow-hidden">
      {/* App Sidebar */}
      <div className="flex-none h-screen sticky top-0 z-30">
        <Sidebar />
      </div>

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">

        {/* Fixed header + tabs */}
        <div className="flex-none pt-8 px-8 pb-0 bg-white z-10">
          {/* Title row */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">God Control - SuperAdmin</h1>
              <p className="text-sm text-slate-400 mt-0.5">Platform-wide control — root access only</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-600 text-xs font-bold tracking-widest">
              ROOT
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-8 border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 font-semibold text-base transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-slate-900 border-b-2 border-slate-900"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 min-w-0">
          <div className="max-w-6xl pt-8 space-y-6">

            {/* ══════════════════════════════
                 DASHBOARD
            ══════════════════════════════ */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                {/* Stat cards */}
                {loadingData ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-28 rounded-2xl bg-slate-200 animate-pulse" />
                    ))}
                  </div>
                ) : stats ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Total Users",  value: stats.totalUsers,    icon: "👥", sub: `${activeUsers} active` },
                      { label: "Admins",        value: stats.totalAdmins,   icon: "🛡️", sub: "elevated role" },
                      { label: "Banned",        value: stats.totalBanned,   icon: "🚫", sub: "restricted" },
                      { label: "Total Posts",   value: stats.totalPosts,    icon: "📝", sub: "all time" },
                    ].map((card) => (
                      <div key={card.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                        <div className="text-3xl mb-2">{card.icon}</div>
                        <div className="text-2xl font-bold text-slate-900">{card.value.toLocaleString()}</div>
                        <div className="text-sm text-slate-600 mt-0.5">{card.label}</div>
                        <div className="text-xs text-slate-400 mt-1">{card.sub}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={fetchStats}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
                  >
                    Load Stats
                  </button>
                )}

                {/* Active sessions card */}
                {stats && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Active Sessions</p>
                        <p className="text-3xl font-bold text-slate-900 mt-1">{stats.activeSessions.toLocaleString()}</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-2xl">🟢</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════
                 USERS
            ══════════════════════════════ */}
            {activeTab === "users" && (
              <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      placeholder="Search name, username or email…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white text-sm placeholder-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-800"
                    />
                  </div>
                  <button
                    onClick={fetchUsers}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    Refresh
                  </button>
                  <span className="text-sm text-slate-400 ml-auto">
                    <span className="font-semibold text-slate-700">{filteredUsers.length}</span> users
                  </span>
                </div>

                {/* Table */}
                {loadingData ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-14 rounded-2xl bg-slate-200 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1.5fr] gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50">
                      {["User", "Email", "Role", "Status", "Actions"].map((h) => (
                        <p key={h} className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</p>
                      ))}
                    </div>

                    {/* Rows */}
                    {filteredUsers.length === 0 ? (
                      <div className="py-14 text-center">
                        <p className="text-sm text-slate-400">No users found</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {filteredUsers.map((u) => (
                          <li
                            key={u.id}
                            className="grid grid-cols-[2fr_2fr_1fr_1fr_1.5fr] gap-4 items-center px-5 py-3.5 hover:bg-slate-50 transition-colors"
                          >
                            {/* Name */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                                {u.firstName?.[0] ?? "?"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {u.firstName} {u.lastName}
                                </p>
                                {u.username && (
                                  <p className="text-xs text-slate-400 truncate">@{u.username}</p>
                                )}
                              </div>
                            </div>

                            {/* Email */}
                            <p className="text-sm text-slate-500 truncate">{u.email}</p>

                            {/* Role */}
                            <div><RoleBadge role={u.role} /></div>

                            {/* Status */}
                            <div><StatusBadge status={u.status} /></div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5">
                              {u.role === "god" ? (
                                <span className="text-xs text-slate-300 italic">Protected</span>
                              ) : (
                                <>
                                  {u.role === "user" ? (
                                    <ActionBtn
                                      loading={actionLoading === `role-${u.id}`}
                                      onClick={() => handleSetRole(u.id, "admin")}
                                      variant="purple"
                                      label="Make Admin"
                                    />
                                  ) : (
                                    <ActionBtn
                                      loading={actionLoading === `role-${u.id}`}
                                      onClick={() => handleSetRole(u.id, "user")}
                                      variant="gray"
                                      label="Make User"
                                    />
                                  )}
                                  {u.status === "active" ? (
                                    <ActionBtn
                                      loading={actionLoading === `status-${u.id}`}
                                      onClick={() => handleSetStatus(u.id, "banned")}
                                      variant="red"
                                      label="Ban"
                                    />
                                  ) : (
                                    <ActionBtn
                                      loading={actionLoading === `status-${u.id}`}
                                      onClick={() => handleSetStatus(u.id, "active")}
                                      variant="green"
                                      label="Unban"
                                    />
                                  )}
                                </>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════
                 ANNOUNCEMENTS / MESSAGES
            ══════════════════════════════ */}
            {activeTab === "announcements" && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6 items-start">

                {/* ── Left: Composer ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div>
                    <h2 className="font-semibold text-slate-900">New Announcement</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Broadcast to the whole platform or a single user</p>
                  </div>

                  {/* Type toggle */}
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                    {(["global", "private"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setAnnType(t)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                          annType === t
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        <span>{t === "global" ? "🌐" : "👤"}</span>
                        <span className="capitalize">{t}</span>
                      </button>
                    ))}
                  </div>

                  {/* Private target */}
                  {annType === "private" && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Recipient</label>
                      <input
                        type="text"
                        placeholder="Username or email…"
                        value={annTarget}
                        onChange={(e) => setAnnTarget(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-transparent focus:outline-none transition"
                      />
                    </div>
                  )}

                  {/* Message body */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Message</label>
                    <textarea
                      value={annMsg}
                      onChange={(e) => setAnnMsg(e.target.value)}
                      rows={5}
                      placeholder={
                        annType === "global"
                          ? "Write a platform-wide announcement…"
                          : "Write a private message…"
                      }
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-transparent focus:outline-none resize-none transition"
                    />
                    <p className="text-xs text-slate-400 text-right">{annMsg.length} chars</p>
                  </div>

                  <button
                    onClick={handleSendAnnouncement}
                    disabled={annSending || !annMsg.trim() || (annType === "private" && !annTarget.trim())}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {annSending
                      ? "Sending…"
                      : annType === "global"
                      ? "Send to Everyone"
                      : "Send to User"}
                  </button>
                </div>

                {/* ── Right: History ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-slate-900">Sent Messages</h2>
                      <p className="text-xs text-slate-400 mt-0.5">{annHistory.length} message{annHistory.length !== 1 ? "s" : ""} this session</p>
                    </div>
                    {annHistory.length > 0 && (
                      <button
                        onClick={() => setAnnHistory([])}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {annHistory.length === 0 ? (
                    <div className="py-16 flex flex-col items-center gap-2">
                      <span className="text-3xl opacity-30">📭</span>
                      <p className="text-sm text-slate-400">No messages sent yet</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                      {annHistory.map((a) => (
                        <li key={a.id} className="px-6 py-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                          <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm ${
                            a.type === "global" ? "bg-blue-50" : "bg-purple-50"
                          }`}>
                            {a.type === "global" ? "🌐" : "👤"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-800 leading-relaxed">{a.message}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              {a.type === "private" && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 text-[10px] font-medium">@{a.target}</span>
                              )}
                              {a.type === "global" && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-medium">Platform-wide</span>
                              )}
                              <span className="text-[11px] text-slate-400">{a.sentAt}</span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

              </div>
            )}

            {/* ══════════════════════════════
                 ACTIVITIES
            ══════════════════════════════ */}
            {activeTab === "activities" && (
              <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-900">Activity Log</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Recent actions across the platform</p>
                  </div>
                  <button
                    onClick={fetchActivities}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    Refresh
                  </button>
                </div>

                {loadingData ? (
                  <div className="space-y-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className="h-14 rounded-2xl bg-slate-200 animate-pulse" />
                    ))}
                  </div>
                ) : activities.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 flex flex-col items-center gap-2">
                    <span className="text-3xl opacity-30">📋</span>
                    <p className="text-sm text-slate-400">No activities recorded</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[2fr_1fr_2fr_1fr_1.5fr] gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50">
                      {["User", "Role", "Action", "IP", "Time"].map((h) => (
                        <p key={h} className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</p>
                      ))}
                    </div>

                    <ul className="divide-y divide-slate-100">
                      {activities.map((a) => (
                        <li
                          key={a.id}
                          className="grid grid-cols-[2fr_1fr_2fr_1fr_1.5fr] gap-4 items-center px-5 py-3.5 hover:bg-slate-50 transition-colors"
                        >
                          {/* User */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                              {a.user?.firstName?.[0] ?? "?"}
                            </div>
                            <span className="text-sm font-medium text-slate-900 truncate">
                              {a.user ? `${a.user.firstName} ${a.user.lastName}` : "—"}
                            </span>
                          </div>

                          {/* Role */}
                          <div>
                            {a.user?.role
                              ? <RoleBadge role={a.user.role as GodUser["role"]} />
                              : <span className="text-slate-300 text-xs">—</span>
                            }
                          </div>

                          {/* Action */}
                          <p className="text-sm text-slate-600 truncate">{a.action}</p>

                          {/* IP */}
                          <p className="text-xs text-slate-400 font-mono truncate">{a.ipAddress ?? "—"}</p>

                          {/* Time */}
                          <p className="text-xs text-slate-400 whitespace-nowrap">
                            {new Date(a.createdAt).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════
                 OFFICIAL ACCOUNTS
            ══════════════════════════════ */}
            {activeTab === "official" && (
              <div className="grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-6 items-start">

                {/* ── Left: Create Form ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-5">
                  <div className="pb-1">
                    <h2 className="text-base font-semibold text-slate-900">Create New Official Account</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Faculties, clubs &amp; university services</p>
                  </div>

                  {/* Display Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Name <span className="text-red-400 normal-case">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Engineering Faculty"
                      value={offFirstName}
                      onChange={(e) => setOffFirstName(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-transparent focus:outline-none transition"
                    />
                  </div>

                  {/* Username */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Username <span className="text-red-400 normal-case">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium select-none">@</span>
                      <input
                        type="text"
                        placeholder="engineering_cmu"
                        value={offUsername}
                        onChange={(e) => setOffUsername(e.target.value.replace(/\s/g, "").toLowerCase())}
                        className="w-full border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-transparent focus:outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Faculty — free text */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Faculty / Department <span className="text-red-400 normal-case">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Engineering, Business"
                      value={offFaculty}
                      onChange={(e) => setOffFaculty(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-transparent focus:outline-none transition"
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 pt-1">
                    <span className="text-red-400">*</span> Required fields
                  </p>
                </div>

                {/* ── Right: Search + Results ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col" style={{height: "fit-content", maxHeight: "calc(100vh - 220px)"}}>

                  {/* Top bar: Search + Create button */}
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 shrink-0">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        {offSearchLoading ? (
                          <span className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin block" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                        )}
                      </span>
                      <input
                        type="text"
                        placeholder="Search users…"
                        value={offSearch}
                        onChange={(e) => handleOffSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 transition"
                      />
                    </div>
                    <button
                      onClick={handleCreateOfficialAccount}
                      disabled={offCreating || !offFirstName.trim() || !offUsername.trim() || !offFaculty.trim()}
                      className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      {offCreating ? (
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                        </svg>
                      )}
                      {offCreating ? "Creating…" : "Create Account"}
                    </button>
                  </div>

                  {/* Search result area */}
                  {!offSearch.trim() ? (
                    /* Empty state */
                    <div className="py-16 flex flex-col items-center gap-2">
                      <span className="text-4xl opacity-20">🔍</span>
                      <p className="text-sm font-medium text-slate-500">Search for a user</p>
                      <p className="text-xs text-slate-400">Type a name or username to find and select</p>
                    </div>
                  ) : offSearchResults.length === 0 && !offSearchLoading ? (
                    /* No results */
                    <div className="py-14 flex flex-col items-center gap-1.5">
                      <span className="text-3xl opacity-20">😶</span>
                      <p className="text-sm font-medium text-slate-500">No users found</p>
                      <p className="text-xs text-slate-400">&ldquo;{offSearch}&rdquo;</p>
                    </div>
                  ) : (
                    /* Results list */
                    <>
                      <div className="px-5 py-2.5 border-b border-slate-100 shrink-0">
                        <p className="text-xs text-slate-400">
                          {offSearchResults.length} result{offSearchResults.length !== 1 ? "s" : ""}
                          {offSelectedUser && (
                            <span className="ml-2 text-slate-600 font-medium">· 1 selected</span>
                          )}
                        </p>
                      </div>
                      <ul className="divide-y divide-slate-100 overflow-y-auto flex-1 min-h-0">
                        {offSearchResults.map((u) => {
                          const isSelected = offSelectedUser?.id === u.id;
                          return (
                            <li
                              key={u.id}
                              onClick={() => handleSelectOffUser(u)}
                              className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${
                                isSelected ? "bg-slate-50" : "hover:bg-slate-50"
                              }`}
                            >
                              {/* Avatar */}
                              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                {u.firstName[0].toUpperCase()}
                              </div>
                              {/* Info */}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {u.firstName} {u.lastName}
                                </p>
                                <p className="text-xs text-slate-400 truncate mt-0.5">
                                  {u.username ? `@${u.username}` : u.email}
                                </p>
                              </div>
                              {/* Checkmark */}
                              <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                                isSelected ? "bg-slate-700" : "bg-slate-100 hover:bg-slate-200"
                              }`}>
                                <svg
                                  className={`w-3.5 h-3.5 transition-colors ${isSelected ? "text-white" : "text-slate-400"}`}
                                  fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
                                >
                                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </div>

              </div>
            )}

          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg text-white text-sm font-medium transition-all ${
            toast.ok ? "bg-slate-900" : "bg-red-500"
          }`}
        >
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════
   Sub-components
════════════════════════════════════ */

function RoleBadge({ role }: { role: GodUser["role"] | string }) {
  if (role === "god")
    return (
      <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold">
        ⚡ god
      </span>
    );
  if (role === "admin")
    return (
      <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
        🛡️ admin
      </span>
    );
  return (
    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
      user
    </span>
  );
}

function StatusBadge({ status }: { status: GodUser["status"] }) {
  return status === "active" ? (
    <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
      ✓ Active
    </span>
  ) : (
    <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold">
      ✕ Banned
    </span>
  );
}

type ActionVariant = "purple" | "gray" | "red" | "green";

function ActionBtn({
  loading,
  onClick,
  variant,
  label,
}: {
  loading: boolean;
  onClick: () => void;
  variant: ActionVariant;
  label: string;
}) {
  const styles: Record<ActionVariant, string> = {
    purple: "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200",
    gray:   "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200",
    red:    "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
    green:  "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200",
  };
  return (
    <button
      disabled={loading}
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${styles[variant]}`}
    >
      {loading ? "…" : label}
    </button>
  );
}
