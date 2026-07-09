import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { CarouselImage } from "@/models/CarouselImage";
import { admin } from "@/lib/firebase-admin";

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
        const bucket = admin.storage().bucket();
        const bucketPrefix = `https://storage.googleapis.com/${bucket.name}/`;
        if (image.url?.startsWith(bucketPrefix)) {
            const filePath = image.url.slice(bucketPrefix.length);
            await bucket.file(filePath).delete({ ignoreNotFound: true });
        }
    } catch {
        // Ignore errors — file may already be gone
    }

    await CarouselImage.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
}
