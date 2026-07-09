import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { InvitacionEvento } from "@/models/InvitacionEvento";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json([], { status: 200 });
    let userId: string;
    try {
        const p = jwt.verify(token, SECRET) as any;
        userId = p.sub;
    } catch { return NextResponse.json([], { status: 200 }); }

    await connectMongoDB();

    // Invitaciones activas dirigidas a todos o al usuario específico
    const invitaciones = await InvitacionEvento.find({
        activo: true,
        $or: [
            { destinatarios: "todos" },
            { destinatarios: "seleccionados", usuariosIds: userId },
        ],
    }).sort({ fecha: 1 }).lean();

    return NextResponse.json(invitaciones);
}
