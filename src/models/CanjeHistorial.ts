import { Schema, model, models, Types } from "mongoose";

const CanjeHistorialSchema = new Schema(
    {
        usuarioId: { type: Types.ObjectId, ref: "User", required: true },
        rewardId: { type: Types.ObjectId, ref: "Reward", required: true },
        estado: { type: String, enum: ["pendiente", "entregado"], default: "pendiente" },
    },
    { timestamps: true }
);

const CanjeHistorial =
    models.CanjeHistorial || model("CanjeHistorial", CanjeHistorialSchema);
export { CanjeHistorial };
