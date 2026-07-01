import mongoose, { Schema, model, Types } from "mongoose";

export interface IReview {
    _id: string;
    userId: Types.ObjectId;
    rating: number;
    comment?: string;
    ratingMozo?: number;
    mozoId?: Types.ObjectId;
    createdAt: Date;
}

const reviewSchema = new Schema<IReview>(
    {
        userId:     { type: Schema.Types.ObjectId, ref: "User", required: true },
        rating:     { type: Number, required: true, min: 1, max: 5 },
        comment:    { type: String },
        ratingMozo: { type: Number, min: 1, max: 5 },
        mozoId:     { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// 🧨 Forzar recarga del modelo
delete mongoose.models.Review;

export const Review = model<IReview>("Review", reviewSchema);
