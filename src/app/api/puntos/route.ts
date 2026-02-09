export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { PointTransaction } from "@/models/PointTransaction";
import jwt from "jsonwebtoken";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ items: [], total: 0, page: 1, pageSize: 10 });

    const payload = jwt.verify(token, NEXTAUTH_SECRET) as any;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") || 10))); // cap 50

    await connectMongoDB();

    const filter = { userId: payload.sub };

    const [total, items] = await Promise.all([
      PointTransaction.countDocuments(filter),
      PointTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ]);

    return NextResponse.json({ items, total, page, pageSize });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ items: [], total: 0, page: 1, pageSize: 10 });
  }
}