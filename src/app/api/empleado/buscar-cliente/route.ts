import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;

export async function GET(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json([], { status: 401 });
    try { jwt.verify(token, SECRET); } catch { return NextResponse.json([], { status: 401 }); }

    const q = req.nextUrl.searchParams.get("q")?.trim() || "";
    if (q.length < 2) return NextResponse.json([]);

    await connectMongoDB();
    const users = await User.find({
        role: "cliente",
        $or: [
            { nombre: { $regex: q, $options: "i" } },
            { apellido: { $regex: q, $options: "i" } },
            { username: { $regex: q, $options: "i" } },
        ],
    }).select("_id nombre apellido username").limit(6).lean();

    return NextResponse.json(users);
}
