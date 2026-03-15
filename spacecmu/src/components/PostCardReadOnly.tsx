"use client";

import { useState, useEffect, useRef } from "react";
import { apiService } from "@/lib/api";
import MentionText from "@/components/MentionText";

// ── Link preview helpers ──────────────────────────────────────────────────────
interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

const URL_REGEX = /https?:\/\/(?:[-\w]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/g;

function extractFirstUrl(text: string): string | null {
  return text.match(URL_REGEX)?.[0] ?? null;
}
// ─────────────────────────────────────────────────────────────────────────────

interface PostMedia {
  id: number;
  postId: number;
  mediaUrl: string;
  mediaType: "image" | "video";
  order: number;
  fileSize: number | null;
}

interface Post {
  id: string;
  userId?: string;
  content: string;
  category?: string;
  likeCount?: number;
  commentCount?: number;
  repostCount?: number;
  createdAt: string;
  author?: {
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    role?: string | null;
  };
  media?: PostMedia[];
}

interface PostCardReadOnlyProps {
  post: Post;
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

/**
 * A read-only view of a post — shows author, content, and media,
 * but NO action buttons (like / comment / repost / save).
 */
export default function PostCardReadOnly({ post }: PostCardReadOnlyProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(
    (post.media?.length ?? 0) > 1,
  );

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Link preview
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [loadingLinkPreview, setLoadingLinkPreview] = useState(false);
  const linkPreviewFetchedFor = useRef<string | null>(null);

  useEffect(() => {
    const url = extractFirstUrl(post.content ?? "");
    if (!url || url === linkPreviewFetchedFor.current) return;
    linkPreviewFetchedFor.current = url;
    const fetchPreview = async () => {
      setLoadingLinkPreview(true);
      try {
        const r = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, { cache: "no-store" });
        const data: LinkPreview | null = r.ok ? await r.json() : null;
        setLinkPreview(data && !data.title?.match(/^error$/i) ? data : null);
      } catch {
        setLinkPreview(null);
      } finally {
        setLoadingLinkPreview(false);
      }
    };
    fetchPreview();
  }, [post.content]);

  const handleMediaScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 0);
    setShowRightArrow(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  // Initialise arrow state after mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowRightArrow(el.scrollWidth > el.clientWidth + 4);
  }, [post.media]);

  // Close lightbox on Escape / Arrow keys
  useEffect(() => {
    if (lightboxIndex === null) return;
    const images = (post.media ?? []).filter((m) => m.mediaType === "image");
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft" && lightboxIndex > 0)
        setLightboxIndex((i) => (i ?? 0) - 1);
      if (e.key === "ArrowRight" && lightboxIndex < images.length - 1)
        setLightboxIndex((i) => (i ?? 0) + 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxIndex, post.media]);

  const authorName =
    post.author?.firstName || post.author?.lastName
      ? `${post.author.firstName ?? ""} ${post.author.lastName ?? ""}`.trim()
      : "Anonymous";

  const imageOnlyMedia = (post.media ?? []).filter(
    (m) => m.mediaType === "image",
  );

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            apiService.getImageUrl(post.author?.avatarUrl) ||
            "/default-avatar.svg"
          }
          alt={authorName}
          className="w-9 h-9 rounded-full object-cover shrink-0"
        />
        <div className="min-w-0">
          <div className="font-semibold text-sm text-gray-800 truncate flex items-center gap-1">
            {authorName}
            {post.author?.role === 'official_account' && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-3.5 h-3.5 text-blue-500 shrink-0"
                aria-label="Verified official account"
              >
                <path
                  fillRule="evenodd"
                  d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            {post.category && (
              <>
                <span>{post.category}</span>
                <span>·</span>
              </>
            )}
            <span>{getTimeAgo(post.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {post.content && (
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap wrap-break-word mb-3">
          <MentionText text={post.content} />
        </p>
      )}

      {/* ── Link Preview Card ── */}
      {(linkPreview || loadingLinkPreview) && !(post.media?.length) && (
        <div className="mb-3">
          {loadingLinkPreview ? (
            <div className="animate-pulse border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
              <div className="h-24 bg-gray-200 w-full" />
              <div className="px-3 py-2.5 flex items-start gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="h-2 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-3/5" />
                  <div className="h-2 bg-gray-200 rounded w-full" />
                </div>
              </div>
            </div>
          ) : linkPreview ? (
            <a
              href={linkPreview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all group no-underline"
              onClick={(e) => e.stopPropagation()}
            >
              {linkPreview.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={linkPreview.image}
                  alt=""
                  className="w-full max-h-40 object-cover bg-gray-100"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div className="px-3 py-2.5 flex items-start gap-2.5 bg-white">
                {linkPreview.favicon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={linkPreview.favicon}
                    alt=""
                    className="w-4 h-4 rounded shrink-0 mt-0.5"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  {linkPreview.siteName && (
                    <p className="text-[11px] text-gray-400 mb-0.5 truncate uppercase tracking-wide font-medium">
                      {linkPreview.siteName}
                    </p>
                  )}
                  {linkPreview.title && (
                    <p className="text-sm font-semibold text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
                      {linkPreview.title}
                    </p>
                  )}
                  {linkPreview.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {linkPreview.description}
                    </p>
                  )}
                </div>
              </div>
            </a>
          ) : null}
        </div>
      )}

      {/* ── Media ── */}
      {post.media && post.media.length > 0 && (
        <div className="relative group/media">
          {/* Left scroll arrow */}
          {post.media.length > 1 && showLeftArrow && (
            <button
              className="absolute left-1 top-1/2 -translate-y-1/2 z-10 opacity-80 hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                const el = scrollRef.current;
                if (el) el.scrollBy({ left: -240, behavior: "smooth" });
              }}
            >
              <div className="bg-white/90 rounded-full p-1.5 shadow">
                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
            </button>
          )}
          {/* Right scroll arrow */}
          {post.media.length > 1 && showRightArrow && (
            <button
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 opacity-80 hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                const el = scrollRef.current;
                if (el) el.scrollBy({ left: 240, behavior: "smooth" });
              }}
            >
              <div className="bg-white/90 rounded-full p-1.5 shadow">
                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )}

          <div
            ref={scrollRef}
            className="overflow-x-auto overflow-y-hidden scrollbar-hide"
            onScroll={handleMediaScroll}
          >
            <div
              className={`flex items-center gap-2 ${
                post.media.length === 1 ? "w-full justify-center" : "w-max"
              }`}
            >
              {post.media.map((media, index) => {
                const isSingle = post.media!.length === 1;
                const imageIndex = post
                  .media!.slice(0, index + 1)
                  .filter((m) => m.mediaType === "image").length - 1;

                return (
                  <div
                    key={media.id}
                    className={`relative rounded-xl overflow-hidden shrink-0 ${
                      media.mediaType === "image" ? "cursor-pointer" : ""
                    }`}
                    style={{ width: isSingle ? "100%" : "auto" }}
                    onClick={() => {
                      if (media.mediaType === "image") {
                        setLightboxIndex(imageIndex);
                      }
                    }}
                  >
                    {media.mediaType === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={apiService.getImageUrl(media.mediaUrl) || ""}
                        alt={`Media ${index + 1}`}
                        className="rounded-xl"
                        style={{
                          width: isSingle ? "100%" : "auto",
                          height: isSingle ? "auto" : "320px",
                          maxHeight: isSingle ? "520px" : "320px",
                          objectFit: "contain",
                        }}
                        loading="lazy"
                      />
                    ) : (
                      <video
                        src={apiService.getImageUrl(media.mediaUrl) || ""}
                        controls
                        preload="metadata"
                        className="rounded-xl"
                        style={{
                          width: isSingle ? "100%" : "auto",
                          height: isSingle ? "auto" : "320px",
                          maxHeight: isSingle ? "520px" : "320px",
                          objectFit: "contain",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Stats row (read-only counts, no buttons) */}
      {(post.likeCount !== undefined ||
        post.commentCount !== undefined ||
        post.repostCount !== undefined) && (
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          {post.likeCount !== undefined && post.likeCount > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              {post.likeCount}
            </span>
          )}
          {post.commentCount !== undefined && post.commentCount > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {post.commentCount}
            </span>
          )}
          {post.repostCount !== undefined && post.repostCount > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {post.repostCount}
            </span>
          )}
        </div>
      )}

      {/* ── Image Lightbox ── */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-200 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* Counter */}
          {imageOnlyMedia.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/40 text-white text-sm">
              {lightboxIndex + 1} / {imageOnlyMedia.length}
            </div>
          )}
          {/* Prev */}
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i ?? 1) - 1); }}
              className="absolute left-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {/* Next */}
          {lightboxIndex < imageOnlyMedia.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i ?? 0) + 1); }}
              className="absolute right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {/* Image */}
          <div onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={apiService.getImageUrl(imageOnlyMedia[lightboxIndex]?.mediaUrl) || ""}
              alt={`Full ${lightboxIndex + 1}`}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl select-none"
              draggable={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
