import { Schema, model, models } from "mongoose";

const MesaSchema = new Schema(
    {
        nombre: { type: String, required: true },
        activa: { type: Boolean, default: true },
        x: { type: Number, default: 10 },
        y: { type: Number, default: 10 },
        tipo: { type: String, enum: ["mesa", "banqueta"], default: "mesa" },
        forma: { type: String, enum: ["rect", "round", "oval"], default: "rect" },
        capacidad: { type: Number, default: 4 },
        rotacion: { type: Number, default: 0 },
        ancho: { type: Number, default: 0 },
        alto: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export const Mesa = models.Mesa || model("Mesa", MesaSchema);
