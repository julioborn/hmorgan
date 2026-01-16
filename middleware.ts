import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // 🚫 APIs NUNCA pasan por auth
    if (pathname.startsWith("/api")) {
        return NextResponse.next();
    }

    // 🍪 solo verificamos existencia de cookie
    const hasSession = !!req.cookies.get("session")?.value;

    // 🔁 si está logueado y entra a /login → /
    if (pathname.startsWith("/login") && hasSession) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    // 🔓 rutas públicas
    if (
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/staff")
    ) {
        return NextResponse.next();
    }

    // 🔒 rutas privadas
    if (!hasSession) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
}
