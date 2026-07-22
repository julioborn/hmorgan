import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectMongoDB } from "@/lib/mongodb";
import Cuota from "@/models/Cuota";

const SECRET = process.env.NEXTAUTH_SECRET!;

function getPayload(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try { return jwt.verify(token, SECRET) as any; } catch { return null; }
}

// GET – lista todas las cuotas registradas
export async function GET(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload || !["admin", "superadmin"].includes(payload.role)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await connectMongoDB();
    const cuotas = await Cuota.find().sort({ año: -1, mes: -1 }).lean();
    return NextResponse.json(cuotas);
}

// POST – registrar pago de una cuota (solo superadmin)
export async function POST(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload || payload.role !== "superadmin") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await connectMongoDB();
    const { mes, año, monto, fechaPago, notas } = await req.json();
    if (!mes || !año || !monto) {
        return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }
    const cuota = await Cuota.findOneAndUpdate(
        { mes, año },
        { monto, fechaPago: fechaPago ? new Date(fechaPago) : new Date(), notas: notas || "" },
        { upsert: true, new: true }
    );
    return NextResponse.json(cuota);
}

// DELETE – borrar un pago registrado (solo superadmin)
export async function DELETE(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload || payload.role !== "superadmin") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    await connectMongoDB();
    const { mes, año } = await req.json();
    await Cuota.deleteOne({ mes, año });
    return NextResponse.json({ ok: true });
}
