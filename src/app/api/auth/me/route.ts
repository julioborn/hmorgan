import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ user: null });

    const payload = jwt.verify(token, JWT_SECRET) as any;
    await connectMongoDB();
    const user = await User.findById(payload.sub).select("_id nombre apellido dni telefono role qrToken points");
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
