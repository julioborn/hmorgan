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

export async function GET(req: NextRequest) {
    if (!auth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const invitaciones = await InvitacionEvento.find().sort({ fecha: 1 }).lean();
    return NextResponse.json(invitaciones);
}

export async function POST(req: NextRequest) {
    if (!auth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const body = await req.json();
    const { titulo, descripcion, fecha, hora, precio, imagenUrl, colorFondo, activo, destinatarios, usuariosIds } = body;
    if (!titulo || !fecha) return NextResponse.json({ error: "Título y fecha son requeridos" }, { status: 400 });
    const inv = await InvitacionEvento.create({
        titulo, descripcion, fecha, hora, precio: Number(precio) || 0,
        imagenUrl, colorFondo, activo: !!activo,
        destinatarios: destinatarios || "todos",
        usuariosIds: destinatarios === "seleccionados" ? (usuariosIds || []) : [],
    });
    return NextResponse.json(inv, { status: 201 });
}
