import mongoose, { Schema, model, Types } from "mongoose";

export interface IPointTransaction {
  _id: string;
  userId: Types.ObjectId;
  source: "consumo" | "ajuste";
  amount: number;
  notes?: string;
  meta?: {
    consumoARS?: number;
    mozoId?: string;
    mesa?: string;
    share?: number;
  };
  pendingReview: boolean;
  createdAt: Date;
}

const txSchema = new Schema<IPointTransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: ["consumo", "ajuste"],
      required: true,
    },

    amount: { type: Number, required: true },
    notes: { type: String },
    meta: { type: Object },

    pendingReview: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// 🟢 INDICADO POR MONGOOSE (VERSIONES NUEVAS)
try {
  mongoose.deleteModel("PointTransaction");
} catch (err) {
  // ignore si no existe
}

export const PointTransaction =
  model<IPointTransaction>("PointTransaction", txSchema);
