import { NextRequest, NextResponse } from "next/server";

interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

// Decode HTML entities: &amp; &#064; &#x41; etc.
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/gi, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10))
    );
}

// Extract content from a <meta> tag flexibly — handles attributes in any order,
// including multi-line and attribute values that use double OR single quotes
function extractMeta(html: string, key: string): string | null {
  // Match the whole <meta ... > tag, then pull out `content`
  const tagPattern = new RegExp(
    `<meta[^>]+(?:property|name)\\s*=\\s*["']${key}["'][^>]*>`,
    "gi"
  );
  const tags = html.match(tagPattern);
  if (!tags) return null;
  for (const tag of tags) {
    const contentMatch =
      tag.match(/content\s*=\s*"([^"]*)"/) ??
      tag.match(/content\s*=\s*'([^']*)'/);
    if (contentMatch?.[1]) return decodeHtmlEntities(contentMatch[1].trim());
  }
  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : null;
}

function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

// Use YouTube oEmbed — reliable, no scraping needed
async function fetchYouTubeOEmbed(url: string): Promise<LinkPreview | null> {
  try {
    const oembed = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!oembed.ok) return null;
    const data = await oembed.json() as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
      provider_name?: string;
    };
    return {
      url,
      title: data.title ?? null,
      description: data.author_name ? `by ${data.author_name}` : null,
      image: data.thumbnail_url ?? null,
      siteName: data.provider_name ?? "YouTube",
      favicon: "https://www.google.com/s2/favicons?domain=youtube.com&sz=32",
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const hostname = parsedUrl.hostname.replace(/^www\./, "");

  // --- Sites that block scraping: return guaranteed clean cards ---
  const BLOCKED_SITES: Record<string, { name: string; favicon: string }> = {
    "instagram.com": { name: "Instagram", favicon: "https://www.google.com/s2/favicons?domain=instagram.com&sz=64" },
    "twitter.com":   { name: "Twitter / X", favicon: "https://www.google.com/s2/favicons?domain=twitter.com&sz=64" },
    "x.com":         { name: "Twitter / X", favicon: "https://www.google.com/s2/favicons?domain=x.com&sz=64" },
    "tiktok.com":    { name: "TikTok", favicon: "https://www.google.com/s2/favicons?domain=tiktok.com&sz=64" },
    "facebook.com":  { name: "Facebook", favicon: "https://www.google.com/s2/favicons?domain=facebook.com&sz=64" },
  };

  if (hostname in BLOCKED_SITES) {
    const site = BLOCKED_SITES[hostname];
    // Build a readable path label, e.g. "/pntwt_korn/" → "@pntwt_korn"
    const pathParts = parsedUrl.pathname.replace(/^\/|\/$/g, "").split("/").filter(Boolean);
    const label = pathParts.length > 0
      ? (hostname === "instagram.com" || hostname === "twitter.com" || hostname === "x.com"
          ? `@${pathParts[0]}`
          : `/${pathParts.join("/")}`)
      : null;
    return NextResponse.json({
      url: parsedUrl.href,
      title: label ?? site.name,
      description: label ? `${site.name} · ${label}` : site.name,
      image: null,
      siteName: site.name,
      favicon: site.favicon,
    } as LinkPreview, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  // --- YouTube: use oEmbed for proper title + thumbnail ---
  if (hostname === "youtube.com" || hostname === "youtu.be") {
    const result = await fetchYouTubeOEmbed(parsedUrl.href);
    if (result) {
      return NextResponse.json(result, {
        headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
      });
    }
    // fallback if oEmbed fails
    return NextResponse.json({
      url: parsedUrl.href,
      title: "YouTube",
      description: null,
      image: null,
      siteName: "YouTube",
      favicon: "https://www.google.com/s2/favicons?domain=youtube.com&sz=64",
    } as LinkPreview, {
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
    });
  }

  // --- Generic HTML scraping ---
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(parsedUrl.href, {
      signal: controller.signal,
      headers: {
        // Use a real browser UA to avoid being blocked
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "th,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch URL" }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json({
        url: parsedUrl.href,
        title: parsedUrl.hostname,
        description: null,
        image: null,
        siteName: parsedUrl.hostname,
        favicon: `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=32`,
      } as LinkPreview);
    }

    // Detect charset from Content-Type header
    const charsetMatch = contentType.match(/charset=([^\s;]+)/i);
    const charset = charsetMatch?.[1]?.toLowerCase() ?? "utf-8";

    // Read up to 100KB — enough to capture <head> even on large pages
    const reader = response.body?.getReader();
    let rawBytes = new Uint8Array(0);
    if (reader) {
      let bytesRead = 0;
      const maxBytes = 100 * 1024;
      const chunks: Uint8Array[] = [];
      while (bytesRead < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        bytesRead += value.byteLength;
        // Decode so far to check if we've passed </head>
        const partial = new TextDecoder(charset, { fatal: false }).decode(value);
        if (partial.toLowerCase().includes("</head>")) break;
      }
      reader.cancel();
      // Combine chunks
      const total = chunks.reduce((n, c) => n + c.byteLength, 0);
      rawBytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        rawBytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
    }

    const html = new TextDecoder(charset, { fatal: false }).decode(rawBytes);
    const baseUrl = response.url || parsedUrl.href;

    const ogTitle = extractMeta(html, "og:title");
    const ogDescription = extractMeta(html, "og:description");
    const ogImage = extractMeta(html, "og:image");
    const ogSiteName = extractMeta(html, "og:site_name");
    const twitterTitle = extractMeta(html, "twitter:title");
    const twitterDescription = extractMeta(html, "twitter:description");
    const twitterImage = extractMeta(html, "twitter:image");
    const metaDescription = extractMeta(html, "description");
    const pageTitle = extractTitle(html);

    // Favicon: try apple-touch-icon first (higher res), then regular icon
    const faviconPatterns = [
      /<link[^>]+rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
      /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["']/i,
      /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i,
      /<link[^>]+href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i,
    ];
    let faviconHref: string | null = null;
    for (const p of faviconPatterns) {
      const m = html.match(p);
      if (m?.[1]) { faviconHref = m[1]; break; }
    }
    const favicon = faviconHref
      ? resolveUrl(baseUrl, faviconHref)
      : `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=32`;

    const imageRaw = ogImage ?? twitterImage ?? null;
    const imageUrl = imageRaw ? resolveUrl(baseUrl, imageRaw) : null;

    const preview: LinkPreview = {
      url: baseUrl,
      title: ogTitle ?? twitterTitle ?? pageTitle ?? parsedUrl.hostname,
      description: ogDescription ?? twitterDescription ?? metaDescription ?? null,
      image: imageUrl,
      siteName: ogSiteName ?? parsedUrl.hostname,
      favicon,
    };

    return NextResponse.json(preview, {
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }
    console.error("[link-preview] error:", error);
    return NextResponse.json({ error: "Failed to fetch preview" }, { status: 500 });
  }
}
