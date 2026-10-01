import mongoose, { Schema, models, model } from "mongoose";

const TurnoEmpleadoSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        ingreso: { type: Date, required: true },
        salida: { type: Date, default: null },
    },
    { timestamps: true }
);

const TurnoEmpleado = models.TurnoEmpleado || model("TurnoEmpleado", TurnoEmpleadoSchema, "turnosempleados");
export default TurnoEmpleado;
