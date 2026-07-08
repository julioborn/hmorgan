import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { AutoservicioSesion } from "@/models/AutoservicioSesion";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;
const STAFF = ["cajero", "empleado", "admin", "superadmin"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const token = req.cookies.get("session")?.value;
        if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        const p = jwt.verify(token, SECRET) as any;
        if (!STAFF.includes(p.role)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }

    await connectMongoDB();
    await AutoservicioSesion.findByIdAndUpdate(params.id, { estado: "cerrada" });
    return NextResponse.json({ ok: true });
}
