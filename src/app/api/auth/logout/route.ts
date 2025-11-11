import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // 🧹 Forzar eliminación total de la cookie "session"
  res.cookies.set("session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0), // ✅ elimina siempre
  });

  // ⚙️ También borramos variantes residuales por seguridad
  res.cookies.set("session", "", {
    path: "/api",
    expires: new Date(0),
  });

  res.cookies.set("session", "", {
    path: "/",
    secure: false,
    expires: new Date(0),
  });

  return res;
}
