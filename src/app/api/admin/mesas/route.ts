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
    const isStaff = payload.role === "admin" || payload.role === "superadmin";
    const showAll = isStaff && req.nextUrl.searchParams.get("all") === "true";
    const mesas = await Mesa.find(showAll ? {} : { activa: true }).sort({ nombre: 1 }).lean();
    return NextResponse.json(mesas);
}

// POST — crear mesa (admin o superadmin)
export async function POST(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload || (payload.role !== "admin" && payload.role !== "superadmin"))
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

// DELETE — eliminar mesa (admin o superadmin)
export async function DELETE(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload || (payload.role !== "admin" && payload.role !== "superadmin"))
        return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });

    await connectMongoDB();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ message: "Falta el ID" }, { status: 400 });

    await Mesa.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
}

// PATCH — actualizar mesa (posición, forma, capacidad, activa)
export async function PATCH(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload || (payload.role !== "admin" && payload.role !== "superadmin"))
        return NextResponse.json({ message: "Acceso denegado" }, { status: 403 });

    await connectMongoDB();
    const { id, ...updates } = await req.json();
    const mesa = await Mesa.findById(id);
    if (!mesa) return NextResponse.json({ message: "Mesa no encontrada" }, { status: 404 });

    if (Object.keys(updates).length === 0) {
        mesa.activa = !mesa.activa;
    } else {
        const allowed = ["activa", "x", "y", "forma", "capacidad", "nombre", "rotacion", "tipo", "ancho", "alto"];
        for (const key of allowed) {
            if (key in updates) (mesa as any)[key] = updates[key];
        }
    }

    await mesa.save();
    return NextResponse.json(mesa);
}
