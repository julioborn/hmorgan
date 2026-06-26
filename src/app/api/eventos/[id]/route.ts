import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Evento } from "@/models/Evento";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    try { jwt.verify(token, SECRET); } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await connectMongoDB();
    const evento = await Evento.findById(params.id).lean();
    if (!evento) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(evento);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    let payload: any;
    try { payload = jwt.verify(token, SECRET) as any; } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!["cajero", "admin", "superadmin", "empleado"].includes(payload.role)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await connectMongoDB();
    const evento = await Evento.findById(params.id);
    if (!evento) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const body = await req.json();

    if (body.accion === "cerrar") {
        if (evento.estado === "cerrado") {
            return NextResponse.json({ error: "El evento ya está cerrado" }, { status: 400 });
        }
        evento.estado = "cerrado";
        await evento.save();
        return NextResponse.json({ ok: true, evento });
    }

    if (body.accion === "agregarVenta") {
        const { items, metodoPago, nota } = body;
        if (!items?.length || !metodoPago) {
            return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
        }
        if (evento.estado === "cerrado") {
            return NextResponse.json({ error: "El evento está cerrado" }, { status: 400 });
        }
        const total = items.reduce((acc: number, i: any) => acc + i.precio * i.cantidad, 0);
        evento.ventas.push({ items, total, metodoPago, nota: nota || undefined });
        await evento.save();
        return NextResponse.json({ ok: true, evento });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
