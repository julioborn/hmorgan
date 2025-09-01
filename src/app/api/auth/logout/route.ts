import { NextResponse } from "next/server";

export async function POST() {
  const isProd = process.env.NODE_ENV === "production";

  const res = NextResponse.json({ ok: true });

  // Borrar la cookie `session`
  res.cookies.set("session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    expires: new Date(0), // ✅ mejor que maxAge: 0, borra siempre
  });

  return res;
}
