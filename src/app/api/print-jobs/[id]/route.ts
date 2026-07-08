import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { PrintJob } from "@/models/PrintJob";

const PRINT_KEY = "hmorganprint2024";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    if (req.headers.get("x-print-key") !== PRINT_KEY)
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    await connectMongoDB();
    const { estado } = await req.json();
    await PrintJob.findByIdAndUpdate(params.id, { estado });
    return NextResponse.json({ ok: true });
}
