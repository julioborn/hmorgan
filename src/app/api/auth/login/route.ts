import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const { dni, password } = await req.json();
    if (!dni || !password) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    await connectMongoDB();

    const user = await User.findOne({ dni });
    if (!user) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

    const token = jwt.sign({ sub: user._id.toString(), role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    const isProd = process.env.NODE_ENV === "production";
    const res = NextResponse.json({ ok: true });
    res.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,         // 👈 solo secure en prod
      path: "/",
    });
    return res;
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error en login" }, { status: 500 });
  }
}
