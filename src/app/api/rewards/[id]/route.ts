import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Reward } from "@/models/Reward";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    await connectMongoDB();
    const body = await req.json();
    const reward = await Reward.findByIdAndUpdate(params.id, body, { new: true });
    return NextResponse.json(reward);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    await connectMongoDB();
    await Reward.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
}
