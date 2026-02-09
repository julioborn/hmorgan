import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import crypto from "crypto";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
    await connectMongoDB();

    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email requerido" }, { status: 400 });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return NextResponse.json({ ok: true }); // 👈 no decimos "no existe", para seguridad
        }

        // generar token único
        const token = crypto.randomBytes(32).toString("hex");
        user.resetToken = token;
        user.resetTokenExp = new Date(Date.now() + 1000 * 60 * 15); // 15 min
        await user.save();

        // ✅ DEBUG (temporal): confirma que llegan env vars sin mostrar la pass
        console.log("SMTP_USER:", process.env.SMTP_USER);
        console.log("SMTP_PASS len:", (process.env.SMTP_PASS || "").length);

        // enviar mail
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: (process.env.SMTP_PASS || "").replace(/\s/g, ""),
            },
        });

        // ✅ fuerza autenticación y te da error claro si falla
        await transporter.verify();

        const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

        await transporter.sendMail({
            from: `"H Morgan Bar" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: "Recuperar contraseña",
            html: `
        <p>Hola ${user.nombre},</p>
        <p>Has solicitado cambiar tu contraseña. Haz clic en el siguiente enlace:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Este enlace caduca en 15 minutos.</p>
      `,
        });

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        // ✅ log detallado para vos
        console.error("POST /api/auth/request-reset error:", err?.response || err);

        // ✅ respuesta clara para el front
        return NextResponse.json(
            {
                error:
                    "No se pudo enviar el email (SMTP). Revisá SMTP_USER/SMTP_PASS en el entorno actual (App Password + 2FA) y reiniciá/redeploy.",
            },
            { status: 500 }
        );
    }
}