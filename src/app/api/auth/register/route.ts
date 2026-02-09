import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
const USERNAME_REGEX = /^[a-z0-9._]{3,20}$/;

export async function POST(req: NextRequest) {
  try {
    const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
    if (!NEXTAUTH_SECRET) {
      console.error("Falta NEXTAUTH_SECRET");
      return NextResponse.json(
        { error: "Config del servidor incompleta (NEXTAUTH_SECRET)" },
        { status: 500 }
      );
    }

    const { username, password, nombre, apellido, email, telefono, dni } = await req.json();

    const normalizedUsername = String(username).toLowerCase().trim();

    if (!normalizedUsername || normalizedUsername.length < 3) {
      return NextResponse.json({ error: "Usuario inválido" }, { status: 400 });
    }

    if (!USERNAME_REGEX.test(normalizedUsername)) {
      return NextResponse.json(
        { error: "Usuario inválido (solo letras, números, . y _)" },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Contraseña inválida" }, { status: 400 });
    }

    if (!nombre || !apellido) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    await connectMongoDB();

    const exists = await User.findOne({ username: normalizedUsername })
      .select("_id")
      .lean();
    if (exists) {
      return NextResponse.json({ error: "El usuario ya existe" }, { status: 409 });
    }

    let dniStr: string | undefined;
    if (dni) {
      dniStr = String(dni).replace(/\D/g, "");
    }

    // qrToken único
    let qrToken = randomBytes(16).toString("hex");
    // asegurar unicidad por si acaso
    while (await User.exists({ qrToken })) {
      qrToken = randomBytes(16).toString("hex");
    }

    const user = await User.create({
      username: normalizedUsername,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      passwordHash: await bcrypt.hash(password, 10),

      dni: dniStr,
      telefono,
      email: email ? String(email).toLowerCase().trim() : undefined,

      role: "cliente",
      qrToken,
      puntos: 0,

    });

    // JWT largo (1 año)
    const token = jwt.sign(
      { sub: user._id.toString(), role: user.role },
      NEXTAUTH_SECRET,
      { expiresIn: "365d" }
    );

    // Setear cookie persistente (1 año)
    const isSecure =
      process.env.NODE_ENV === "production" &&
      req.headers.get("x-forwarded-proto") === "https";
    const res = NextResponse.json({ ok: true });
    res.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return res;
  } catch (e) {
    console.error("Register error:", e);
    return NextResponse.json({ error: "Error al registrar" }, { status: 500 });
  }
}
