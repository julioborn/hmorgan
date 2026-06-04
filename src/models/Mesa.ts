import { Schema, model, models } from "mongoose";

const MesaSchema = new Schema(
    {
        nombre: { type: String, required: true },
        activa: { type: Boolean, default: true },
        x: { type: Number, default: 10 },
        y: { type: Number, default: 10 },
        forma: { type: String, enum: ["rect", "round", "oval"], default: "rect" },
        capacidad: { type: Number, default: 4 },
        rotacion: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export const Mesa = models.Mesa || model("Mesa", MesaSchema);
