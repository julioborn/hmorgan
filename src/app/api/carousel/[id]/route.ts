import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CarouselImage } from "@/models/CarouselImage";
import { del } from "@vercel/blob";

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
        if (image.url?.startsWith("https://")) {
            await del(image.url);
        }
    } catch {
        // Ignorar errores al borrar — el archivo puede no existir
    }

    await CarouselImage.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
}
