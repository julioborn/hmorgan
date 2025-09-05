import mongoose, { Schema, model } from "mongoose";

export interface IReward {
    _id: string;
    titulo: string;
    descripcion?: string;
    puntos: number;
    activo: boolean;
}

const rewardSchema = new Schema<IReward>(
    {
        titulo: { type: String, required: true, trim: true },
        descripcion: { type: String, trim: true },
        puntos: { type: Number, required: true, min: 0 },
        activo: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const Reward = mongoose.models.Reward || model<IReward>("Reward", rewardSchema);
