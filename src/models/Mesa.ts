import { Schema, model, models } from "mongoose";

const MesaSchema = new Schema(
    {
        nombre: { type: String, required: true },
        activa: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const Mesa = models.Mesa || model("Mesa", MesaSchema);
