import { Schema, model, models } from "mongoose";

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
        direccion: { type: String },
        total: { type: Number },
        estado: {
            type: String,
            enum: ["pendiente", "preparando", "listo", "entregado", "cancelado"], // 👈 nuevo estado
            default: "pendiente",
        },
        cancelableUntil: { type: Date }, // 👈 nuevo campo
    },
    { timestamps: true }
);

export const Pedido = models.Pedido || model("Pedido", PedidoSchema);
