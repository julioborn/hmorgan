import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";

function getUserIdFromCookie(req: Request) {
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/session=([^;]+)/);
    if (!match) return null;

    try {
        const token = match[1];
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!);
        return (decoded as any).sub;
    } catch {
        return null;
    }
}

// 📌 GET perfil
export async function GET(req: Request) {
    await connectMongoDB();
    const userId = getUserIdFromCookie(req);

    if (!userId) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const user = await User.findById(userId);
    if (!user) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
        nombre: user.nombre,
        apellido: user.apellido,
        dni: user.dni,
        telefono: user.telefono,
        email: user.email || null,
        fechaNacimiento: user.fechaNacimiento || null,
    });
}

// 📌 PUT actualizar perfil
export async function PUT(req: Request) {
    await connectMongoDB();
    const userId = getUserIdFromCookie(req);

    if (!userId) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { nombre, apellido, telefono, email, fechaNacimiento } = await req.json();

    if (nombre?.trim().length < 2 || apellido?.trim().length < 2) {
        return NextResponse.json(
            { error: "Nombre y apellido deben tener al menos 2 letras" },
            { status: 400 }
        );
    }

    const user = await User.findById(userId);
    if (!user) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    user.nombre = nombre;
    user.apellido = apellido;
    user.telefono = telefono;
    if (email) user.email = email;
    if (fechaNacimiento) user.fechaNacimiento = new Date(fechaNacimiento);

    await user.save();

    return NextResponse.json({ ok: true });
}
