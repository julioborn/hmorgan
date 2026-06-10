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

    const existing = await User.findOne({ username: "delivery" });
    if (existing) {
        console.log("⚠️  El usuario delivery ya existe. Actualizando contraseña y rol...");
        existing.passwordHash = await bcrypt.hash("delivery123morgan", 10);
        existing.role = "delivery";
        await existing.save();
        console.log("✅ Usuario delivery actualizado");
    } else {
        await User.create({
            username: "delivery",
            nombre: "Delivery",
            apellido: "Morgan",
            passwordHash: await bcrypt.hash("delivery123morgan", 10),
            role: "delivery",
            qrToken: randomBytes(16).toString("hex"),
            puntos: 0,
        });
        console.log("✅ Usuario delivery creado");
    }

    console.log("\n  Usuario:    delivery");
    console.log("  Contraseña: delivery123morgan\n");

    await mongoose.disconnect();
}

main().catch(console.error);
