import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { StockSubcategoria } from "@/models/StockSubcategoria";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

function authAdmin(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        const p = jwt.verify(token, SECRET) as any;
        if (!["admin", "superadmin"].includes(p.role)) return null;
        return p;
    } catch { return null; }
}

export async function GET(req: NextRequest) {
    if (!authAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const subcats = await StockSubcategoria.find().sort({ tipo: 1, nombre: 1 }).lean();
    return NextResponse.json(subcats);
}

export async function POST(req: NextRequest) {
    if (!authAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const { tipo, nombre } = await req.json();
    if (!tipo || !nombre?.trim()) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    const existe = await StockSubcategoria.findOne({ tipo, nombre: nombre.trim() });
    if (existe) return NextResponse.json({ error: "Ya existe esa subcategoría" }, { status: 409 });
    const nueva = await StockSubcategoria.create({ tipo, nombre: nombre.trim() });
    return NextResponse.json(nueva, { status: 201 });
}

export async function DELETE(req: NextRequest) {
    if (!authAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    await StockSubcategoria.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
}
