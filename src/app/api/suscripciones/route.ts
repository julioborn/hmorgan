import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Suscripcion } from "@/models/Suscripcion";

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();
        await connectMongoDB();

        if (!data?.endpoint) {
            return NextResponse.json({ message: "Suscripción inválida" }, { status: 400 });
        }

        await Suscripcion.updateOne({ endpoint: data.endpoint }, data, { upsert: true });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error al guardar suscripción:", error);
        return NextResponse.json({ message: "Error interno" }, { status: 500 });
    }
}
