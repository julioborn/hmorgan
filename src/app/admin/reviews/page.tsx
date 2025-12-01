"use client";

import Loader from "@/components/Loader";
import ReviewCard from "@/components/ReviewCard";
import { useEffect, useState } from "react";

interface Review {
    _id: string;
    stars: number;
    comment?: string;
    createdAt: string;
    userId: {
        nombre: string;
        apellido: string;
        telefono?: string;
    };
}

export default function ReviewsAdminPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch("/api/reviews/admin", {
                    cache: "no-store",
                });
                const data = await res.json();
                setReviews(data.reviews || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <Loader />;

    return (
        <div className="pb-10">
            <h1 className="text-2xl font-bold mb-6">Reseñas de Clientes</h1>

            {reviews.length === 0 && (
                <p className="text-gray-500 text-center mt-10">
                    No hay reseñas aún.
                </p>
            )}

            <div className="flex flex-col gap-4">
                {reviews.map((rev) => (
                    <ReviewCard key={rev._id} review={rev} />
                ))}
            </div>
        </div>
    );
}
