import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { InvitacionEvento } from "@/models/InvitacionEvento";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

function auth(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        const p = jwt.verify(token, SECRET) as any;
        return ["admin", "superadmin"].includes(p.role) ? p : null;
    } catch { return null; }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    if (!auth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const body = await req.json();
    const { titulo, descripcion, fecha, hora, precio, imagenUrl, colorFondo, activo, tema, destinatarios, usuariosIds } = body;
    const update: any = {
        titulo, descripcion, fecha, hora,
        precio: Number(precio) || 0,
        imagenUrl, colorFondo,
        activo: !!activo,
        tema: tema || "default",
        destinatarios: destinatarios || "todos",
        usuariosIds: destinatarios === "seleccionados" ? (usuariosIds || []) : [],
    };
    const inv = await InvitacionEvento.findByIdAndUpdate(params.id, update, { new: true });
    if (!inv) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(inv);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    if (!auth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    await InvitacionEvento.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
}
