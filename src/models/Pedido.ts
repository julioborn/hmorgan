import mongoose, { Schema, model, models } from "mongoose";

const PedidoSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        items: [
            {
                menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
                cantidad: { type: Number, required: true },
            },
        ],
        tipoEntrega: { type: String, enum: ["retira", "envio"], default: "retira" },
        total: { type: Number },
        estado: {
            type: String,
            enum: ["pendiente", "preparando", "listo", "entregado"],
            default: "pendiente",
        },
    },
    { timestamps: true }
);

export const Pedido = models.Pedido || model("Pedido", PedidoSchema);
