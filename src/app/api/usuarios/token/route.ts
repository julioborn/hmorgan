import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();
        if (!token) return NextResponse.json({ error: "Falta el token" }, { status: 400 });

        const sessionToken = req.cookies.get("session")?.value;
        if (!sessionToken) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(sessionToken, NEXTAUTH_SECRET) as any;

        await connectMongoDB();

        const user = await User.findById(payload.sub);
        if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

        user.tokenFCM = token;
        await user.save();

        console.log(`✅ Token FCM guardado para ${user.nombre} (${user.role})`);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("❌ Error guardando token FCM:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
