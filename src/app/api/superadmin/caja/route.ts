import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CajaSession } from "@/models/CajaSession";
import { CajaMovement } from "@/models/CajaMovement";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

function authSuper(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        const p = jwt.verify(token, SECRET) as any;
        if (p.role !== "superadmin") return null;
        return p;
    } catch { return null; }
}

// GET — sesión abierta + movimientos del día
export async function GET(req: NextRequest) {
    const payload = authSuper(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();

    const sesionAbierta = await CajaSession.findOne({ estado: "abierta" })
        .populate("abiertaPor", "nombre apellido")
        .lean<{ _id: any; [key: string]: any }>();

    if (!sesionAbierta) return NextResponse.json({ sesion: null, movimientos: [] });

    const movimientos = await CajaMovement.find({ sesionId: sesionAbierta._id })
        .sort({ createdAt: -1 })
        .lean();

    return NextResponse.json({ sesion: sesionAbierta, movimientos });
}

// POST — abrir nueva sesión
export async function POST(req: NextRequest) {
    const payload = authSuper(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();

    const abierta = await CajaSession.findOne({ estado: "abierta" });
    if (abierta) return NextResponse.json({ error: "Ya hay una sesión abierta" }, { status: 400 });

    const { montoInicial, notas } = await req.json();
    const sesion = await CajaSession.create({
        montoInicial: Number(montoInicial) || 0,
        abiertaPor: payload.sub,
        notas: notas || undefined,
    });

    return NextResponse.json(sesion, { status: 201 });
}
