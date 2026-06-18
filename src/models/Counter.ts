import { Schema, model, models } from "mongoose";

// _id con formato "pedidos-YYYY-MM-DD" (hora Argentina) para numerar pedidos del día
const CounterSchema = new Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});

export const Counter = models.Counter || model("Counter", CounterSchema, "counters");
