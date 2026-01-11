import { connectMongoDB } from "@/lib/mongodb";
import Config from "@/models/Config";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
    await connectMongoDB();
    const config = await Config.findOne({ _id: "global" });

    return NextResponse.json({
        activo: config?.pedidosActivos ?? false,
    });
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
