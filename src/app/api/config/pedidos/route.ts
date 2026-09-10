import { connectMongoDB } from "@/lib/mongodb";
import Config from "@/models/Config";
import { CajaSession } from "@/models/CajaSession";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
    await connectMongoDB();
    const [config, sesionAbierta] = await Promise.all([
        Config.findOne({ _id: "global" }),
        CajaSession.findOne({ estado: "abierta" }).select("_id").lean(),
    ]);

    // Pedidos activos solo si hay caja abierta Y el toggle manual está en true
    const activo = !!(sesionAbierta) && (config?.pedidosActivos ?? false);

    return NextResponse.json({ activo });
}

export async function PUT(req: Request) {
    const { activos } = await req.json();
    await connectMongoDB();

    await Config.findOneAndUpdate(
        { _id: "global" },
        { pedidosActivos: activos },
        { upsert: true }
    );

    return NextResponse.json({ ok: true });
}
