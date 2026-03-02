"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { useUser } from "@/contexts/UserContext";
import { apiService, type MyOfficialAccount, type GodUser } from "@/lib/api";

type TabId = "official" | "posts" | "activities";
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
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Card header */}
      <div className="p-5 flex items-start gap-4">
        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-slate-100">
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
          </div>
          <p className="text-sm text-slate-400 mt-0.5">@{account.username} · {account.faculty}</p>
        </div>
        {/* Buttons */}
        <div className="shrink-0 flex items-center gap-2">
          {/* Switch to official button */}
          <button
            onClick={() => onSwitch(account)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 border border-indigo-200 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="10 17 15 12 10 7" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="15" y1="12" x2="3" y2="12" strokeLinecap="round"/>
            </svg>
            ใช้งาน Account นี้
          </button>
          {/* Manage button */}
          <button
            onClick={() => onOpen(account)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
          {/* Cover / Banner */}
          <div className="h-36 w-full relative">
            {account.bannerUrl ? (
              <img // eslint-disable-line @next/next/no-img-element
                src={apiService.getImageUrl(account.bannerUrl) ?? ""}
                alt="banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-linear-to-r from-indigo-200 via-purple-200 to-pink-200" />
            )}
          </div>

          {/* Avatar overlapping banner */}
          <div className="absolute left-4 sm:left-8 top-[88px]">
            <div className="rounded-full border-4 border-white bg-white shadow-md">
              <img // eslint-disable-line @next/next/no-img-element
                src={account.avatarUrl ? (apiService.getImageUrl(account.avatarUrl) ?? "/default-avatar.svg") : "/default-avatar.svg"}
                alt={account.name}
                className="w-16 h-16 sm:w-[82px] sm:h-[82px] rounded-full object-cover"
              />
            </div>
          </div>

          {/* Name + badge + username + stats */}
          <div className="pt-12 sm:pt-14 px-4 sm:px-8 pb-5">
            {/* Stats — inline with avatar, profile-style */}
            <div className="flex items-center ml-[76px] sm:ml-[106px] -mt-10 sm:-mt-12 mb-3 relative" >
              <div className="flex items-center gap-1 sm:gap-0 flex-wrap">
                <span className="text-base sm:text-xl font-semibold text-slate-900">{account.admins.length}</span>
                <span className="text-gray-500 text-sm sm:text-base ml-1">Admins</span>
                <span className="text-gray-400 ml-2 sm:ml-4 hidden sm:inline">|</span>
                <span className="text-slate-800 font-semibold text-sm sm:text-base ml-2 sm:ml-4 hidden sm:inline">{account.faculty}</span>
              </div>
            </div>

            {/* Faculty on small screens */}
            <div className="ml-4 sm:hidden mt-14 mb-1">
              <span className="text-gray-500 text-xs">{account.faculty}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-1">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{account.name}</h2>
              {account.isOwner && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold uppercase tracking-wider border border-amber-200">
                  👑 Owner
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">@{account.username}</p>
          </div>
        </div>
      </div>

      {/* ── Detail tabs ── */}
      <div className="flex gap-8 border-b border-slate-200 mb-6">
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
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Admins", value: account.admins.length, icon: "🛡️" },
              { label: "Faculty", value: account.faculty, icon: "🏛️" },
              { label: "Since", value: new Date(account.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }), icon: "📅" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5 text-center shadow-sm">
                <p className="text-2xl mb-2">{s.icon}</p>
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
              <div className="flex items-start gap-4">
                <span className="text-2xl shrink-0">🚪</span>
                <div>
                  <p className="text-base font-bold text-slate-900">Leave this account</p>
                  <p className="text-sm text-slate-500 mt-1">
                    ในฐานะ Owner คุณไม่สามารถลาออกได้โดยตรง
                  </p>
                </div>
              </div>

              {/* Owner-only warning box */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 flex items-start gap-3">
                <span className="text-base shrink-0 mt-0.5">�</span>
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
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">🚪</span>
                <div>
                  <p className="text-base font-bold text-slate-900">Leave this account</p>
                  <p className="text-sm text-slate-500 mt-1">
                    You will lose admin access to <span className="font-semibold text-slate-700">{account.name}</span>.<br />
                    The owner can re-add you at any time.
                  </p>
                </div>
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
    { id: "posts", label: "Posts" },
    { id: "activities", label: "Activities" },
  ];

  return (
    <div className="flex h-screen bg-white text-slate-800 overflow-hidden">
      {/* Sidebar */}
      <div className="flex-none h-screen sticky top-0 z-30">
        <Sidebar />
      </div>

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">

        {/* Fixed header */}
        <div className="flex-none pt-8 px-8 pb-0 bg-white z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
              <p className="text-sm text-slate-400 mt-0.5">Manage your official accounts &amp; content</p>
            </div>
            <div className="flex items-center gap-2">
              <Avatar name={activeUser?.firstName ?? "A"} avatarUrl={activeUser?.avatarUrl} size="sm" />
              <div>
                <p className="text-sm font-semibold text-slate-900 leading-tight">
                  {activeUser?.firstName} {activeUser?.lastName}
                </p>
                <p className="text-xs text-slate-400 leading-tight capitalize">{activeUser?.role}</p>
              </div>
            </div>
          </div>

          {/* Top-level tabs — hide when in account detail view */}
          {!selectedAccount ? (
            <div className="flex gap-8 border-b border-slate-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`pb-3 font-semibold text-base transition-all whitespace-nowrap ${
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
        <div className="flex-1 overflow-y-auto px-8 pb-8 min-w-0">
          <div className="max-w-3xl pt-6">

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
                    <div className="flex items-center justify-between">
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

                {/* ══ POSTS ══ */}
                {activeTab === "posts" && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-20 flex flex-col items-center gap-3">
                    <span className="text-5xl opacity-20">📝</span>
                    <p className="text-sm font-semibold text-slate-500">Post management</p>
                    <p className="text-xs text-slate-400">Coming soon</p>
                  </div>
                )}

                {/* ══ ACTIVITIES ══ */}
                {activeTab === "activities" && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-20 flex flex-col items-center gap-3">
                    <span className="text-5xl opacity-20">⚡</span>
                    <p className="text-sm font-semibold text-slate-500">Activity log</p>
                    <p className="text-xs text-slate-400">Coming soon</p>
                  </div>
                )}
              </>
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

