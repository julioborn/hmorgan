import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { ConfiguracionPedidos } from "@/models/ConfiguracionPedidos";

export async function GET() {
    await connectMongoDB();
    const config = await ConfiguracionPedidos.findOne();
    return NextResponse.json(config || { activo: false });
}

export async function PUT(req: NextRequest) {
    await connectMongoDB();
    const { activo } = await req.json();
    let config = await ConfiguracionPedidos.findOne();
    if (!config) config = await ConfiguracionPedidos.create({ activo });
    else config.activo = activo;
    await config.save();
    return NextResponse.json(config);
}
