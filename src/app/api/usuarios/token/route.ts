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

        // Quitar el token de cualquier otro usuario que lo tenga (cambio de cuenta)
        await User.updateMany(
            { _id: { $ne: payload.sub }, $or: [{ fcmTokens: token }, { tokenFCM: token }] },
            { $pull: { fcmTokens: token }, $unset: { tokenFCM: "" } }
        );

        const user = await User.findByIdAndUpdate(
            payload.sub,
            { $addToSet: { fcmTokens: token } },
            { new: true }
        );
        if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

        console.log(`✅ Token FCM registrado para ${user.nombre} — total tokens: ${user.fcmTokens?.length ?? 1}`);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("❌ Error guardando token FCM:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { token } = await req.json();
        if (!token) return NextResponse.json({ error: "Falta el token" }, { status: 400 });

        const sessionToken = req.cookies.get("session")?.value;
        if (!sessionToken) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const payload = jwt.verify(sessionToken, NEXTAUTH_SECRET) as any;

        await connectMongoDB();

        const user = await User.findByIdAndUpdate(
            payload.sub,
            { $pull: { fcmTokens: token }, $unset: { tokenFCM: "" } },
            { new: true }
        );
        if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

        console.log(`🗑️ Token FCM eliminado para ${user.nombre}`);

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("❌ Error eliminando token FCM:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
