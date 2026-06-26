import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Evento } from "@/models/Evento";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    try { jwt.verify(token, SECRET); } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await connectMongoDB();
    const soloActivo = req.nextUrl.searchParams.get("activo") === "true";
    const query = soloActivo ? { estado: "activo" } : {};
    const eventos = await Evento.find(query).sort({ createdAt: -1 }).limit(soloActivo ? 1 : 30).lean();
    return NextResponse.json(eventos);
}

export async function POST(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!["cajero", "admin", "superadmin"].includes(payload.role)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await connectMongoDB();
    const { nombre } = await req.json();
    if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

    const evento = await Evento.create({ nombre: nombre.trim(), creadoPor: payload.sub });
    return NextResponse.json(evento, { status: 201 });
}
