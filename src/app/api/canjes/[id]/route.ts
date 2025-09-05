import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Canje } from "@/models/Canje";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    await connectMongoDB();
    const body = await req.json();
    const canje = await Canje.findByIdAndUpdate(params.id, body, { new: true });
    return NextResponse.json(canje);
}
