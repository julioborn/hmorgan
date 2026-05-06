import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";

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

        console.log("DECODED:", decoded);

        await connectMongoDB();

        await User.deleteOne({ _id: decoded.sub });

        // 🔥 CREAR RESPONSE
        const response = NextResponse.json({
            message: "Cuenta eliminada correctamente",
        });
        

        // 🔥 BORRAR COOKIE (LOGOUT)
        response.cookies.set("session", "", {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            path: "/",
            expires: new Date(0), // 👈 clave
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