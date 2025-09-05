import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";
import type { Types } from "mongoose";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

type LeanUser = {
  _id: Types.ObjectId;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  role: "cliente" | "admin";
  qrToken: string;
  puntos: number;
};

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.json({ user: null });

  try {
    const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;

    await connectMongoDB();
    const u = await User.findById(payload.sub)
      .select("_id nombre apellido dni telefono role qrToken puntos")
      .lean<LeanUser>();

    if (!u) return NextResponse.json({ user: null });

    // Armamos el user serializable
    const safeUser = {
      id: u._id.toString(),
      nombre: u.nombre,
      apellido: u.apellido,
      dni: u.dni,
      telefono: u.telefono,
      role: u.role,
      qrToken: u.qrToken,
      puntos: u.puntos ?? 0,
    };

    // Base response
    const res = NextResponse.json({ user: safeUser });

    // 🔁 Sliding session: si faltan < 30 días, renovamos por 1 año
    const now = Math.floor(Date.now() / 1000);
    const exp = typeof (payload as any).exp === "number" ? (payload as any).exp : 0;
    const timeLeft = exp - now;
    const THIRTY_DAYS = 60 * 60 * 24 * 30;

    if (timeLeft > 0 && timeLeft < THIRTY_DAYS) {
      const fresh = jwt.sign(
        { sub: u._id.toString(), role: u.role },
        NEXTAUTH_SECRET,
        { expiresIn: "365d" }
      );
      const isProd = process.env.NODE_ENV === "production";
      res.cookies.set("session", fresh, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProd,
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return res;
  } catch (e) {
    // token inválido/expirado o error general
    return NextResponse.json({ user: null });
  }
}
