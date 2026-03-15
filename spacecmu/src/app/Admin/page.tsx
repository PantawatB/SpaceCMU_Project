"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { useUser } from "@/contexts/UserContext";
import { apiService, type MyOfficialAccount, type GodUser, type AccountNotification } from "@/lib/api";

type TabId = "official" | "activities";
type DetailTab = "dashboard" | "admins" | "leave";

/* ─────────────────────────────────────────
   Avatar helper
───────────────────────────────────────── */
function Avatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "w-7 h-7 text-xs" : size === "lg" ? "w-12 h-12 text-base" : "w-9 h-9 text-sm";
  if (avatarUrl) {
    return (
      <img  // eslint-disable-line @next/next/no-img-element
        src={apiService.getImageUrl(avatarUrl) ?? ""}
        alt={name}
        className={`${dim} rounded-full object-cover shrink-0`}
      />
    );
  }
  return (
    <div className={`${dim} rounded-full bg-slate-800 flex items-center justify-center font-bold text-white shrink-0`}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

/* ─────────────────────────────────────────
   Official Account Card (list view)
───────────────────────────────────────── */
function OfficialAccountCard({
  account,
  onOpen,
  onSwitch,
}: {
  account: MyOfficialAccount;
  onOpen: (acc: MyOfficialAccount) => void;
  onSwitch: (acc: MyOfficialAccount) => void;
}) {
  const isBanned = account.status === 'banned';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow ${isBanned ? 'border-red-200 opacity-75' : 'border-slate-200 hover:shadow-md'}`}>
      {/* Banned banner */}
      {isBanned && (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border-b border-red-200">
          <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          <span className="text-xs font-semibold text-red-600">บัญชีนี้ถูกระงับ — ไม่สามารถใช้งานได้ในขณะนี้</span>
        </div>
      )}

      {/* Card header */}
      <div className="p-4 sm:p-5 flex items-start gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
        <div className={`w-12 h-12 rounded-full overflow-hidden shrink-0 bg-slate-100 ${isBanned ? 'grayscale' : ''}`}>
          <img // eslint-disable-line @next/next/no-img-element
            src={account.avatarUrl ? (apiService.getImageUrl(account.avatarUrl) ?? "/default-avatar.svg") : "/default-avatar.svg"}
            alt={account.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900 text-base truncate">{account.name}</h3>
            {account.isOwner && (
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider border border-amber-200">
                Owner
              </span>
            )}
            {isBanned && (
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider border border-red-200">
                Banned
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-0.5">@{account.username} · {account.faculty}</p>
        </div>
        {/* Buttons */}
        <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Switch to official button */}
          <button
            onClick={() => !isBanned && onSwitch(account)}
            disabled={isBanned}
            title={isBanned ? 'บัญชีนี้ถูกระงับ' : undefined}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              isBanned
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
            }`}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="10 17 15 12 10 7" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="15" y1="12" x2="3" y2="12" strokeLinecap="round"/>
            </svg>
            <span className="hidden sm:inline">ใช้งาน Account นี้</span>
            <span className="sm:hidden">ใช้งาน</span>
          </button>
          {/* Manage button */}
          <button
            onClick={() => !isBanned && onOpen(account)}
            disabled={isBanned}
            title={isBanned ? 'บัญชีนี้ถูกระงับ' : undefined}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              isBanned
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-slate-900 text-white hover:bg-slate-700'
            }`}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Manage
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-0 border-t border-slate-100 divide-x divide-slate-100">
        <div className="flex-1 py-3 text-center">
          <p className="text-xs text-slate-400">Admins</p>
          <p className="text-base font-bold text-slate-900 mt-0.5">{account.admins.length}</p>
        </div>
        <div className="flex-1 py-3 text-center">
          <p className="text-xs text-slate-400">Faculty</p>
          <p className="text-sm font-semibold text-slate-700 mt-0.5 truncate px-2">{account.faculty}</p>
        </div>
        <div className="flex-1 py-3 text-center">
          <p className="text-xs text-slate-400">Since</p>
          <p className="text-sm font-semibold text-slate-700 mt-0.5">
            {new Date(account.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Account Detail View (in-page, like Friends)
───────────────────────────────────────── */
function AccountDetailView({
  account,
  currentUserId,
  onBack,
  onRefresh,
  showToast,
}: {
  account: MyOfficialAccount;
  currentUserId: string;
  onBack: () => void;
  onRefresh: () => void;
  showToast: (msg: string, ok?: boolean) => void;
}) {
  const [detailTab, setDetailTab] = useState<DetailTab>("dashboard");
  const isOwner = account.ownerId === currentUserId;

  // ── Admins tab state ──
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GodUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Transfer owner confirm state ──
  const [transferTarget, setTransferTarget] = useState<{ id: string; name: string } | null>(null);
  const [transferConfirm, setTransferConfirm] = useState(false);

  // ── Leave confirm state ──
  const [leaveConfirm, setLeaveConfirm] = useState(false);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setSearchResults([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await apiService.searchUsersForOfficialAccount(q);
        setSearchResults(results.filter((u) => !account.admins.some((a) => a.id === u.id)));
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [account.admins]);

  const handleAdd = async (userId: string) => {
    setActionLoading(`add-${userId}`);
    try {
      await apiService.addAdminToMyAccount(account.id, userId);
      showToast("Admin added successfully");
      setSearchQuery("");
      setSearchResults([]);
      onRefresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to add admin", false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (userId: string) => {
    setActionLoading(`remove-${userId}`);
    try {
      await apiService.removeAdminFromMyAccount(account.id, userId);
      showToast("Admin removed");
      onRefresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to remove admin", false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTransferOwner = async () => {
    if (!transferTarget) return;
    setActionLoading("transfer");
    try {
      await apiService.transferOwnership(account.id, transferTarget.id);
      showToast(`Ownership transferred to ${transferTarget.name}`);
      setTransferTarget(null);
      setTransferConfirm(false);
      onRefresh();
      onBack();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to transfer ownership", false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeave = async () => {
    setActionLoading("leave");
    try {
      await apiService.leaveOfficialAccount(account.id);
      showToast("You have left the official account");
      onBack();
      onRefresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to leave", false);
    } finally {
      setActionLoading(null);
      setLeaveConfirm(false);
    }
  };

  const detailTabs: { id: DetailTab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "admins", label: "Admins" },
    { id: "leave", label: "Leave" },
  ];

  return (
    <div className="space-y-0">
      {/* ── Back button + header ── */}
      <div className="mb-6">
        {/* Account header card — Profile-style */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {/* Cover / Banner */}
          <div className="h-40 w-full rounded-t-2xl overflow-hidden">
            {account.bannerUrl ? (
              <img // eslint-disable-line @next/next/no-img-element
                src={apiService.getImageUrl(account.bannerUrl) ?? ""}
                alt="banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-linear-to-r from-pink-200 via-yellow-200 to-green-200" />
            )}
          </div>

          {/* Profile info */}
          <div className="relative">
            {/* Avatar — overlapping banner, left-aligned */}
            <div className="absolute left-6 sm:left-12 -top-10 sm:-top-11 z-10">
              <div className="rounded-full border-4 border-white bg-white">
                <img // eslint-disable-line @next/next/no-img-element
                  src={account.avatarUrl ? (apiService.getImageUrl(account.avatarUrl) ?? "/default-avatar.svg") : "/default-avatar.svg"}
                  alt={account.name}
                  className="w-20 h-20 sm:w-[90px] sm:h-[90px] rounded-full object-cover"
                />
              </div>
            </div>

            {/* Stats row — to the right of avatar */}
            <div className="flex items-center ml-32 sm:ml-44 pt-2 sm:pt-3 gap-2 sm:gap-8 flex-wrap">
              <div className="flex items-center gap-1 sm:gap-0">
                <span className="text-sm sm:text-xl font-semibold text-slate-900">{account.admins.length}</span>
                <span className="text-gray-500 text-sm sm:text-base ml-1">Admins</span>
                <span className="text-gray-500 ml-2 sm:ml-4">|</span>
                <span className="text-slate-800 font-semibold text-sm sm:text-base ml-2 sm:ml-4">{account.faculty}</span>
              </div>
            </div>

            {/* Name & badge */}
            <div className="flex items-center mt-8 sm:mt-8 ml-6 sm:ml-10 flex-wrap gap-x-2">
              <span className="text-lg sm:text-2xl font-bold text-slate-900">{account.name}</span>
              {account.isOwner && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold uppercase tracking-wider border border-amber-200">
                  👑 Owner
                </span>
              )}
            </div>

            {/* Username */}
            <div className="text-left text-gray-500 text-sm mt-1 ml-6 sm:ml-10 pb-5">
              @{account.username}
            </div>
          </div>
        </div>
      </div>

      {/* ── Detail tabs ── */}
      <div className="flex gap-4 sm:gap-8 border-b border-slate-200 mb-6">
        {detailTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setDetailTab(t.id)}
            className={`pb-3 text-sm font-semibold transition-all whitespace-nowrap ${
              detailTab === t.id
                ? t.id === "leave"
                  ? "text-red-600 border-b-2 border-red-500"
                  : "text-slate-900 border-b-2 border-slate-900"
                : t.id === "leave"
                  ? "text-red-400 hover:text-red-600"
                  : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Dashboard tab ── */}
      {detailTab === "dashboard" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Admins", value: account.admins.length },
              { label: "Faculty", value: account.faculty },
              { label: "Since", value: new Date(account.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5 text-center shadow-sm">
                <p className="text-lg font-bold text-slate-900 truncate">{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Owner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Owner</p>
            {account.owner ? (
              <div className="flex items-center gap-3">
                <Avatar name={account.owner.firstName} avatarUrl={account.owner.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{account.owner.firstName} {account.owner.lastName}</p>
                  <p className="text-xs text-slate-400">{account.owner.username ? `@${account.owner.username}` : account.owner.email}</p>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200">👑 Owner</span>
              </div>
            ) : (
              <p className="text-sm text-slate-400">—</p>
            )}
          </div>

          {/* Admins preview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Admins ({account.admins.length})</p>
            {account.admins.length === 0 ? (
              <p className="text-sm text-slate-400">No admins yet</p>
            ) : (
              <ul className="space-y-2.5">
                {account.admins.map((a) => (
                  <li key={a.id} className="flex items-center gap-3">
                    <Avatar name={a.firstName} avatarUrl={a.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{a.firstName} {a.lastName}</p>
                      <p className="text-xs text-slate-400 truncate">{a.username ? `@${a.username}` : a.email}</p>
                    </div>
                    {a.id === account.ownerId && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200">Owner</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Admins tab ── */}
      {detailTab === "admins" && (
        <div className="space-y-5">
          {!isOwner ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
              <span className="text-lg shrink-0">🔒</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Owner only</p>
                <p className="text-xs text-amber-700 mt-0.5">Only the account owner can add or remove admins.</p>
              </div>
            </div>
          ) : (
            /* Owner: search + add */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Add Admin</p>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  {searchLoading ? (
                    <span className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin block" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  )}
                </span>
                <input
                  type="text"
                  placeholder="Search users to add…"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 transition"
                />
              </div>

              {/* Search results dropdown */}
              {searchQuery.trim() && (
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  {searchResults.length === 0 && !searchLoading ? (
                    <p className="text-sm text-slate-400 text-center py-6">No users found</p>
                  ) : (
                    <ul className="divide-y divide-slate-50 max-h-56 overflow-y-auto">
                      {searchResults.map((u) => (
                        <li key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                          {u.avatarUrl ? (
                            <img // eslint-disable-line @next/next/no-img-element
                              src={apiService.getImageUrl(u.avatarUrl) ?? ""}
                              alt={u.firstName}
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {u.firstName[0].toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 truncate">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-slate-400 truncate">{u.username ? `@${u.username}` : u.email}</p>
                          </div>
                          <button
                            onClick={() => handleAdd(u.id)}
                            disabled={actionLoading === `add-${u.id}`}
                            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === `add-${u.id}` ? "…" : (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                                </svg>
                                Add
                              </>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Current admins list */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Current Admins ({account.admins.length})
            </p>
            {account.admins.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2">
                <span className="text-4xl opacity-20">👥</span>
                <p className="text-sm text-slate-400">No admins yet</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {account.admins.map((a) => {
                  const isAdminOwner = a.id === account.ownerId;
                  return (
                    <li key={a.id} className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-slate-50 transition-colors group">
                      <Avatar name={a.firstName} avatarUrl={a.avatarUrl} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{a.firstName} {a.lastName}</p>
                        <p className="text-xs text-slate-400 truncate">{a.username ? `@${a.username}` : a.email}</p>
                      </div>
                      {isAdminOwner ? (
                        <span className="shrink-0 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200">
                          👑 Owner
                        </span>
                      ) : isOwner ? (
                        <div className="shrink-0 flex items-center gap-2">
                          {/* Transfer owner button */}
                          <button
                            onClick={() => {
                              setTransferTarget({ id: a.id, name: `${a.firstName} ${a.lastName}` });
                              setTransferConfirm(false);
                            }}
                            disabled={!!actionLoading}
                            title="Transfer ownership to this admin"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 border border-amber-200 disabled:opacity-50 transition-all"
                          >
                            👑
                          </button>
                          {/* Remove button */}
                          <button
                            onClick={() => handleRemove(a.id)}
                            disabled={actionLoading === `remove-${a.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 border border-red-200 disabled:opacity-50 transition-all"
                          >
                            {actionLoading === `remove-${a.id}` ? "…" : "Remove"}
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ── Transfer Owner confirm dialog ── */}
          {transferTarget && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">👑</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-amber-900">Transfer Ownership</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    You are about to transfer ownership of <span className="font-semibold">{account.name}</span> to{" "}
                    <span className="font-semibold">{transferTarget.name}</span>.<br />
                    You will become a regular admin. This action cannot be undone without their cooperation.
                  </p>
                </div>
                <button
                  onClick={() => { setTransferTarget(null); setTransferConfirm(false); }}
                  className="shrink-0 text-amber-500 hover:text-amber-700 transition-colors text-lg leading-none"
                >
                  ✕
                </button>
              </div>

              {!transferConfirm ? (
                <button
                  onClick={() => setTransferConfirm(true)}
                  className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors"
                >
                  Continue — I understand
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-amber-800 text-center">Confirm transfer to {transferTarget.name}?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTransferConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl bg-white text-amber-700 text-sm font-semibold border border-amber-200 hover:bg-amber-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleTransferOwner}
                      disabled={actionLoading === "transfer"}
                      className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 disabled:opacity-60 transition-colors"
                    >
                      {actionLoading === "transfer" ? "Transferring…" : "Yes, Transfer"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Leave tab ── */}
      {detailTab === "leave" && (
        <div className="space-y-4">
          {isOwner ? (
            /* Owner: blocked state — must transfer first */
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div>
                <p className="text-base font-bold text-slate-900">Leave this account</p>
                <p className="text-sm text-slate-500 mt-1">
                  ในฐานะ Owner คุณไม่สามารถลาออกได้โดยตรง
                </p>
              </div>

              {/* Owner-only warning box */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-amber-900">คุณคือ Owner ของ account นี้</p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    ก่อนลาออก คุณต้องโอนสิทธิ์ความเป็นเจ้าของ (Transfer Ownership) ให้กับ Admin คนอื่นก่อน<br />
                    ไปที่ <span className="font-semibold">Admins → ปุ่ม 👑</span> เพื่อโอนสิทธิ์
                  </p>
                </div>
              </div>

              {/* Blocked button */}
              <div className="relative">
                <button
                  disabled
                  className="w-full py-3 rounded-xl bg-slate-100 text-slate-400 text-sm font-semibold border border-slate-200 cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
                  </svg>
                  Leave Official Account
                </button>
                <p className="text-[11px] text-slate-400 text-center mt-2">
                  โอนสิทธิ์ Owner ก่อนจึงจะสามารถลาออกได้
                </p>
              </div>
            </div>
          ) : (
            /* Non-owner: normal leave flow */
            <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm space-y-4">
              <div>
                <p className="text-base font-bold text-slate-900">Leave this account</p>
                <p className="text-sm text-slate-500 mt-1">
                  You will lose admin access to <span className="font-semibold text-slate-700">{account.name}</span>.<br />
                  The owner can re-add you at any time.
                </p>
              </div>

              {!leaveConfirm ? (
                <button
                  onClick={() => setLeaveConfirm(true)}
                  className="w-full py-3 rounded-xl bg-red-50 text-red-600 text-sm font-semibold border border-red-200 hover:bg-red-100 transition-colors"
                >
                  Leave Official Account
                </button>
              ) : (
                <div className="space-y-3 pt-1">
                  <p className="text-sm font-semibold text-red-700 text-center">
                    Are you sure you want to leave <span className="font-bold">{account.name}</span>?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLeaveConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLeave}
                      disabled={actionLoading === "leave"}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-60 transition-colors"
                    >
                      {actionLoading === "leave" ? "Leaving…" : "Yes, Leave"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Activities Tab — Notifications per Official Account
───────────────────────────────────────── */

type NotifType = AccountNotification["type"];

function isAdminNotif(n: AccountNotification): boolean {
  const userTypes: NotifType[] = ["like", "comment", "reply", "repost", "comment_like", "friend_request", "friend_accept"];
  if (userTypes.includes(n.type)) return false;
  return n.sender?.role === "god" || n.sender?.role === "admin" || n.senderId === null;
}

function NotifTypeIcon({ type, isAdmin }: { type: NotifType; isAdmin: boolean }) {
  if (isAdmin) {
    return (
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 shadow">
        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
        </svg>
      </span>
    );
  }
  if (type === "like") return (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-500">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
    </span>
  );
  if (type === "comment") return (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-500">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6a2 2 0 012-2h14a2 2 0 012 2v10z" /></svg>
    </span>
  );
  if (type === "reply") return (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-500">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
    </span>
  );
  if (type === "repost") return (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-500">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
    </span>
  );
  if (type === "comment_like") return (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-pink-100 text-pink-500">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
    </span>
  );
  if (type === "friend_request") return (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-500">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
    </span>
  );
  if (type === "friend_accept") return (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-teal-100 text-teal-600">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    </span>
  );
  return (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-500">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
    </span>
  );
}

function notifActionText(type: NotifType): string {
  switch (type) {
    case "like": return "liked your post";
    case "comment": return "commented on your post";
    case "reply": return "replied to your comment";
    case "repost": return "reposted your post";
    case "comment_like": return "liked your comment";
    case "friend_request": return "sent you a friend request";
    case "friend_accept": return "accepted your friend request";
    default: return "";
  }
}

function NotificationRow({ n, now }: { n: AccountNotification; now: number }) {
  const admin = isAdminNotif(n);
  const senderName = admin
    ? "FROM ADMIN"
    : n.sender
    ? `${n.sender.firstName} ${n.sender.lastName}`.trim() || "Someone"
    : "Someone";
  const actionText = admin ? (n.message ?? "") : notifActionText(n.type);
  const timeAgo = (() => {
    const diff = now - new Date(n.createdAt).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })();

  return (
    <li className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${n.isRead ? "bg-white" : "bg-blue-50/40"}`}>
      {/* Left: avatar with type-icon badge */}
      <div className="relative shrink-0 mt-0.5">
        {admin ? (
          <NotifTypeIcon type={n.type} isAdmin={true} />
        ) : (
          <>
            {n.sender?.avatarUrl ? (
              <img // eslint-disable-line @next/next/no-img-element
                src={apiService.getImageUrl(n.sender.avatarUrl) ?? ""}
                alt={senderName}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-bold">
                {senderName[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            {/* Small type badge overlaid bottom-right */}
            <span className="absolute -bottom-1 -right-1">
              <NotifTypeIcon type={n.type} isAdmin={false} />
            </span>
          </>
        )}
      </div>

      {/* Right: text */}
      <div className="flex-1 min-w-0">
        {admin ? (
          <>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider leading-tight">
              {senderName} · {timeAgo}
            </p>
            <p className="text-sm text-slate-800 mt-0.5 leading-snug">{actionText}</p>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-800 leading-snug">
              <span className="font-semibold">{senderName}</span>{" "}
              <span className="text-slate-500">{actionText}</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{timeAgo}</p>
          </>
        )}
      </div>

      {!n.isRead && (
        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
      )}
    </li>
  );
}

function AccountNotificationsCard({ account }: { account: MyOfficialAccount }) {
  const [notifications, setNotifications] = useState<AccountNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const LIMIT = 10;

  const loadData = useCallback((p: number) => {
    setLoading(true);
    setError(null);
    apiService.getNotificationsForUser(account.userId, p, LIMIT)
      .then((res) => {
        setNow(new Date().valueOf());
        setNotifications(res.data);
        setPage(res.pagination.page);
        setTotalPages(res.pagination.totalPages);
        setTotal(res.pagination.total);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load notifications");
        setLoading(false);
      });
  }, [account.userId]);

  useEffect(() => { loadData(1); }, [loadData]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-slate-100">
          <img // eslint-disable-line @next/next/no-img-element
            src={account.avatarUrl ? (apiService.getImageUrl(account.avatarUrl) ?? "/default-avatar.svg") : "/default-avatar.svg"}
            alt={account.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-900 text-sm truncate">{account.name}</p>
            {account.isOwner && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[9px] font-bold uppercase tracking-wider border border-amber-200">
                Owner
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">@{account.username}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {unreadCount > 0 && (
            <>
              <button
                onClick={async () => {
                  setMarkingAll(true);
                  try {
                    await apiService.markAllNotificationsReadForUser(account.userId);
                    // Optimistically mark all on current page as read
                    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                  } catch {
                    // silent — UI already reflects optimistic update
                  } finally {
                    setMarkingAll(false);
                  }
                }}
                disabled={markingAll}
                title="Mark all as read"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 disabled:opacity-50 transition-colors"
              >
                {markingAll ? (
                  <span className="w-3 h-3 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin block" />
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                )}
                Mark all read
              </button>
              <span className="flex items-center justify-center px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold min-w-5">
                {unreadCount}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-10 flex justify-center">
          <span className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-slate-600 animate-spin block" />
        </div>
      ) : error ? (
        <div className="py-8 text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => loadData(page)} className="mt-2 text-xs text-slate-500 underline hover:text-slate-800">Retry</button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-10 flex flex-col items-center gap-2">
          <span className="text-3xl opacity-20">🔔</span>
          <p className="text-sm text-slate-400">No notifications yet</p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-50">
            {notifications.map((n) => (
              <NotificationRow key={n.id} n={n} now={now} />
            ))}
          </ul>
          {/* Pagination footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/60">
            <p className="text-xs text-slate-400">
              {total} notification{total !== 1 ? "s" : ""} · Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => loadData(page - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
                </svg>
                Prev
              </button>
              <button
                onClick={() => loadData(page + 1)}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ActivitiesTab({
  accounts,
  loadingAccounts,
  onRefresh,
}: {
  accounts: MyOfficialAccount[];
  loadingAccounts: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-slate-900">Notifications</h2>
          <p className="text-xs text-slate-400 mt-0.5">Notifications received by each official account you manage</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loadingAccounts}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
      </div>

      {loadingAccounts ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-20 flex flex-col items-center gap-3">
          <span className="text-5xl opacity-20">🔔</span>
          <p className="text-sm font-semibold text-slate-500">No official accounts</p>
          <p className="text-xs text-slate-400 text-center max-w-xs">
            You have no official accounts to show notifications for.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((acc) => (
            <AccountNotificationsCard key={acc.id} account={acc} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Main Page
───────────────────────────────────────── */
export default function AdminPage() {
  const { activeUser, isLoading, switchToOfficial } = useUser();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>("official");
  const [myAccounts, setMyAccounts] = useState<MyOfficialAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<MyOfficialAccount | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchMyAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const data = await apiService.getMyOfficialAccounts();
      setMyAccounts(data);
      setSelectedAccount((prev) => prev ? (data.find((a) => a.id === prev.id) ?? null) : null);
    } catch {
      showToast("Failed to load official accounts", false);
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && activeUser?.role !== "admin" && activeUser?.role !== "god") {
      router.replace("/Feeds");
    }
  }, [isLoading, activeUser, router]);

  useEffect(() => {
    if (activeUser?.role === "admin" || activeUser?.role === "god") {
      if (activeTab === "official") fetchMyAccounts();
    }
  }, [activeTab, activeUser, fetchMyAccounts]);

  // When switching tabs, clear selected account
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setSelectedAccount(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="w-7 h-7 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
      </div>
    );
  }

  if (activeUser?.role !== "admin" && activeUser?.role !== "god") return null;

  const tabs: { id: TabId; label: string }[] = [
    { id: "official", label: "Official Accounts" },
    { id: "activities", label: "Activities" },
  ];

  return (
    <div className="flex h-dvh bg-white text-slate-800 overflow-hidden" style={{ height: '100dvh' }}>
      {/* Sidebar */}
      <div className="flex-none h-screen sticky top-0 z-30">
        <Sidebar />
      </div>

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">

        {/* Fixed header */}
        <div className="flex-none pt-5 sm:pt-8 px-4 sm:px-8 pb-0 bg-white z-10">
          <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3 pl-14 lg:pl-0">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Admin Panel</h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Manage your official accounts &amp; content</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Avatar name={activeUser?.firstName ?? "A"} avatarUrl={activeUser?.avatarUrl} size="sm" />
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-900 leading-tight">
                  {activeUser?.firstName} {activeUser?.lastName}
                </p>
                <p className="text-xs text-slate-400 leading-tight capitalize">{activeUser?.role}</p>
              </div>
            </div>
          </div>

          {/* Top-level tabs — hide when in account detail view */}
          {!selectedAccount ? (
            <div className="flex gap-4 sm:gap-8 border-b border-slate-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`pb-3 font-semibold text-sm sm:text-base transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "text-slate-900 border-b-2 border-slate-900"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="border-b border-slate-200 pb-3">
              <button
                onClick={() => setSelectedAccount(null)}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors group"
              >
                <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to Official Accounts
              </button>
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-8 min-w-0">
          <div className="max-w-3xl pt-5 sm:pt-6">

            {/* ── Account Detail View (replaces list) ── */}
            {selectedAccount ? (
              <AccountDetailView
                account={selectedAccount}
                currentUserId={activeUser?.id ?? ""}
                onBack={() => setSelectedAccount(null)}
                onRefresh={fetchMyAccounts}
                showToast={showToast}
              />
            ) : (
              <>
                {/* ══ OFFICIAL ACCOUNTS ══ */}
                {activeTab === "official" && (
                  <div className="space-y-5">
                  <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
                      <div>
                        <h2 className="font-semibold text-slate-900">Your Official Accounts</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Accounts you own or co-manage</p>
                      </div>
                      <button
                        onClick={fetchMyAccounts}
                        disabled={loadingAccounts}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                        Refresh
                      </button>
                    </div>

                    {loadingAccounts ? (
                      <div className="space-y-3">
                        {[1, 2].map((i) => (
                          <div key={i} className="h-36 rounded-2xl bg-slate-100 animate-pulse" />
                        ))}
                      </div>
                    ) : myAccounts.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-20 flex flex-col items-center gap-3">
                        <span className="text-5xl opacity-20">🏛️</span>
                        <p className="text-sm font-semibold text-slate-500">No official accounts yet</p>
                        <p className="text-xs text-slate-400 text-center max-w-xs">
                          You haven&apos;t been assigned to manage any official account.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {myAccounts.map((acc) => (
                          <OfficialAccountCard
                            key={acc.id}
                            account={acc}
                            onOpen={setSelectedAccount}
                            onSwitch={async (a) => {
                              await switchToOfficial(a);
                              router.push("/Feeds");
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ══ ACTIVITIES ══ */}
                {activeTab === "activities" && (
                  <ActivitiesTab accounts={myAccounts} loadingAccounts={loadingAccounts} onRefresh={fetchMyAccounts} />
                )}
              </>
            )}

          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg text-white text-sm font-medium transition-all ${
            toast.ok ? "bg-slate-900" : "bg-red-500"
          }`}
        >
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}
    </div>
  );
}

