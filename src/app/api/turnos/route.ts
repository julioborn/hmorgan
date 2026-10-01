import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import TurnoEmpleado from "@/models/TurnoEmpleado";
import jwt from "jsonwebtoken";
export const dynamic = "force-dynamic";

const SECRET = process.env.NEXTAUTH_SECRET!;

function getPayload(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try { return jwt.verify(token, SECRET) as any; } catch { return null; }
}

function isStaff(role: string) {
    return ["admin", "superadmin", "cajero"].includes(role);
}

// GET — staff: todos; empleado: solo los suyos
export async function GET(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    await connectMongoDB();
    const { searchParams } = new URL(req.url);
    const desde = searchParams.get("desde");

    const query: Record<string, unknown> = {};

    if (!isStaff(payload.role)) {
        query.userId = payload.sub;
    }

    if (desde) {
        query.ingreso = { $gte: new Date(desde) };
    }

    const turnos = await TurnoEmpleado.find(query)
        .populate("userId", "nombre apellido")
        .sort({ ingreso: -1 })
        .lean();

    return NextResponse.json(turnos);
}

// POST — empleado marca ingreso o salida
export async function POST(req: NextRequest) {
    const payload = getPayload(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!["empleado", "admin", "superadmin"].includes(payload.role)) {
        return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    await connectMongoDB();
    const { accion } = await req.json(); // "ingreso" | "salida"
    const ahora = new Date();

    if (accion === "ingreso") {
        const turnoAbierto = await TurnoEmpleado.findOne({ userId: payload.sub, salida: null });
        if (turnoAbierto) {
            return NextResponse.json({ error: "Ya tenés un turno abierto" }, { status: 400 });
        }
        const turno = await TurnoEmpleado.create({ userId: payload.sub, ingreso: ahora });
        return NextResponse.json(turno, { status: 201 });
    }

    if (accion === "salida") {
        const turnoAbierto = await TurnoEmpleado.findOne({ userId: payload.sub, salida: null });
        if (!turnoAbierto) {
            return NextResponse.json({ error: "No tenés un turno abierto" }, { status: 400 });
        }
        turnoAbierto.salida = ahora;
        await turnoAbierto.save();
        return NextResponse.json(turnoAbierto);
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
