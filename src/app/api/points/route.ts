import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { PointTransaction } from "@/models/PointTransaction";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ items: [] });
    const payload = jwt.verify(token, JWT_SECRET) as any;

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
