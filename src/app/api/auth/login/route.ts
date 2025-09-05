import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error("Falta NEXTAUTH_SECRET");
      return NextResponse.json(
        { error: "Config del servidor incompleta (NEXTAUTH_SECRET)" },
        { status: 500 }
      );
    }

    const { dni, password } = await req.json();
    if (!dni || !password) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    await connectMongoDB();

    const user = await User.findOne({ dni }).select("+passwordHash");
    if (!user) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    // 🔒 JWT largo (1 año)
    const token = jwt.sign(
      { sub: user._id.toString(), role: user.role },
      secret,
      { expiresIn: "365d" }
    );

    const isProd = process.env.NODE_ENV === "production";
    const res = NextResponse.json({ ok: true });

    // 🔒 Cookie persistente (1 año)
    res.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd, // en Vercel true
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 año (segundos)
    });

    return res;
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json({ error: "Error en login" }, { status: 500 });
  }
}
