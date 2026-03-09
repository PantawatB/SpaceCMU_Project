import { NextRequest, NextResponse } from "next/server";

interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

function extractMeta(html: string, property: string): string | null {
  // Match og: and twitter: meta tags, also regular <title>
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*name=["']${property}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim() ?? null;
}

function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(parsedUrl.href, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SpaceCMU-LinkPreview/1.0)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "th,en;q=0.9",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch URL" }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      // Not an HTML page — return basic info
      const preview: LinkPreview = {
        url: parsedUrl.href,
        title: parsedUrl.hostname,
        description: null,
        image: null,
        siteName: parsedUrl.hostname,
        favicon: `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=32`,
      };
      return NextResponse.json(preview);
    }

    // Read only the first 50KB (head of the HTML) to extract meta tags quickly
    const reader = response.body?.getReader();
    let html = "";
    if (reader) {
      let bytesRead = 0;
      const maxBytes = 50 * 1024;
      while (bytesRead < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        html += new TextDecoder().decode(value);
        bytesRead += value.byteLength;
        // Stop once we have the </head>
        if (html.includes("</head>")) break;
      }
      reader.cancel();
    }

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

    // Extract favicon
    const faviconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)
      ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);
    const faviconHref = faviconMatch?.[1];
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
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }
    console.error("[link-preview] error:", error);
    return NextResponse.json({ error: "Failed to fetch preview" }, { status: 500 });
  }
}
