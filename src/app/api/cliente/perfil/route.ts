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

    // 👇 Incluimos el campo dirección en la respuesta
    return NextResponse.json({
        username: user.username, // ✅ ESTE ERA EL FALTANTE
        nombre: user.nombre,
        apellido: user.apellido,
        dni: user.dni || "",
        telefono: user.telefono || "",
        email: user.email || null,
        fechaNacimiento: user.fechaNacimiento || null,
        direccion: user.direccion || "",
    });
}

// 📌 PUT actualizar perfil
export async function PUT(req: Request) {
    await connectMongoDB();
    const userId = getUserIdFromCookie(req);

    if (!userId) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    try {
        const { nombre, apellido, telefono, email, fechaNacimiento, direccion } =
            await req.json();

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

        // ✅ si viene vacío, lo limpiamos (opcional)
        if (email === "" || email === null) user.email = undefined;
        else if (email) user.email = email;

        if (fechaNacimiento) user.fechaNacimiento = new Date(fechaNacimiento);
        if (direccion !== undefined) user.direccion = direccion;

        await user.save();

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        // ✅ Email duplicado (Mongo)
        if (err?.code === 11000) {
            return NextResponse.json(
                { error: "Ese email ya está en uso. Probá con otro." },
                { status: 409 }
            );
        }

        console.error("PUT /api/cliente/perfil error:", err);
        return NextResponse.json(
            { error: "Error al guardar el perfil" },
            { status: 500 }
        );
    }
}
