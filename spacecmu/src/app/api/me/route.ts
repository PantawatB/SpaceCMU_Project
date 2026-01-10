import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
    const token = req.cookies.get("token")?.value;

    if (!token) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        const jwtSecret = process.env.JWT_SECRET || "fallback_secret";
        const decoded = jwt.verify(token, jwtSecret);
        return NextResponse.json({ user: decoded });
    } catch (error) {
        console.error("JWT verification failed:", error);
        return NextResponse.json({ error: "Invalid token", details: String(error) }, { status: 401 });
    }
}
