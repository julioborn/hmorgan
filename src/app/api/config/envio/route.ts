import { connectMongoDB } from "@/lib/mongodb";
import Config from "@/models/Config";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
    await connectMongoDB();
    const config = await Config.findOne({ _id: "global" });
    return NextResponse.json({ costoEnvio: config?.costoEnvio ?? 0 });
}

export async function PUT(req: Request) {
    const { costoEnvio } = await req.json();
    await connectMongoDB();

    if (typeof costoEnvio !== "number" || costoEnvio < 0) {
        return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
    }

    await Config.findOneAndUpdate(
        { _id: "global" },
        { costoEnvio },
        { upsert: true }
    );

    return NextResponse.json({ ok: true });
}
