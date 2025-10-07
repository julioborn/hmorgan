import mongoose, { Schema } from "mongoose";

const SuscripcionSchema = new Schema(
    {
        endpoint: { type: String, required: true, unique: true },
        keys: {
            p256dh: String,
            auth: String,
        },
    },
    { timestamps: true }
);

export const Suscripcion =
    mongoose.models.Suscripcion || mongoose.model("Suscripcion", SuscripcionSchema);
