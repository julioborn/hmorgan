import mongoose, { Schema, model } from "mongoose";

export interface ICanje {
    _id: string;
    userId: mongoose.Types.ObjectId;
    rewardId: mongoose.Types.ObjectId;
    puntosGastados: number;
    fecha: Date;
    estado: "pendiente" | "completado" | "rechazado";
}

const canjeSchema = new Schema<ICanje>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        rewardId: { type: Schema.Types.ObjectId, ref: "Reward", required: true },
        puntosGastados: { type: Number, required: true },
        fecha: { type: Date, default: Date.now },
        estado: { type: String, enum: ["pendiente", "completado", "rechazado"], default: "pendiente" },
    },
    { timestamps: true }
);

export const Canje = mongoose.models.Canje || model<ICanje>("Canje", canjeSchema);
