import { NextRequest, NextResponse } from "next/server";
import Mensaje from "@/models/Mensaje";
import { connectMongoDB } from "@/lib/mongodb";
import { pusherServer } from "@/lib/pusherServer";

interface Params {
    pedidoId: string;
}

export async function GET(req: NextRequest, { params }: { params: Params }) {
    await connectMongoDB();
    const mensajes = await Mensaje.find({ pedidoId: params.pedidoId }).sort({ createdAt: 1 });
    return NextResponse.json(mensajes);
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
    await connectMongoDB();
    const { remitente, texto } = await req.json();

    if (!texto)
        return NextResponse.json({ message: "Mensaje vacío" }, { status: 400 });

    const nuevo = await Mensaje.create({
        pedidoId: params.pedidoId,
        remitente,
        texto,
    });

    await pusherServer.trigger(
        `notificaciones-${remitente === "admin" ? "cliente" : "admin"}`,
        "nuevo-mensaje",
        {
            remitente,
            pedidoId: params.pedidoId, // ✅ usamos el ID correcto
            texto,
        }
    );

    return NextResponse.json(nuevo);
}
