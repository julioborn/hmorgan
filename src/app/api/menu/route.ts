// src/app/api/menu/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { MenuItem } from "@/models/MenuItem";

export async function GET() {
    await connectMongoDB();
    const items = await MenuItem.find();
    return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
    await connectMongoDB();
    const data = await req.json();
    const item = await MenuItem.create(data);
    return NextResponse.json(item);
}
