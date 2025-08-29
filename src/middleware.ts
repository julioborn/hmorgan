import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      if (payload.role !== "admin") return NextResponse.redirect(new URL("/login", req.url));
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  if (pathname.startsWith("/cliente")) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/cliente/:path*"]
};
