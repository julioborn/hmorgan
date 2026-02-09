export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";
import type { Types } from "mongoose";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

type LeanUser = {
    _id: Types.ObjectId;
    username: string;
    nombre: string;
    apellido: string;
    puntos?: number;
};

export async function GET(req: NextRequest) {
    try {
        // auth admin
        const token = req.cookies.get("session")?.value;
        if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;
        if (payload.role !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

        const { searchParams } = new URL(req.url);
        const qrToken = searchParams.get("qrToken") || "";
        if (!qrToken) return NextResponse.json({ error: "Falta qrToken" }, { status: 400 });

        await connectMongoDB();

        const user = await User.findOne({ qrToken })
            .select("_id username nombre apellido puntos")
            .lean<LeanUser>();

        if (!user) return NextResponse.json({ error: "QR inválido" }, { status: 404 });

        return NextResponse.json({
            ok: true,
            user: {
                id: user._id.toString(),
                username: user.username,
                nombre: user.nombre,
                apellido: user.apellido,
                puntos: user.puntos ?? 0,
            },
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Error resolviendo QR" }, { status: 500 });
    }
}
