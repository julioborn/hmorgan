import { Schema, model, models } from "mongoose";

const PedidoSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        items: [
            {
                menuItemId: { type: Schema.Types.ObjectId, ref: "MenuItem", required: true },
                cantidad: { type: Number, required: true },
                nota: { type: String },
                // false = se agregó después de aceptada y todavía no se imprimió en BARRA/COCINA
                impreso: { type: Boolean, default: true },
                listo: { type: Boolean, default: false },
            },
        ],
        tipoEntrega: { type: String, enum: ["retira", "envio"], default: "retira" },
        direccion: { type: String },
        total: { type: Number },
        costoEnvio: { type: Number, default: 0 },
        estado: {
            type: String,
            enum: ["pendiente", "preparando", "listo", "entregado", "cancelado", "cerrado"],
            default: "pendiente",
        },
        cancelableUntil: { type: Date },
        repartidorAfuera: { type: Boolean, default: false },
        fuente: { type: String, enum: ["cliente", "empleado", "autoservicio"], default: "cliente" },
        numeroDia: { type: Number },
        mesa: { type: String },
        comensales: { type: Number, default: 0 },
        nombreComanda: { type: String },
        notaEmpleado: { type: String },
        notaCliente: { type: String },
        horarioPreferido: { type: String },
        lat: { type: Number },
        lng: { type: Number },
        puntosAcreditados: { type: Boolean, default: false },
        metodoPago: { type: String },
        montoPagado: { type: Number },
        mpPreferenceId: { type: String },
        mpPaymentId: { type: String },
        mpEstadoPago: { type: String, enum: ["pendiente", "aprobado", "rechazado", "en_proceso"] },
        deliveryNumero: { type: Number },
        telefonoContacto: { type: String },
        clienteId:      { type: Schema.Types.ObjectId, ref: "User" },
        eventoId:       { type: Schema.Types.ObjectId, ref: "Evento" },
        comensalesIds:  [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
    { timestamps: true }
);

export const Pedido = models.Pedido || model("Pedido", PedidoSchema);
