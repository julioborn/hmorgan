import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { TareaEmpleado } from "@/models/TareaEmpleado";
import jwt from "jsonwebtoken";
export const dynamic = "force-dynamic";

const SECRET = process.env.NEXTAUTH_SECRET!;

function getUser(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return null;
    try { return jwt.verify(token, SECRET) as any; } catch { return null; }
}

export async function GET(req: NextRequest) {
    const user = getUser(req);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    await connectMongoDB();
    const tareas = await TareaEmpleado.find()
        .sort({ orden: 1, createdAt: 1 })
        .populate("completadaPor", "nombre apellido")
        .lean();

    return NextResponse.json(tareas);
}

export async function POST(req: NextRequest) {
    const user = getUser(req);
    if (!user || !["admin", "superadmin"].includes(user.role)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { texto } = await req.json();
    if (!texto?.trim()) return NextResponse.json({ error: "Texto requerido" }, { status: 400 });

    await connectMongoDB();
    const count = await TareaEmpleado.countDocuments();
    const tarea = await TareaEmpleado.create({ texto: texto.trim(), orden: count });

    return NextResponse.json(tarea, { status: 201 });
}
