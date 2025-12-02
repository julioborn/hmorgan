import mongoose, { Schema, model, Types } from "mongoose";

export interface IReview {
    _id: string;
    userId: Types.ObjectId;
    rating: number;
    comment?: string;
    createdAt: Date;
}

const reviewSchema = new Schema<IReview>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// 🧨 Forzar recarga del modelo
delete mongoose.models.Review;

export const Review = model<IReview>("Review", reviewSchema);
