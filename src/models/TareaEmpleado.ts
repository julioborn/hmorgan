import mongoose, { Schema, model, models, Model } from "mongoose";

const TareaEmpleadoSchema = new Schema(
    {
        texto: { type: String, required: true },
        tipo: { type: String, enum: ["apertura", "cierre"], default: "apertura" },
        completada: { type: Boolean, default: false },
        completadaPor: { type: Schema.Types.ObjectId, ref: "User", default: null },
        completadaAt: { type: Date, default: null },
        orden: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export const TareaEmpleado: Model<any> =
    models.TareaEmpleado || model("TareaEmpleado", TareaEmpleadoSchema, "tareasempleado");
