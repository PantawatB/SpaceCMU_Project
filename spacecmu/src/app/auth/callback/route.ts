import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Basic JWT format validation (3 base64url segments) to prevent token injection
  const jwtPattern = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/;
  if (!jwtPattern.test(token)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.redirect(new URL("/Feeds", request.url));

  // Set the cookie on the frontend domain so middleware can read it.
  // httpOnly = JS cannot access it, secure = HTTPS only.
  response.cookies.set("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60, // 1 day in seconds
  });

  return response;
}
