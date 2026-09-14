import { Schema, model, models } from "mongoose";

const ItemConteoSchema = new Schema({
    stockId:        { type: Schema.Types.ObjectId, ref: "Stock", required: true },
    nombre:         { type: String, required: true },
    tipo:           { type: String },
    categoria:      { type: String },
    unidad:         { type: String },
    cantidad:       { type: Number, required: true },
    precioUnitario: { type: Number },
}, { _id: false });

const StockConteoSchema = new Schema({
    items:             { type: [ItemConteoSchema], required: true },
    notas:             { type: String },
    userId:            { type: Schema.Types.ObjectId, ref: "User", required: true },
    totalValorizacion: { type: Number },
}, { timestamps: true });

export const StockConteo = models.StockConteo || model("StockConteo", StockConteoSchema);
