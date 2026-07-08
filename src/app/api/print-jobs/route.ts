import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { PrintJob } from "@/models/PrintJob";
import jwt from "jsonwebtoken";

const SECRET = process.env.NEXTAUTH_SECRET!;
const PRINT_KEY = "hmorganprint2024";

export async function GET(req: NextRequest) {
    if (req.headers.get("x-print-key") !== PRINT_KEY)
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    await connectMongoDB();
    const jobs = await PrintJob.find({ estado: "pendiente" }).sort({ createdAt: 1 });
    return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
    const token = req.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    try { jwt.verify(token, SECRET); } catch {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await connectMongoDB();
    const body = await req.json();
    const job = await PrintJob.create(body);
    return NextResponse.json(job);
}
