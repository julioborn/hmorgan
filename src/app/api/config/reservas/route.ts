import { connectMongoDB } from "@/lib/mongodb";
import Config from "@/models/Config";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
    await connectMongoDB();
    const config = await Config.findOne({ _id: "global" });
    return NextResponse.json({
        activo: config?.reservasActivas ?? true,
        fechasBloqueadas: config?.reservasFechasBloqueadas ?? [],
    });
}

export async function PUT(req: Request) {
    const body = await req.json();
    await connectMongoDB();
    const update: Record<string, unknown> = {};
    if ("activo" in body) update.reservasActivas = body.activo;
    if ("fechasBloqueadas" in body) update.reservasFechasBloqueadas = body.fechasBloqueadas;
    await Config.findOneAndUpdate({ _id: "global" }, update, { upsert: true });
    return NextResponse.json({ ok: true });
}
