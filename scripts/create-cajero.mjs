import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error("❌ MONGODB_URI no encontrada en .env"); process.exit(1); }

async function main() {
    const mongoose = (await import("mongoose")).default;
    const bcrypt   = (await import("bcryptjs")).default;

    const UserSchema = new mongoose.Schema({
        username: String, nombre: String, apellido: String,
        passwordHash: String, role: String, qrToken: String, puntos: { type: Number, default: 0 },
    }, { strict: false });

    await mongoose.connect(MONGO_URI);
    console.log("✅ Conectado a MongoDB\n");

    const User = mongoose.models.User || mongoose.model("User", UserSchema);

    const existing = await User.findOne({ username: "cajero" });
    if (existing) {
        console.log("⚠️  El usuario cajero ya existe. Actualizando contraseña...");
        existing.passwordHash = await bcrypt.hash("caja2025!", 10);
        await existing.save();
        console.log("✅ Contraseña actualizada");
    } else {
        await User.create({
            username: "cajero",
            nombre: "Cajero",
            apellido: "Bar",
            passwordHash: await bcrypt.hash("caja2025!", 10),
            role: "cajero",
            qrToken: randomBytes(16).toString("hex"),
            puntos: 0,
        });
        console.log("✅ Usuario cajero creado");
    }

    console.log("\n  Usuario:   cajero");
    console.log("  Contraseña: caja2025!\n");

    await mongoose.disconnect();
}

main().catch(console.error);
