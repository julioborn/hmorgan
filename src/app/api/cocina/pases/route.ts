import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { PaseCocina } from "@/models/PaseCocina";
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

// GET — pases pendientes (FIFO) o finalizados según ?estado=listo
export async function GET(req: NextRequest) {
    const payload = authCocina(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();

    const estadoParam = req.nextUrl.searchParams.get("estado");
    if (estadoParam === "listo") {
        // Últimos 50 finalizados, más reciente primero
        const pases = await PaseCocina.find({ estado: "listo" })
            .sort({ updatedAt: -1 })
            .limit(50)
            .lean();
        return NextResponse.json(pases);
    }

    // Pendientes, FIFO
    const pases = await PaseCocina.find({ estado: "pendiente" })
        .sort({ createdAt: 1 })
        .lean();
    return NextResponse.json(pases);
}
