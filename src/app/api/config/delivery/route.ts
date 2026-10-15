import { connectMongoDB } from "@/lib/mongodb";
import Config from "@/models/Config";
import { CajaSession } from "@/models/CajaSession";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
    await connectMongoDB();
    const [config, sesion] = await Promise.all([
        Config.findOne({ _id: "global" }),
        CajaSession.findOne({ estado: "abierta" }),
    ]);
    const cajaAbierta = !!sesion;
    const pedidosActivos = config?.pedidosActivos ?? true;
    const deliveryActivo = config?.deliveryActivo ?? true;
    return NextResponse.json({
        activo: deliveryActivo && cajaAbierta && pedidosActivos,
        cajaAbierta,
        pedidosActivos,
        deliveryActivo,
    });
}

export async function PUT(req: Request) {
    const { activo } = await req.json();
    await connectMongoDB();
    await Config.findOneAndUpdate(
        { _id: "global" },
        { deliveryActivo: activo },
        { upsert: true }
    );
    return NextResponse.json({ ok: true });
}
