import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "");

async function verifyJWT(token: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as any; // { sub, role, ... }
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Proteger rutas de admin
  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get("session")?.value || "";
    const payload = await verifyJWT(token);

    if (!payload || payload.role !== "admin") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  }

  // Proteger rutas de cliente
  if (pathname.startsWith("/cliente")) {
    const token = req.cookies.get("session")?.value || "";
    const payload = await verifyJWT(token);

    if (!payload) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/cliente/:path*"],
};
