import { NextRequest } from "next/server";
import { OWNER_USER_ID } from "./owner";

/**
 * Valida que la request venga con una sesión ADMIN.
 * Devuelve el usuario si es válido; de lo contrario devuelve null.
 * (Proxy interno a /api/auth/me conservando las cookies)
 */
export async function requireAdmin(req: NextRequest) {
    const r = await fetch(new URL("/api/auth/me", req.nextUrl.origin), {
        headers: { cookie: req.headers.get("cookie") || "" },
        cache: "no-store",
    }).catch(() => null);

    if (!r || !r.ok) return null;

    const data = await r.json().catch(() => ({}));
    const user = data?.user;
    if (!user || (user.role !== "admin" && user.id !== OWNER_USER_ID)) return null;
    return user as {
        id: string;
        role: "admin" | "cliente";
        nombre?: string;
        apellido?: string;
    };
}
