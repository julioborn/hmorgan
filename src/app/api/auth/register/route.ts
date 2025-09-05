import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";

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

    const { nombre, apellido, dni, telefono } = await req.json();

    // Validaciones mínimas
    if (!nombre || !apellido || !dni || !telefono) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }
    const dniStr = String(dni).replace(/\D/g, "");
    const telStr = String(telefono).replace(/\D/g, "");
    if (dniStr.length < 7 || dniStr.length > 9) {
      return NextResponse.json({ error: "DNI inválido" }, { status: 400 });
    }
    if (telStr.length < 6 || telStr.length > 15) {
      return NextResponse.json({ error: "Teléfono inválido" }, { status: 400 });
    }

    await connectMongoDB();

    // Unicidad por DNI
    const exists = await User.findOne({ dni: dniStr }).select("_id").lean();
    if (exists) {
      return NextResponse.json({ error: "El DNI ya está registrado" }, { status: 409 });
    }

    // Contraseña provisional (nombre + dni), tal como definiste
    const baseName = String(nombre).trim().split(/\s+/)[0].toLowerCase();
    const provisionalPassword = `${baseName}${dniStr}`;

    const passwordHash = await bcrypt.hash(provisionalPassword, 10);

    // qrToken único
    let qrToken = randomBytes(16).toString("hex");
    // asegurar unicidad por si acaso
    while (await User.exists({ qrToken })) {
      qrToken = randomBytes(16).toString("hex");
    }

    // Crear usuario
    const user = await User.create({
      nombre: String(nombre).trim(),
      apellido: String(apellido).trim(),
      dni: dniStr,
      telefono: telStr,
      passwordHash,
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
    const isProd = process.env.NODE_ENV === "production";
    const res = NextResponse.json({
      ok: true,
      provisionalPassword, // por si querés mostrarla en el front (opcional)
    });
    res.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 año
    });

    return res;
  } catch (e) {
    console.error("Register error:", e);
    return NextResponse.json({ error: "Error al registrar" }, { status: 500 });
  }
}
