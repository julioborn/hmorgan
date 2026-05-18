import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Mesa } from "@/models/Mesa";
import jwt from "jsonwebtoken";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

function getPayload(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        return jwt.verify(token, NEXTAUTH_SECRET) as any;
    } catch {
        return null;
    }
}

// GET — autenticado puede listar mesas; admin puede ver todas con ?all=true
export async function GET(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload) return NextResponse.json({ message: "No autorizado" }, { status: 401 });

    await connectMongoDB();
    const showAll = payload.role === "admin" && req.nextUrl.searchParams.get("all") === "true";
    const mesas = await Mesa.find(showAll ? {} : { activa: true }).sort({ nombre: 1 }).lean();
    return NextResponse.json(mesas);
}

// POST — crear mesa (solo admin)
export async function POST(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload || payload.role !== "admin")
        return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });

    await connectMongoDB();
    const { nombre } = await req.json();
    if (!nombre?.trim())
        return NextResponse.json({ message: "Nombre requerido" }, { status: 400 });

    const trimmed = nombre.trim();
    const exists = await Mesa.findOne({ nombre: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
    if (exists) return NextResponse.json({ message: `Ya existe una mesa con el nombre "${trimmed}"` }, { status: 409 });

    const mesa = await Mesa.create({ nombre: trimmed });
    return NextResponse.json(mesa, { status: 201 });
}

// DELETE — eliminar mesa (solo admin)
export async function DELETE(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload || payload.role !== "admin")
        return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });

    await connectMongoDB();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ message: "Falta el ID" }, { status: 400 });

    await Mesa.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
}

// PATCH — togglear activa (solo admin)
export async function PATCH(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload || payload.role !== "admin")
        return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });

    await connectMongoDB();
    const { id } = await req.json();
    const mesa = await Mesa.findById(id);
    if (!mesa) return NextResponse.json({ message: "Mesa no encontrada" }, { status: 404 });

    mesa.activa = !mesa.activa;
    await mesa.save();
    return NextResponse.json(mesa);
}
