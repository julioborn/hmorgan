import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { TareaEmpleado } from "@/models/TareaEmpleado";
import jwt from "jsonwebtoken";
export const dynamic = "force-dynamic";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function POST(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    let user: any;
    try { user = jwt.verify(token, SECRET); } catch { return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }
    if (!["admin", "superadmin"].includes(user.role)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await connectMongoDB();
    await TareaEmpleado.updateMany({}, { $set: { completada: false, completadaPor: null, completadaAt: null } });
    return NextResponse.json({ ok: true });
}
