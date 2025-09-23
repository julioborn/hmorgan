import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    await connectMongoDB();
    const { token, password, confirmPassword } = await req.json();

    if (!password || password.length < 6) {
        return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }
    if (password !== confirmPassword) {
        return NextResponse.json({ error: "Las contraseñas no coinciden" }, { status: 400 });
    }

    const user = await User.findOne({
        resetToken: token,
        resetTokenExp: { $gt: new Date() }, // que no haya vencido
    });

    if (!user) {
        return NextResponse.json({ error: "Token inválido o caducado" }, { status: 400 });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExp = undefined;
    await user.save();

    return NextResponse.json({ ok: true });
}
