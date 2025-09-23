// src/app/api/cliente/cambiar-password/route.ts
import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        await connectMongoDB();
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        if (!user.email) {
            return NextResponse.json(
                { error: "Necesitas registrar un email para cambiar la contraseña" },
                { status: 400 }
            );
        }

        const { password, confirmPassword } = await req.json();

        if (!password || password.length < 6) {
            return NextResponse.json(
                { error: "La contraseña debe tener al menos 6 caracteres" },
                { status: 400 }
            );
        }
        if (password !== confirmPassword) {
            return NextResponse.json(
                { error: "Las contraseñas no coinciden" },
                { status: 400 }
            );
        }

        user.passwordHash = await bcrypt.hash(password, 10);
        await user.save();

        return NextResponse.json({ ok: true, message: "Contraseña actualizada" });
    } catch (e) {
        console.error("Error en cambiar-password:", e);
        return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
    }
}
