import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CajaSession } from "@/models/CajaSession";
import { CajaMovement } from "@/models/CajaMovement";
import jwt from "jsonwebtoken";
import { OWNER_USER_ID } from "@/lib/owner";

const SECRET = process.env.NEXTAUTH_SECRET!;

function authSuper(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        const p = jwt.verify(token, SECRET) as any;
        if (!["superadmin", "admin", "cajero"].includes(p.role) && p.sub !== OWNER_USER_ID) return null;
        return p;
    } catch { return null; }
}

// GET — sesión abierta + movimientos del día
export async function GET(req: NextRequest) {
    const payload = authSuper(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    try {
        await connectMongoDB();

        const sesionAbierta = await CajaSession.findOne({ estado: "abierta" })
            .populate("abiertaPor", "nombre apellido")
            .lean<{ _id: any; [key: string]: any }>();

        if (!sesionAbierta) return NextResponse.json({ sesion: null, movimientos: [] });

        const movimientos = await CajaMovement.find({ sesionId: sesionAbierta._id })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ sesion: sesionAbierta, movimientos });
    } catch (e) {
        console.error("[GET /api/superadmin/caja]", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

// POST — abrir nueva sesión (superadmin o cajero)
export async function POST(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }
    if (!["superadmin", "admin", "cajero"].includes(payload.role) && payload.sub !== OWNER_USER_ID) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    try {
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
    } catch (e) {
        console.error("[POST /api/superadmin/caja]", e);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
