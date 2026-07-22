import { Schema, model, models } from "mongoose";

const CuotaSchema = new Schema(
    {
        mes: { type: Number, required: true },   // 1-12
        año: { type: Number, required: true },
        monto: { type: Number, default: null },
        fechaPago: { type: Date, default: null },
        notas: { type: String, default: "" },
    },
    { timestamps: true }
);

CuotaSchema.index({ mes: 1, año: 1 }, { unique: true });

export default models.Cuota || model("Cuota", CuotaSchema);
