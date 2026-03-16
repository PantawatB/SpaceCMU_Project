"use client";

/**
 * MentionText
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders post/comment text stored on the server, converting:
 *  - @[userId]  → styled clickable mention chip  (e.g. "@John Doe")
 *  - URLs       → clickable hyperlinks
 *
 * User names are resolved on first render via /api/users/batch?ids=...
 * and cached in a module-level map so the same user lookup is shared
 * across all MentionText instances on the page.
 */

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { API_CONFIG } from "@/lib/config";
import { fetchWithToken } from "@/lib/api";

interface MentionUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string | null;
  avatarUrl: string | null;
}

// ── Module-level cache (shared across all instances) ──────────────────────────
const userCache = new Map<string, MentionUser | null>();
// Pending promise per userId to avoid duplicate fetch
const pendingFetch = new Map<string, Promise<void>>();

async function fetchUsers(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const uncached = ids.filter((id) => !userCache.has(id) && !pendingFetch.has(id));
  if (uncached.length === 0) return;

  const promise = (async () => {
    try {
      const res = await fetchWithToken(
        `${API_CONFIG.BASE_URL}/api/users/batch?ids=${encodeURIComponent(uncached.join(","))}`,
      );
      if (!res.ok) { uncached.forEach((id) => userCache.set(id, null)); return; }
      const data: MentionUser[] = await res.json();
      const byId = new Map(data.map((u) => [u.id, u]));
      uncached.forEach((id) => userCache.set(id, byId.get(id) ?? null));
    } catch {
      uncached.forEach((id) => userCache.set(id, null));
    } finally {
      uncached.forEach((id) => pendingFetch.delete(id));
    }
  })();

  uncached.forEach((id) => pendingFetch.set(id, promise));
  await promise;
}

// ── Parse text into segments ──────────────────────────────────────────────────
type Segment =
  | { kind: "text"; value: string }
  | { kind: "url"; value: string }
  | { kind: "mention"; userId: string; displayName?: string };

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  // Matches (in priority order):
  //   1. Display format:  @[Name](userId)
  //   2. Raw format:      @[userId]  — userId must be a valid UUID (no @ inside)
  //   3. URL
  const combined = /(@\[([^\]@]+)\]\(([^)]+)\))|(@\[([^\]@]+)\])|(https?:\/\/[^\s]+)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ kind: "text", value: text.slice(last, match.index) });
    }
    if (match[1]) {
      // Display format: @[Name](userId)
      segments.push({ kind: "mention", userId: match[3], displayName: match[2] });
    } else if (match[4]) {
      // Raw format: @[userId]
      segments.push({ kind: "mention", userId: match[5] });
    } else if (match[6]) {
      segments.push({ kind: "url", value: match[6] });
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    segments.push({ kind: "text", value: text.slice(last) });
  }

  return segments;
}

// ── MentionChip: single inline mention ───────────────────────────────────────
function MentionChip({
  userId,
  users,
  displayName: propDisplayName,
}: {
  userId: string;
  users: Map<string, MentionUser | null>;
  displayName?: string;
}) {
  const router = useRouter();
  const user = users.get(userId);

  // Priority: fetched user name > display name from token > loading placeholder
  const name = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : propDisplayName ?? null;

  const label = name ? `@${name}` : "@…";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/Friends?userId=${userId}`);
      }}
      className="inline-flex items-center gap-0.5 px-1 py-0 rounded-md bg-violet-50 text-violet-700 font-semibold text-[0.9em] hover:bg-violet-100 hover:text-violet-900 transition-colors cursor-pointer leading-snug"
    >
      {label}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface MentionTextProps {
  text: string;
  className?: string;
}

export default function MentionText({ text, className }: MentionTextProps) {
  // Resolved users map for this render
  const [users, setUsers] = useState<Map<string, MentionUser | null>>(new Map());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    // Extract all mention userIds from text
    const ids: string[] = [];
    const re = /@\[([^\]]+)\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) ids.push(m[1]);

    if (ids.length === 0) return;

    // Check which are already in cache
    const allCached = ids.every((id) => userCache.has(id));
    if (allCached) {
      // Defer to avoid synchronous setState in effect
      const map = new Map<string, MentionUser | null>();
      ids.forEach((id) => map.set(id, userCache.get(id) ?? null));
      setTimeout(() => { if (mountedRef.current) setUsers(map); }, 0);
      return;
    }

    // Fetch missing ones
    fetchUsers(ids).then(() => {
      if (!mountedRef.current) return;
      const map = new Map<string, MentionUser | null>();
      ids.forEach((id) => map.set(id, userCache.get(id) ?? null));
      setUsers(map);
    });
  }, [text]);

  const segments = parseSegments(text);

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{seg.value}</span>;
        }
        if (seg.kind === "url") {
          return (
            <a
              key={i}
              href={seg.value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 underline break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {seg.value}
            </a>
          );
        }
        // mention
        return <MentionChip key={i} userId={seg.userId} users={users} displayName={seg.displayName} />;
      })}
    </span>
  );
}
