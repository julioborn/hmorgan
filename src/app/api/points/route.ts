import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { PointTransaction } from "@/models/PointTransaction";
import jwt from "jsonwebtoken";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ items: [] });
    const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;

    await connectMongoDB();
    const items = await PointTransaction.find({ userId: payload.sub })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ items: [] });
  }
}
