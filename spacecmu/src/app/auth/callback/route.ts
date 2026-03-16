import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  // Determine the public frontend URL — prefer the forwarded host from Railway's proxy
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const baseUrl = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") || // strip /api if present
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/`);
  }

  // Basic JWT format validation (3 base64url segments) to prevent token injection
  const jwtPattern = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/;
  if (!jwtPattern.test(token)) {
    return NextResponse.redirect(`${baseUrl}/`);
  }

  const response = NextResponse.redirect(`${baseUrl}/Feeds`);

  // Set the cookie on the frontend domain so middleware can read it.
  response.cookies.set("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60, // 1 day in seconds
  });

  return response;
}
