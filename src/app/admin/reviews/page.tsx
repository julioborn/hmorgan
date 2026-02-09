"use client";

import Loader from "@/components/Loader";
import ReviewCard from "@/components/ReviewCard";
import { useEffect, useState } from "react";

interface Review {
    _id: string;
    rating: number;
    comment?: string;
    createdAt: string;
    userId: {
        nombre: string;
        apellido: string;
    };
}

export default function ReviewsAdminPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [rating, setRating] = useState("");
    const [pages, setPages] = useState(1);
    const [avg, setAvg] = useState(0);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                params.set("page", String(page));
                if (rating) params.set("rating", rating);

                const res = await fetch(`/api/reviews/admin?${params.toString()}`, {
                    cache: "no-store",
                });
                const data = await res.json();

                setReviews(data.reviews || []);
                setPages(data.pages || 1);
                setAvg(data.avgRating || 0);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [page, rating]);

    if (loading) return <Loader />;

    return (
        <div className="pb-10 space-y-6">
            <h1 className="text-4xl font-extrabold mb-6 text-center text-black">
                Reseñas</h1>

            {/* Resumen */}
            <div className="flex items-center justify-between bg-gray-50 border rounded-xl p-4">
                <div className="font-semibold">
                    ⭐ Promedio: {avg.toFixed(1)} / 5
                </div>

                <select
                    value={rating}
                    onChange={(e) => {
                        setPage(1);
                        setRating(e.target.value);
                    }}
                    className="border rounded-lg px-3 py-2"
                >
                    <option value="">Todas</option>
                    {[5, 4, 3, 2, 1].map((r) => (
                        <option key={r} value={r}>
                            {r} estrellas
                        </option>
                    ))}
                </select>
            </div>

            {reviews.length === 0 && (
                <p className="text-gray-500 text-center mt-10">
                    No hay reseñas.
                </p>
            )}

            <div className="flex flex-col gap-4">
                {reviews.map((rev) => (
                    <ReviewCard key={rev._id} review={rev} />
                ))}
            </div>

            {/* Paginación */}
            <div className="flex justify-center gap-3 mt-6">
                <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-4 py-2 border rounded-lg disabled:opacity-40"
                >
                    Anterior
                </button>
                <span className="px-2 py-2">
                    Página {page} de {pages}
                </span>
                <button
                    disabled={page >= pages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-4 py-2 border rounded-lg disabled:opacity-40"
                >
                    Siguiente
                </button>
            </div>
        </div>
    );
}
