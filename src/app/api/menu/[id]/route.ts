// src/app/api/menu/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { MenuItem } from "@/models/MenuItem";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    await connectMongoDB();
    const data = await req.json();
    const updated = await MenuItem.findByIdAndUpdate(params.id, data, { new: true });
    return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    await connectMongoDB();
    await MenuItem.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
}
