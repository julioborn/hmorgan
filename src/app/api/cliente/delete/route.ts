import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Pedido } from "@/models/Pedido";

export async function DELETE(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get("session")?.value;

        if (!sessionCookie) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const decoded: any = jwt.verify(
            sessionCookie,
            process.env.NEXTAUTH_SECRET!
        );

        await connectMongoDB();

        await Pedido.deleteMany({ userId: decoded.sub });
        await User.deleteOne({ _id: decoded.sub });

        const response = NextResponse.json({
            message: "Cuenta eliminada correctamente",
        });

        response.cookies.set("session", "", {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            path: "/",
            expires: new Date(0),
        });

        return response;

    } catch (error) {
        console.error("Error eliminando usuario:", error);
        return new NextResponse(
            JSON.stringify({ error: "Error interno del servidor" }),
            { status: 500 }
        );
    }
}