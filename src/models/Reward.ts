import mongoose, { Schema, models } from "mongoose";

const RewardSchema = new Schema({
    titulo: { type: String, required: true },
    descripcion: { type: String },
    puntosRequeridos: { type: Number, required: true },
    activo: { type: Boolean, default: true },
});

export const Reward = models.Reward || mongoose.model("Reward", RewardSchema);
