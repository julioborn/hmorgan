// models/Canje.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ICanje extends Document {
    rewardId: mongoose.Types.ObjectId;
    titulo: string;
    puntosGastados: number;
    userId: mongoose.Types.ObjectId;
    fecha: Date;
}

const CanjeSchema = new Schema<ICanje>({
    rewardId: { type: Schema.Types.ObjectId, ref: "Reward", required: true },
    titulo: { type: String, required: true },
    puntosGastados: { type: Number, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fecha: { type: Date, default: Date.now },
});

export const Canje =
    mongoose.models.Canje || mongoose.model<ICanje>("Canje", CanjeSchema);
