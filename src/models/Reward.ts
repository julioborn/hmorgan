// models/Reward.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IReward extends Document {
    titulo: string;
    descripcion?: string;
    puntos: number;
    activo?: boolean;
}

const RewardSchema = new Schema<IReward>({
    titulo: { type: String, required: true },
    descripcion: { type: String },
    puntos: { type: Number, required: true },
    activo: { type: Boolean, default: true },
});

export const Reward =
    mongoose.models.Reward || mongoose.model<IReward>("Reward", RewardSchema);
