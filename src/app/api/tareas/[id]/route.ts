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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const user = getUser(req);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    await connectMongoDB();
    const tarea = await TareaEmpleado.findById(params.id);
    if (!tarea) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    tarea.completada = !tarea.completada;
    tarea.completadaPor = tarea.completada ? user.id : null;
    tarea.completadaAt = tarea.completada ? new Date() : null;
    await tarea.save();

    await tarea.populate("completadaPor", "nombre apellido");
    return NextResponse.json(tarea);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const user = getUser(req);
    if (!user || !["admin", "superadmin"].includes(user.role)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await connectMongoDB();
    await TareaEmpleado.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
}
