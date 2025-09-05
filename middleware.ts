import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// 👇 secret igual que en tu [...nextauth].ts
const secret = process.env.NEXTAUTH_SECRET;

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // 🔓 rutas públicas
    if (
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/staff") ||
        pathname === "/"
    ) {
        return NextResponse.next();
    }

    // 🔑 recuperamos token desde cookie
    const token = await getToken({ req, secret });

    if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // 🚨 chequeamos rol para admin
    if (pathname.startsWith("/admin") && token.role !== "admin") {
        return NextResponse.redirect(new URL("/", req.url));
    }

    // 🚨 chequeamos rol para cliente
    if (pathname.startsWith("/cliente") && token.role !== "cliente") {
        return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/cliente/:path*"],
};
