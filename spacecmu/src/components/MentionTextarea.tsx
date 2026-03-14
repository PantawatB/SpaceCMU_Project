"use client";

/**
 * MentionTextarea
 * ─────────────────────────────────────────────────────────────────────────────
 * Textarea ที่รองรับ @mention:
 *  - พิมพ์ "@" แล้วตามด้วยตัวอักษร → แสดง dropdown ค้นหาชื่อผู้ใช้
 *  - เลือกผู้ใช้ → แทนที่ fragment @xxx ด้วย "@ชื่อ " (display)
 *    แต่ buildRaw() จะ reconstruct เป็น @[userId] สำหรับส่ง server
 *
 * Props:
 *  value         – display text (ที่แสดงใน textarea)
 *  onChange      – callback รับ display-text ใหม่
 *  onChangeRaw   – callback รับ raw-text (มี @[userId]) สำหรับส่ง server
 *  initialRaw    – raw text ที่มี @[userId] สำหรับ decode ตอนเปิด edit mode
 *  placeholder   – placeholder text
 *  rows          – จำนวน rows เริ่มต้น
 *  disabled      – disabled state
 *  className     – extra className
 *  onKeyDown     – key handler ส่งต่อ
 */

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { API_CONFIG } from "@/lib/config";
import { apiService } from "@/lib/api";

interface MentionUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string | null;
  avatarUrl: string | null;
}

interface MentionTextareaProps {
  value: string;
  onChange: (displayText: string) => void;
  onChangeRaw?: (rawText: string) => void;
  /** raw text with @[userId] — used to decode display text when opening edit mode */
  initialRaw?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onInput?: (e: React.FormEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  maxLength?: number;
}

export interface MentionTextareaHandle {
  getRawText: () => string;
  focus: () => void;
}

interface MentionToken {
  displayStart: number;
  displayEnd: number;
  raw: string;
}

function buildRaw(display: string, tokens: MentionToken[]): string {
  const sorted = [...tokens].sort((a, b) => a.displayStart - b.displayStart);
  let result = "";
  let cursor = 0;
  for (const tok of sorted) {
    result += display.slice(cursor, tok.displayStart);
    result += tok.raw;
    cursor = tok.displayEnd;
  }
  result += display.slice(cursor);
  return result;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decodeRaw(
  raw: string,
  nameMap: Map<string, string>
): { display: string; tokens: MentionToken[] } {
  const tokens: MentionToken[] = [];
  let display = "";
  let cursor = 0;
  const re = /@\[([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const uid = m[1].trim();
    if (!UUID_RE.test(uid)) continue;
    const name = nameMap.get(uid) ?? uid;
    const insertDisplay = `@${name} `;
    display += raw.slice(cursor, m.index);
    const tokenStart = display.length;
    display += insertDisplay;
    const tokenEnd = display.length;
    tokens.push({ displayStart: tokenStart, displayEnd: tokenEnd, raw: m[0] });
    cursor = m.index + m[0].length;
  }
  display += raw.slice(cursor);
  return { display, tokens };
}

function extractMentionIds(raw: string): string[] {
  const ids: string[] = [];
  const re = /@\[([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const uid = m[1].trim();
    if (UUID_RE.test(uid)) ids.push(uid);
  }
  return ids;
}

const MentionTextarea = forwardRef<MentionTextareaHandle, MentionTextareaProps>(
  (
    {
      value,
      onChange,
      onChangeRaw,
      initialRaw,
      placeholder,
      rows = 1,
      disabled,
      className,
      style,
      onInput,
      onKeyDown,
      maxLength,
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownUsers, setDropdownUsers] = useState<MentionUser[]>([]);
    const [dropdownLoading, setDropdownLoading] = useState(false);
    const [dropdownIndex, setDropdownIndex] = useState(0);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number; above: boolean } | null>(null);

    const mentionFragmentRef = useRef<{ start: number; query: string } | null>(null);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tokensRef = useRef<MentionToken[]>([]);

    // ── Decode initialRaw when it changes (e.g. opening edit popup) ──────────
    const initialRawRef = useRef<string | undefined>(undefined);
    useEffect(() => {
      // Reset the guard when initialRaw is cleared (popup closed/cancelled)
      if (!initialRaw) {
        initialRawRef.current = undefined;
        return;
      }
      if (initialRaw === initialRawRef.current) return;
      initialRawRef.current = initialRaw;

      const ids = extractMentionIds(initialRaw);
      if (ids.length === 0) {
        // No UUID mentions — raw IS display (or has no @[uuid])
        // Just emit the raw as-is so parent raw stays correct
        onChangeRaw?.(initialRaw);
        return;
      }

      const fetchAndDecode = async () => {
        try {
          const res = await fetch(
            `${API_CONFIG.BASE_URL}/api/users/batch?ids=${ids.map(encodeURIComponent).join(",")}`,
            { credentials: "include" }
          );
          if (!res.ok) return;
          const users: { id: string; firstName: string; lastName: string }[] = await res.json();
          const nameMap = new Map(users.map(u => [u.id, `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()]));
          const { display, tokens } = decodeRaw(initialRaw, nameMap);
          tokensRef.current = tokens;
          onChange(display);
          onChangeRaw?.(initialRaw);
        } catch { /* silent */ }
      };
      fetchAndDecode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialRaw]);

    const emitRaw = useCallback((display: string, tokens: MentionToken[]) => {
      const raw = buildRaw(display, tokens);
      onChangeRaw?.(raw);
      return raw;
    }, [onChangeRaw]);

    useEffect(() => {
      if (value === "") {
        tokensRef.current = [];
        initialRawRef.current = undefined;
      }
    }, [value]);

    useImperativeHandle(ref, () => ({
      getRawText: () => buildRaw(value, tokensRef.current),
      focus: () => textareaRef.current?.focus(),
    }));

    // ── Fixed dropdown position ───────────────────────────────────────────────
    const updateDropdownPos = useCallback(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      const rect = ta.getBoundingClientRect();
      const dropdownH = 260;
      const spaceBelow = window.innerHeight - rect.bottom;
      const above = spaceBelow < dropdownH && rect.top >= dropdownH;
      setDropdownPos({
        top: above ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: Math.min(rect.width, 320),
        above,
      });
    }, []);

    useLayoutEffect(() => {
      if (dropdownOpen) updateDropdownPos();
    }, [dropdownOpen, updateDropdownPos]);

    useEffect(() => {
      if (!dropdownOpen) return;
      const handler = () => updateDropdownPos();
      window.addEventListener("scroll", handler, true);
      window.addEventListener("resize", handler);
      return () => {
        window.removeEventListener("scroll", handler, true);
        window.removeEventListener("resize", handler);
      };
    }, [dropdownOpen, updateDropdownPos]);

    // ── Search users ──────────────────────────────────────────────────────────
    const searchUsers = useCallback(async (query: string) => {
      if (!query) { setDropdownUsers([]); return; }
      setDropdownLoading(true);
      try {
        const res = await fetch(
          `${API_CONFIG.BASE_URL}/api/users/search?query=${encodeURIComponent(query)}`,
          { credentials: "include" }
        );
        if (!res.ok) { setDropdownUsers([]); return; }
        const data: MentionUser[] = await res.json();
        setDropdownUsers(data.slice(0, 8));
      } catch { setDropdownUsers([]); }
      finally { setDropdownLoading(false); }
    }, []);

    // ── Handle text change ────────────────────────────────────────────────────
    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      const cursor = e.target.selectionStart ?? text.length;
      const before = text.slice(0, cursor);
      const atMatch = before.match(/@([^\s@\[\]]*)$/);

      if (atMatch) {
        const query = atMatch[1];
        const start = cursor - atMatch[0].length;
        mentionFragmentRef.current = { start, query };
        setDropdownOpen(true);
        setDropdownIndex(0);
        updateDropdownPos();
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => searchUsers(query), 200);
      } else {
        mentionFragmentRef.current = null;
        setDropdownOpen(false);
        setDropdownUsers([]);
      }

      const oldText = value;
      let prefixLen = 0;
      const minLen = Math.min(oldText.length, text.length);
      while (prefixLen < minLen && oldText[prefixLen] === text[prefixLen]) prefixLen++;
      let oldSuffixLen = 0;
      while (
        oldSuffixLen < oldText.length - prefixLen &&
        oldSuffixLen < text.length - prefixLen &&
        oldText[oldText.length - 1 - oldSuffixLen] === text[text.length - 1 - oldSuffixLen]
      ) oldSuffixLen++;
      const oldEditEnd = oldText.length - oldSuffixLen;
      const newEditEnd = text.length - oldSuffixLen;
      const delta = newEditEnd - oldEditEnd;

      const updatedTokens: MentionToken[] = [];
      for (const tok of tokensRef.current) {
        const overlapStart = Math.max(tok.displayStart, prefixLen);
        const overlapEnd = Math.min(tok.displayEnd, oldEditEnd);
        if (overlapStart < overlapEnd) continue;
        if (tok.displayStart >= oldEditEnd) {
          updatedTokens.push({ ...tok, displayStart: tok.displayStart + delta, displayEnd: tok.displayEnd + delta });
        } else {
          updatedTokens.push(tok);
        }
      }
      tokensRef.current = updatedTokens;
      onChange(text);
      emitRaw(text, updatedTokens);
    }, [value, onChange, emitRaw, searchUsers, updateDropdownPos]);

    // ── Select mention from dropdown ──────────────────────────────────────────
    const selectUser = useCallback((user: MentionUser) => {
      const frag = mentionFragmentRef.current;
      if (!frag) return;

      const displayName = `${user.firstName} ${user.lastName}`.trim();
      const insertDisplay = `@${displayName} `;
      const insertRaw = `@[${user.id}]`;

      const newDisplay =
        value.slice(0, frag.start) +
        insertDisplay +
        value.slice(frag.start + 1 + frag.query.length);

      const tokenStart = frag.start;
      const tokenEnd = frag.start + insertDisplay.length;
      const fragLen = 1 + frag.query.length;
      const delta = insertDisplay.length - fragLen;

      const updatedTokens = tokensRef.current.map((tok) =>
        tok.displayStart >= frag.start + fragLen
          ? { ...tok, displayStart: tok.displayStart + delta, displayEnd: tok.displayEnd + delta }
          : tok
      );
      updatedTokens.push({ displayStart: tokenStart, displayEnd: tokenEnd, raw: insertRaw });
      tokensRef.current = updatedTokens;

      onChange(newDisplay);
      emitRaw(newDisplay, updatedTokens);
      setDropdownOpen(false);
      setDropdownUsers([]);
      mentionFragmentRef.current = null;

      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.focus();
        ta.setSelectionRange(tokenEnd, tokenEnd);
      });
    }, [value, onChange, emitRaw]);

    // ── Keyboard navigation ───────────────────────────────────────────────────
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (dropdownOpen && dropdownUsers.length > 0) {
        if (e.key === "ArrowDown") { e.preventDefault(); setDropdownIndex(i => Math.min(i + 1, dropdownUsers.length - 1)); return; }
        if (e.key === "ArrowUp") { e.preventDefault(); setDropdownIndex(i => Math.max(i - 1, 0)); return; }
        if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); selectUser(dropdownUsers[dropdownIndex]); return; }
        if (e.key === "Escape") { setDropdownOpen(false); return; }
      }
      onKeyDown?.(e);
    }, [dropdownOpen, dropdownUsers, dropdownIndex, selectUser, onKeyDown]);

    // Close on outside click
    useEffect(() => {
      const close = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setDropdownOpen(false);
        }
      };
      document.addEventListener("mousedown", close);
      return () => document.removeEventListener("mousedown", close);
    }, []);

    return (
      <div ref={containerRef} className="relative w-full">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onInput={onInput}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={className}
          style={style}
          maxLength={maxLength}
        />

        {/* Dropdown — fixed position to escape any overflow:hidden/auto parent */}
        {dropdownOpen && dropdownPos && (
          <div
            className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-y-auto"
            style={{
              top: dropdownPos.above ? undefined : dropdownPos.top,
              bottom: dropdownPos.above ? `calc(100vh - ${dropdownPos.top}px)` : undefined,
              left: dropdownPos.left,
              width: dropdownPos.width,
              maxHeight: 260,
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {dropdownLoading ? (
              <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-400">
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                กำลังค้นหา…
              </div>
            ) : dropdownUsers.length === 0 ? (
              <div className="px-4 py-3 text-xs text-gray-400">ไม่พบผู้ใช้</div>
            ) : (
              dropdownUsers.map((user, idx) => {
                const fullName = `${user.firstName} ${user.lastName}`.trim();
                return (
                  <button
                    key={user.id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); selectUser(user); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      idx === dropdownIndex ? "bg-slate-100" : "hover:bg-gray-50"
                    }`}
                  >
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={apiService.getImageUrl(user.avatarUrl) || "/default-avatar.svg"}
                        alt={fullName}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-sm font-semibold text-gray-600">
                        {fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{fullName}</p>
                      {user.username && (
                        <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  }
);
MentionTextarea.displayName = "MentionTextarea";
export default MentionTextarea;
