import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { PaseCocina } from "@/models/PaseCocina";
import { CajaSession } from "@/models/CajaSession";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

function authCocina(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try {
        const p = jwt.verify(token, SECRET) as any;
        if (!["cocina", "empleado", "admin", "superadmin"].includes(p.role)) return null;
        return p;
    } catch { return null; }
}

// GET — pases pendientes (FIFO) o finalizados de la caja activa
export async function GET(req: NextRequest) {
    const payload = authCocina(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();

    const estadoParam = req.nextUrl.searchParams.get("estado");
    if (estadoParam === "listo") {
        // Solo los finalizados desde que abrió la caja activa
        const sesion = await CajaSession.findOne({ estado: "abierta" }).lean<any>();
        const desde = sesion?.fechaApertura ?? new Date(0);
        const pases = await PaseCocina.find({ estado: "listo", updatedAt: { $gte: desde } })
            .sort({ updatedAt: -1 })
            .lean();
        return NextResponse.json(pases);
    }

    // Pendientes, FIFO
    const pases = await PaseCocina.find({ estado: "pendiente" })
        .sort({ createdAt: 1 })
        .lean();
    return NextResponse.json(pases);
}
