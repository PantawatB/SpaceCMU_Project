"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";

interface PullToRefreshProps {
  /** The scrollable element ref — pull will only trigger when scrollTop === 0 */
  scrollRef: React.RefObject<HTMLElement | null>;
  /** Called when the user pulls far enough and releases */
  onRefresh: () => void | Promise<void>;
  /** How many px the user must pull before releasing triggers refresh (default 72) */
  threshold?: number;
  children?: React.ReactNode;
}

/**
 * Adds a native-feel pull-to-refresh indicator to any scrollable container.
 * Works on both iOS Safari and Android Chrome (touch events only — no pull on desktop).
 *
 * Usage:
 *   <PullToRefresh scrollRef={myRef} onRefresh={() => window.location.reload()}>
 *     <div ref={myRef} className="overflow-y-auto flex-1">
 *       {content}
 *     </div>
 *   </PullToRefresh>
 */
export default function PullToRefresh({
  scrollRef,
  onRefresh,
  threshold = 72,
  children,
}: PullToRefreshProps) {
  const [pullY, setPullY] = useState(0);       // current pull distance (px)
  const [releasing, setReleasing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    // Only start a pull if we're already at the very top of the scroll
    if (el.scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
    isPullingRef.current = true;
  }, [scrollRef]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPullingRef.current || startYRef.current === null) return;
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) {
      // Scrolled down during the move — cancel pull
      isPullingRef.current = false;
      setPullY(0);
      return;
    }

    const dy = e.touches[0].clientY - startYRef.current;
    if (dy <= 0) {
      setPullY(0);
      return;
    }

    // Rubber-band: slows down as you pull further
    const rubber = Math.min(dy * 0.45, threshold * 1.4);
    setPullY(rubber);
    setReleasing(false);

    // Prevent the page from scrolling up while we're handling the pull
    if (dy > 4) e.preventDefault();
  }, [scrollRef, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;
    startYRef.current = null;

    if (pullY >= threshold && !refreshing) {
      setReleasing(true);
      setPullY(threshold * 0.75); // snap to indicator height
      setRefreshing(true);
      try {
        await Promise.resolve(onRefresh());
      } finally {
        setRefreshing(false);
        setReleasing(false);
        setPullY(0);
      }
    } else {
      setReleasing(true);
      setPullY(0);
      // Reset releasing flag after animation
      setTimeout(() => setReleasing(false), 300);
    }
  }, [pullY, threshold, refreshing, onRefresh]);

  // Attach events directly on the scrollable element (passive:false so we can preventDefault)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [scrollRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullY / threshold, 1); // 0 → 1
  const ready = pullY >= threshold;

  return (
    <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Indicator */}
      {pullY > 0 && (
        <div
          className="absolute left-0 right-0 top-0 z-50 flex items-end justify-center pointer-events-none"
          style={{
            height: `${pullY}px`,
            transition: releasing ? "height 0.3s cubic-bezier(0.25,0.46,0.45,0.94)" : "none",
          }}
        >
          <div
            className={`mb-2 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-colors duration-150 ${
              refreshing ? "bg-slate-800" : ready ? "bg-slate-700" : "bg-white border border-gray-200"
            }`}
            style={{
              opacity: Math.min(progress * 1.5, 1),
              transform: `scale(${0.6 + progress * 0.4})`,
            }}
          >
            {/* Spinner — วนตลอดเวลาที่กำลัง pull หรือ refreshing */}
            <svg
              className={`w-4 h-4 text-white ${refreshing || ready ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              style={{
                opacity: refreshing || ready ? 1 : 0.6,
                // ก่อน threshold ให้หมุนตามความลึกที่ดึง แทน animate-spin
                transform: refreshing || ready ? undefined : `rotate(${progress * 270}deg)`,
                transition: refreshing || ready ? "none" : "transform 0.05s linear",
              }}
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        </div>
      )}

      {/* Content shifted down while pulling */}
      <div
        className="flex-1 flex flex-col min-h-0"
        style={{
          transform: pullY > 0 ? `translateY(${pullY}px)` : "none",
          transition: releasing ? "transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
