import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { nombre, apellido, dni, telefono } = await req.json();

    if (!nombre || !apellido || !dni || !telefono) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    await connectMongoDB();

    const exists = await User.findOne({ dni });
    if (exists) return NextResponse.json({ error: "DNI ya registrado" }, { status: 409 });

    const provisional = `${nombre}${dni}`;
    const passwordHash = await bcrypt.hash(provisional, 10);
    const qrToken = crypto.randomUUID();

    const user = await User.create({
      nombre, apellido, dni, telefono,
      passwordHash,
      role: "cliente",
      qrToken,
      points: 0,
    });

    return NextResponse.json({
      ok: true,
      userId: user._id.toString(),
      provisionalPassword: provisional,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error registrando" }, { status: 500 });
  }
}
