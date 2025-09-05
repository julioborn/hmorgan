import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Reward } from "@/models/Reward";

export async function GET() {
    await connectMongoDB();
    const rewards = await Reward.find({ activo: true }).lean();
    return NextResponse.json(rewards);
}

export async function POST(req: Request) {
    await connectMongoDB();
    const body = await req.json();
    const reward = await Reward.create(body);
    return NextResponse.json(reward, { status: 201 });
}
