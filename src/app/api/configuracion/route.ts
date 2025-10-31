import { NextResponse } from "next/server";
import Configuracion from "@/models/Configuracion";
import { connectMongoDB } from "@/lib/mongodb";

export async function GET() {
    await connectMongoDB();

    const config = await Configuracion.findOne({ clave: "pointsPerARS" });
    return NextResponse.json(config || { clave: "pointsPerARS", valor: 0.001 });
}

export async function PUT(req: Request) {
    await connectMongoDB();
    const { valor } = await req.json();

    if (typeof valor !== "number" || valor < 0) {
        return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
    }

    const config = await Configuracion.findOneAndUpdate(
        { clave: "pointsPerARS" },
        { valor },
        { upsert: true, new: true }
    );

    return NextResponse.json(config);
}
