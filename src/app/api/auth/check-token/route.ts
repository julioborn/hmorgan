// src/app/api/auth/check-token/route.ts
import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function GET(req: Request) {
    await connectMongoDB();
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 });

    const user = await User.findOne({ resetToken: token });
    if (!user || !user.resetTokenExp) {
        return NextResponse.json({ error: "Token inválido o caducado" }, { status: 400 });
    }

    const now = new Date();
    const exp = new Date(user.resetTokenExp);
    const diff = Math.floor((exp.getTime() - now.getTime()) / 1000); // segundos restantes

    if (diff <= 0) {
        return NextResponse.json({ error: "Token caducado" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, timeLeft: diff });
}
