import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CarouselImage } from "@/models/CarouselImage";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    await connectMongoDB();

    const image = await CarouselImage.findById(params.id).lean() as any;
    if (!image) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    try {
        const filePath = path.join(process.cwd(), "public", image.url);
        await unlink(filePath);
    } catch {
        // El archivo ya no existe, continuar igual
    }

    await CarouselImage.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
}
