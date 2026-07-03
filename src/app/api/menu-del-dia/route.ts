import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { MenuDelDia } from "@/models/MenuDelDia";

export async function GET() {
    await connectMongoDB();
    const doc = await MenuDelDia.findOne().lean();
    return NextResponse.json(doc ?? null);
}
