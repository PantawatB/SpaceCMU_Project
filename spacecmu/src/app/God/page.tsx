"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { useUser } from "@/contexts/UserContext";
import { apiService, type GodStats, type GodUser, type GodActivity, type OfficialAccount, type SentNotification } from "@/lib/api";

type TabId = "dashboard" | "users" | "announcements" | "activities" | "official";


export default function GodPage() {
  const router = useRouter();
  const { activeUser, isLoading } = useUser();

  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [stats, setStats] = useState<GodStats | null>(null);
  const [users, setUsers] = useState<GodUser[]>([]);
  const [activities, setActivities] = useState<GodActivity[]>([]);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [activitiesTotalPages, setActivitiesTotalPages] = useState(1);
  const [activitiesTotal, setActivitiesTotal] = useState(0);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const ACTIVITIES_LIMIT = 20;
  const [loadingData, setLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [annType, setAnnType] = useState<"global" | "private">("global");
  const [annMsg, setAnnMsg] = useState("");
  const [annSending, setAnnSending] = useState(false);

  // Sent history — paginated from API
  const [sentHistory, setSentHistory] = useState<SentNotification[]>([]);
  const [sentPage, setSentPage] = useState(1);
  const [sentTotalPages, setSentTotalPages] = useState(0);
  const [sentTotal, setSentTotal] = useState(0);
  const [sentLoading, setSentLoading] = useState(false);

  // Private recipient search state
  const [annPrivateSearch, setAnnPrivateSearch] = useState("");
  const [annPrivateSearchResults, setAnnPrivateSearchResults] = useState<GodUser[]>([]);
  const [annPrivateSearchLoading, setAnnPrivateSearchLoading] = useState(false);
  const [annPrivateSelected, setAnnPrivateSelected] = useState<GodUser[]>([]);
  const annSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Official Account state
  const [offFirstName, setOffFirstName] = useState("");
  const [offUsername, setOffUsername] = useState("");
  const [offFaculty, setOffFaculty] = useState("");
  const [offCreating, setOffCreating] = useState(false);

  // Validation helpers — defined as constants (regex outside render is fine)
  const NAME_INVALID_RE = /[<>/\\|"';:{}]/;
  const USERNAME_VALID_RE = /^[a-z0-9_-]*$/;
  const FACULTY_INVALID_RE = /[<>/\\|";]/;

  const nameError = offFirstName && NAME_INVALID_RE.test(offFirstName)
    ? 'ห้ามใช้อักขระ: < > / \\ | " \' ; : { }'
    : offFirstName.trim().length > 80
    ? "ชื่อยาวเกินไป (สูงสุด 80 ตัวอักษร)"
    : null;

  const usernameError = offUsername && !USERNAME_VALID_RE.test(offUsername)
    ? "ใช้ได้เฉพาะ a–z, 0–9, _ และ - เท่านั้น"
    : offUsername.length > 40
    ? "Username ยาวเกินไป (สูงสุด 40 ตัวอักษร)"
    : null;

  const facultyError = offFaculty && FACULTY_INVALID_RE.test(offFaculty)
    ? 'ห้ามใช้อักขระ: < > / \\ | " ;'
    : offFaculty.trim().length > 100
    ? "ชื่อ Faculty ยาวเกินไป (สูงสุด 100 ตัวอักษร)"
    : null;
  const [offSearch, setOffSearch] = useState("");
  const [offSearchResults, setOffSearchResults] = useState<GodUser[]>([]);
  const [offSearchLoading, setOffSearchLoading] = useState(false);
  const [offSelectedUser, setOffSelectedUser] = useState<GodUser | null>(null);
  const [officialAccounts, setOfficialAccounts] = useState<OfficialAccount[]>([]);
  const [offListLoading, setOffListLoading] = useState(false);

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

  const fetchActivities = useCallback(async (p: number = 1) => {
    setActivitiesLoading(true);
    try {
      const res = await apiService.getGodActivities(p, ACTIVITIES_LIMIT);
      setActivities(res.data);
      setActivitiesPage(res.pagination.page);
      setActivitiesTotalPages(res.pagination.totalPages);
      setActivitiesTotal(res.pagination.total);
    } catch {
      showToast("Failed to load activities", false);
    } finally {
      setActivitiesLoading(false);
    }
  }, []);

  const fetchOfficialAccounts = useCallback(async () => {
    setOffListLoading(true);
    try {
      const data = await apiService.getOfficialAccounts();
      setOfficialAccounts(data);
    } catch {
      showToast("Failed to load official accounts", false);
    } finally {
      setOffListLoading(false);
    }
  }, []);

  const fetchSentHistory = useCallback(async (page: number) => {
    setSentLoading(true);
    try {
      const res = await apiService.getSentNotifications(page, 10);
      setSentHistory(res.data);
      setSentPage(res.pagination.page);
      setSentTotalPages(res.pagination.totalPages);
      setSentTotal(res.pagination.total);
    } catch {
      // silent — history is best-effort
    } finally {
      setSentLoading(false);
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
    else if (activeTab === "activities") fetchActivities(1);
    else if (activeTab === "official") fetchOfficialAccounts();
    else if (activeTab === "announcements") fetchSentHistory(1);
  }, [activeTab, activeUser, fetchStats, fetchUsers, fetchActivities, fetchOfficialAccounts, fetchSentHistory]);

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
    if (annType === "private" && annPrivateSelected.length === 0) return;
    setAnnSending(true);
    try {
      let count = 0;
      if (annType === "global") {
        const res = await apiService.sendGlobalNotification(annMsg.trim());
        count = res.count;
      } else {
        const res = await apiService.sendPrivateNotifications(
          annPrivateSelected.map((u) => u.id),
          annMsg.trim()
        );
        count = res.count;
      }
      setAnnMsg("");
      setAnnPrivateSelected([]);
      setAnnPrivateSearch("");
      setAnnPrivateSearchResults([]);
      showToast(
        annType === "global"
          ? `Notification sent to ${count} users`
          : `Notification sent to ${count} user${count !== 1 ? "s" : ""}`
      );
      // Refresh history from page 1
      fetchSentHistory(1);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to send notification", false);
    } finally {
      setAnnSending(false);
    }
  };

  const handleAnnPrivateSearchChange = (q: string) => {
    setAnnPrivateSearch(q);
    if (annSearchDebounceRef.current) clearTimeout(annSearchDebounceRef.current);
    if (!q.trim()) {
      setAnnPrivateSearchResults([]);
      setAnnPrivateSearchLoading(false);
      return;
    }
    setAnnPrivateSearchLoading(true);
    annSearchDebounceRef.current = setTimeout(async () => {
      try {
        // searchAllUsersForMessage includes official_account role
        const results = await apiService.searchAllUsersForMessage(q);
        // Filter out already-selected
        setAnnPrivateSearchResults(
          results.filter((r) => !annPrivateSelected.some((s) => s.id === r.id))
        );
      } catch {
        setAnnPrivateSearchResults([]);
      } finally {
        setAnnPrivateSearchLoading(false);
      }
    }, 300);
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
        const results = await apiService.searchUsersForOfficialAccount(q);
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
    if (!offFirstName.trim() || !offUsername.trim() || !offFaculty.trim() || !offSelectedUser) {
      showToast("Please fill all fields and select an owner", false);
      return;
    }
    setOffCreating(true);
    try {
      const result = await apiService.createOfficialAccount({
        name: offFirstName.trim(),
        username: offUsername.trim(),
        faculty: offFaculty.trim(),
        ownerUserId: offSelectedUser.id,
      });
      setOffFirstName("");
      setOffUsername("");
      setOffFaculty("");
      setOffSelectedUser(null);
      setOffSearch("");
      setOffSearchResults([]);
      showToast(result.message);
      fetchOfficialAccounts();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to create official account", false);
    } finally {
      setOffCreating(false);
    }
  };

  const filteredUsers = (() => {
    const query = searchQuery.toLowerCase();
    const matched = users.filter(
      (u) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(query) ||
        (u.username ?? "").toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    );

    // Sort: public users first (isAnonymous=false), then group each anonymous
    // account directly after its parent public user
    const publicUsers = matched.filter((u) => !u.isAnonymous);
    const anonUsers = matched.filter((u) => u.isAnonymous);

    const ordered: typeof users = [];
    for (const pub of publicUsers) {
      ordered.push(pub);
      const anon = anonUsers.find((a) => a.parentUserId === pub.id);
      if (anon) ordered.push(anon);
    }
    // Append any anonymous accounts whose parent wasn't matched / wasn't found
    for (const anon of anonUsers) {
      if (!ordered.includes(anon)) ordered.push(anon);
    }
    return ordered;
  })();

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
                    <div className="grid grid-cols-[2fr_2fr_1fr_2fr] gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50">
                      {["User", "Email", "Role", "Actions"].map((h) => (
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
                            className={`grid grid-cols-[2fr_2fr_1fr_2fr] gap-4 items-center px-5 py-3.5 hover:bg-slate-50 transition-colors ${
                              u.isAnonymous ? "bg-slate-50/60" : ""
                            }`}
                          >
                            {/* Name */}
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Indent anonymous accounts */}
                              {u.isAnonymous && (
                                <span className="text-slate-300 shrink-0">↳</span>
                              )}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                u.isAnonymous ? "bg-gray-300 text-gray-600" : "bg-slate-200 text-slate-600"
                              }`}>
                                {u.isAnonymous ? "?" : (u.firstName?.[0] ?? "?")}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-semibold text-slate-900 truncate">
                                    {u.firstName} {u.lastName}
                                  </p>
                                  {u.isAnonymous && (
                                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                                      Anon
                                    </span>
                                  )}
                                </div>
                                {u.username && (
                                  <p className="text-xs text-slate-400 truncate">@{u.username}</p>
                                )}
                              </div>
                            </div>

                            {/* Email */}
                            <p className="text-sm text-slate-500 truncate">{u.email}</p>

                            {/* Role */}
                            <div><RoleBadge role={u.role} /></div>

                            {/* Actions — Status dropdown + Role buttons */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {u.role === "god" ? (
                                <span className="text-xs text-slate-300 italic">Protected</span>
                              ) : (
                                <>
                                  {/* Status dropdown */}
                                  <div className="relative">
                                    {actionLoading === `status-${u.id}` ? (
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-50 border-slate-200 text-slate-400">
                                        <span className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
                                        Updating…
                                      </span>
                                    ) : (
                                      <select
                                        value={u.status}
                                        onChange={(e) => handleSetStatus(u.id, e.target.value as "active" | "banned")}
                                        className={`appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer focus:outline-none focus:ring-2 transition ${
                                          u.status === "active"
                                            ? "bg-green-50 text-green-700 border-green-200 focus:ring-green-300"
                                            : "bg-red-50 text-red-700 border-red-200 focus:ring-red-300"
                                        }`}
                                      >
                                        <option value="active">✓ active</option>
                                        <option value="banned">✕ banned</option>
                                      </select>
                                    )}
                                    {actionLoading !== `status-${u.id}` && (
                                      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-current opacity-50" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    )}
                                  </div>

                                  {/* Role toggle (non-anonymous only) */}
                                  {!u.isAnonymous && u.role !== "official_account" && (
                                    u.role === "user" ? (
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
                                    )
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

                  {/* Private target — multi-user search */}
                  {annType === "private" && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">Recipients</label>

                      {/* Selected chips */}
                      {annPrivateSelected.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {annPrivateSelected.map((u) => (
                            <span
                              key={u.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-white text-xs font-medium"
                            >
                              {u.firstName} {u.lastName}
                              {u.username && <span className="opacity-60">@{u.username}</span>}
                              <button
                                onClick={() =>
                                  setAnnPrivateSelected((prev) => prev.filter((p) => p.id !== u.id))
                                }
                                className="ml-0.5 hover:text-red-300 transition-colors"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Search input */}
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                        </span>
                        <input
                          type="text"
                          placeholder="Search by name, username or email…"
                          value={annPrivateSearch}
                          onChange={(e) => handleAnnPrivateSearchChange(e.target.value)}
                          className="w-full pl-9 pr-3 border border-slate-200 rounded-xl py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-transparent focus:outline-none transition"
                        />
                        {annPrivateSearchLoading && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2">
                            <svg className="animate-spin w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          </span>
                        )}
                      </div>

                      {/* Dropdown results */}
                      {annPrivateSearchResults.length > 0 && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-48 overflow-y-auto">
                          {annPrivateSearchResults.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => {
                                setAnnPrivateSelected((prev) => [...prev, u]);
                                setAnnPrivateSearchResults((prev) => prev.filter((r) => r.id !== u.id));
                                setAnnPrivateSearch("");
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition text-left"
                            >
                              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                                {u.firstName?.[0] ?? "?"}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {u.firstName} {u.lastName}
                                  {u.username && <span className="text-slate-400 font-normal ml-1">@{u.username}</span>}
                                </p>
                                <p className="text-xs text-slate-400 truncate">{u.email}</p>
                              </div>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">{u.role}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {annPrivateSearch.trim() && !annPrivateSearchLoading && annPrivateSearchResults.length === 0 && (
                        <p className="text-xs text-slate-400 px-1">No users found</p>
                      )}
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
                    disabled={annSending || !annMsg.trim() || (annType === "private" && annPrivateSelected.length === 0)}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {annSending
                      ? "Sending…"
                      : annType === "global"
                      ? "Send to Everyone"
                      : `Send to ${annPrivateSelected.length || ""} User${annPrivateSelected.length !== 1 ? "s" : ""}`.trim()}
                  </button>
                </div>

                {/* ── Right: History ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                      <h2 className="font-semibold text-slate-900">Sent Messages</h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {sentTotal > 0 ? `${sentTotal} message${sentTotal !== 1 ? "s" : ""} total` : "No messages yet"}
                      </p>
                    </div>
                    <button
                      onClick={() => fetchSentHistory(sentPage)}
                      disabled={sentLoading}
                      className="text-xs text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-40"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                      </svg>
                    </button>
                  </div>

                  {sentLoading && sentHistory.length === 0 ? (
                    <div className="py-16 flex justify-center">
                      <span className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-slate-700 animate-spin block" />
                    </div>
                  ) : sentHistory.length === 0 ? (
                    <div className="py-16 flex flex-col items-center gap-2">
                      <span className="text-3xl opacity-30">📭</span>
                      <p className="text-sm text-slate-400">No messages sent yet</p>
                    </div>
                  ) : (
                    <>
                      <ul className="divide-y divide-slate-100 overflow-y-auto max-h-[420px]">
                        {sentHistory.map((a, i) => {
                          const isGlobal = a.isGlobal;
                          const sentDate = new Date(a.sentAt);
                          const formattedDate = sentDate.toLocaleString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          });
                          return (
                            <li key={i} className="px-6 py-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                              <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm ${
                                isGlobal ? "bg-blue-50" : "bg-purple-50"
                              }`}>
                                {isGlobal ? "🌐" : "👤"}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-slate-800 leading-relaxed line-clamp-2">{a.message}</p>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  {isGlobal ? (
                                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-medium">Platform-wide</span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 text-[10px] font-medium truncate max-w-[180px]" title={a.recipientPreview ?? ""}>
                                      {a.recipientPreview ?? "Private"}
                                    </span>
                                  )}
                                  <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-600 text-[10px] font-medium">
                                    {a.recipientCount} sent
                                  </span>
                                  <span className="text-[11px] text-slate-400">{formattedDate}</span>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>

                      {/* Pagination */}
                      {sentTotalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 shrink-0">
                          <button
                            onClick={() => fetchSentHistory(sentPage - 1)}
                            disabled={sentPage <= 1 || sentLoading}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Prev
                          </button>
                          <span className="text-xs text-slate-400">
                            Page {sentPage} of {sentTotalPages}
                          </span>
                          <button
                            onClick={() => fetchSentHistory(sentPage + 1)}
                            disabled={sentPage >= sentTotalPages || sentLoading}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
                          >
                            Next
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </>
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
                    onClick={() => fetchActivities(1)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    Refresh
                  </button>
                </div>

                {activitiesLoading ? (
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

                    {/* Pagination footer */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/60">
                      <p className="text-xs text-slate-400">
                        {activitiesTotal} entr{activitiesTotal !== 1 ? "ies" : "y"} · Page {activitiesPage} of {activitiesTotalPages}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => fetchActivities(activitiesPage - 1)}
                          disabled={activitiesPage <= 1}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
                          </svg>
                          Prev
                        </button>
                        {/* Page number pills */}
                        {Array.from({ length: activitiesTotalPages }, (_, i) => i + 1)
                          .filter((p) =>
                            p === 1 ||
                            p === activitiesTotalPages ||
                            Math.abs(p - activitiesPage) <= 1
                          )
                          .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                            if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                            acc.push(p);
                            return acc;
                          }, [])
                          .map((p, idx) =>
                            p === "…" ? (
                              <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">…</span>
                            ) : (
                              <button
                                key={p}
                                onClick={() => fetchActivities(p as number)}
                                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                                  activitiesPage === p
                                    ? "bg-slate-900 text-white"
                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {p}
                              </button>
                            )
                          )}
                        <button
                          onClick={() => fetchActivities(activitiesPage + 1)}
                          disabled={activitiesPage >= activitiesTotalPages}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════
                 OFFICIAL ACCOUNTS
            ══════════════════════════════ */}
            {activeTab === "official" && (
              <div className="space-y-8">

                {/* ── Top: Create Form + User Search ── */}
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
                        className={`w-full border rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:border-transparent focus:outline-none transition ${
                          nameError ? "border-red-300 focus:ring-red-300 bg-red-50" : "border-slate-200 focus:ring-slate-900"
                        }`}
                      />
                      {nameError && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <span>⚠</span> {nameError}
                        </p>
                      )}
                      {!nameError && (
                        <p className="text-[11px] text-slate-400">ตัวอักษร, ตัวเลข, ช่องว่าง, ( ) , . - ได้ · ห้าม {"< > / \\ | \" ' ; : { }"}</p>
                      )}
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
                          className={`w-full border rounded-xl pl-8 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:border-transparent focus:outline-none transition ${
                            usernameError ? "border-red-300 focus:ring-red-300 bg-red-50" : "border-slate-200 focus:ring-slate-900"
                          }`}
                        />
                      </div>
                      {usernameError && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <span>⚠</span> {usernameError}
                        </p>
                      )}
                      {!usernameError && (
                        <p className="text-[11px] text-slate-400">ใช้ได้เฉพาะ a–z, 0–9, _ และ - · ห้ามมีช่องว่างหรืออักขระพิเศษอื่น</p>
                      )}
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
                        className={`w-full border rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:border-transparent focus:outline-none transition ${
                          facultyError ? "border-red-300 focus:ring-red-300 bg-red-50" : "border-slate-200 focus:ring-slate-900"
                        }`}
                      />
                      {facultyError && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <span>⚠</span> {facultyError}
                        </p>
                      )}
                      {!facultyError && (
                        <p className="text-[11px] text-slate-400">ตัวอักษรและตัวเลขทั่วไปได้ · ห้าม {"< > / \\ | \" ;"}</p>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 pt-1">
                      <span className="text-red-400">*</span> Required fields
                      {offSelectedUser ? (
                        <span className="ml-2 text-green-600 font-medium">
                          · Owner: {offSelectedUser.firstName} {offSelectedUser.lastName}
                        </span>
                      ) : (
                        <span className="ml-2 text-amber-500">· Select an owner from the right →</span>
                      )}
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
                        disabled={offCreating || !offFirstName.trim() || !offUsername.trim() || !offFaculty.trim() || !offSelectedUser || !!nameError || !!usernameError || !!facultyError}
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
                      <div className="py-16 flex flex-col items-center gap-2">
                        <span className="text-4xl opacity-20">🔍</span>
                        <p className="text-sm font-medium text-slate-500">Search for a user</p>
                        <p className="text-xs text-slate-400">Type a name or username to find and select</p>
                      </div>
                    ) : offSearchResults.length === 0 && !offSearchLoading ? (
                      <div className="py-14 flex flex-col items-center gap-1.5">
                        <span className="text-3xl opacity-20">😶</span>
                        <p className="text-sm font-medium text-slate-500">No users found</p>
                        <p className="text-xs text-slate-400">&ldquo;{offSearch}&rdquo;</p>
                      </div>
                    ) : (
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
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                  {u.firstName[0].toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-slate-900 truncate">
                                    {u.firstName} {u.lastName}
                                  </p>
                                  <p className="text-xs text-slate-400 truncate mt-0.5">
                                    {u.username ? `@${u.username}` : u.email}
                                  </p>
                                </div>
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

                {/* ── Bottom: All Official Accounts List ── */}
                <div className="space-y-4">
                  {/* Section header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-slate-900">All Official Accounts</h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {officialAccounts.length} account{officialAccounts.length !== 1 ? "s" : ""} in the system
                      </p>
                    </div>
                    <button
                      onClick={fetchOfficialAccounts}
                      disabled={offListLoading}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
                    >
                      {offListLoading ? (
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                        </svg>
                      )}
                      Refresh
                    </button>
                  </div>

                  {/* Loading skeleton */}
                  {offListLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
                      ))}
                    </div>
                  ) : officialAccounts.length === 0 ? (
                    /* Empty state */
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 flex flex-col items-center gap-2">
                      <span className="text-3xl opacity-20">🏛️</span>
                      <p className="text-sm font-medium text-slate-500">No official accounts yet</p>
                      <p className="text-xs text-slate-400">Create one using the form above</p>
                    </div>
                  ) : (
                    /* Account cards */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {officialAccounts.map((acc) => (
                        <div
                          key={acc.id}
                          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow"
                        >
                          {/* Card header */}
                          <div className="flex items-start gap-3">
                            {/* Account avatar */}
                            <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center text-white text-base font-bold shrink-0">
                              {acc.name[0].toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900 truncate">{acc.name}</p>
                              <p className="text-xs text-slate-400 truncate">@{acc.username}</p>
                            </div>
                            {/* Faculty pill */}
                            <span className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
                              {acc.faculty}
                            </span>
                          </div>

                          {/* Divider */}
                          <div className="border-t border-slate-100" />

                          {/* Owner row */}
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold shrink-0">
                              {acc.owner ? acc.owner.firstName[0].toUpperCase() : "?"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] text-slate-400 leading-none mb-0.5">Owner</p>
                              <p className="text-xs font-semibold text-slate-700 truncate">
                                {acc.owner
                                  ? `${acc.owner.firstName} ${acc.owner.lastName}`
                                  : "—"}
                              </p>
                            </div>
                            {acc.owner?.username && (
                              <span className="text-[11px] text-slate-400 shrink-0">@{acc.owner.username}</span>
                            )}
                          </div>

                          {/* Footer meta */}
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-[11px] text-slate-400">
                              {acc.admins.length} admin{acc.admins.length !== 1 ? "s" : ""}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(acc.createdAt).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
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
