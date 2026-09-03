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

// GET — pases pendientes, ordenados del más viejo al más nuevo (FIFO)
export async function GET(req: NextRequest) {
    const payload = authCocina(req);
    if (!payload) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    await connectMongoDB();
    const pases = await PaseCocina.find({ estado: "pendiente" })
        .sort({ createdAt: 1 })
        .lean();
    return NextResponse.json(pases);
}
