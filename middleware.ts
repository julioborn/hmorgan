import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // 🚫 APIs nunca pasan por auth
    if (pathname.startsWith("/api")) {
        return NextResponse.next();
    }

    const hasSession = !!req.cookies.get("session")?.value;

    // 🔁 si está logueado y entra a login → home
    if (pathname.startsWith("/login") && hasSession) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    // 🔓 RUTAS PÚBLICAS (🔥 AGREGAR MENÚ ACÁ)
    if (
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/staff") ||
        pathname.startsWith("/menu") ||   // 🔥 CLAVE
        pathname === "/"                  // 🔥 CLAVE
    ) {
        return NextResponse.next();
    }

    // 🔒 RUTAS PRIVADAS
    if (!hasSession) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
}