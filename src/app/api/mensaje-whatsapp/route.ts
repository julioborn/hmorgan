import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { MensajeWhatsApp } from "@/models/MensajeWhatsApp";

const DEFAULT = "Hola {nombre}, tu pedido en H. Morgan esta confirmado y en preparacion. Nos vemos pronto!";

export async function GET() {
    await connectMongoDB();
    const doc = await MensajeWhatsApp.findOne().lean() as any;
    return NextResponse.json({ mensaje: doc?.mensaje ?? DEFAULT });
}

export async function PUT(req: NextRequest) {
    try {
        await connectMongoDB();
        const { mensaje } = await req.json();
        if (!mensaje?.trim()) {
            return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 });
        }
        const doc = await MensajeWhatsApp.findOneAndUpdate(
            {},
            { $set: { mensaje: mensaje.trim() } },
            { upsert: true, new: true }
        );
        return NextResponse.json(doc);
    } catch (err: any) {
        console.error("Error guardando mensaje WhatsApp:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
