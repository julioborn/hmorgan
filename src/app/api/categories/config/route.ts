import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CategoryConfig } from "@/models/CategoryConfig";

export async function GET() {
    await connectMongoDB();
    const configs = await CategoryConfig.find({});
    return NextResponse.json(configs);
}

export async function PUT(req: NextRequest) {
    await connectMongoDB();
    const { categoria, imageUrl, imagePosition } = await req.json();
    const config = await CategoryConfig.findOneAndUpdate(
        { categoria },
        { categoria, imageUrl: imageUrl ?? "", imagePosition: imagePosition ?? "50% 50%" },
        { upsert: true, new: true }
    );
    return NextResponse.json(config);
}
