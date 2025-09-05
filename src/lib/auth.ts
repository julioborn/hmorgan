import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectMongoDB } from "./mongodb";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                dni: { label: "DNI", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                await connectMongoDB();

                // 🔹 buscamos sin .lean() para tener un documento Mongoose
                const user = await User.findOne({ dni: credentials!.dni });
                if (!user) return null;

                // 🔹 validamos contraseña
                const isValid = await bcrypt.compare(credentials!.password, user.passwordHash);
                if (!isValid) return null;

                // 🔹 devolvemos datos seguros para la sesión
                return {
                    id: user._id.toString(),
                    name: user.nombre,
                    email: user.telefono, // ⚡ usamos teléfono como "email"
                    role: user.role,
                };
            },
        }),
    ],

    session: { strategy: "jwt" },

    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = (user as any).id;
                token.role = (user as any).role;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
            }
            return session;
        },
    },
};
