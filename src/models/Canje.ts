import mongoose, { Schema, models } from "mongoose";

const CanjeSchema = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rewardId: { type: mongoose.Schema.Types.ObjectId, ref: "Reward", required: true },
    titulo: { type: String, required: true },
    puntosGastados: { type: Number, required: true },
    estado: { type: String, enum: ["pendiente", "aprobado", "entregado"], default: "pendiente" },
    fecha: { type: Date, default: Date.now },
});

export const Canje = models.Canje || mongoose.model("Canje", CanjeSchema);
