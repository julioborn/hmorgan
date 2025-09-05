import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Canje } from "@/models/Canje";

export async function GET() {
    await connectMongoDB();
    const canjes = await Canje.find().populate("rewardId").sort({ fecha: -1 }).lean();
    return NextResponse.json(canjes);
}

export async function POST(req: Request) {
    await connectMongoDB();
    const body = await req.json();
    const canje = await Canje.create(body);
    return NextResponse.json(canje, { status: 201 });
}
