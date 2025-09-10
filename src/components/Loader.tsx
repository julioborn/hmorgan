// src/components/Loader.tsx
"use client";
import { Utensils } from "lucide-react";

export default function Loader({
    size = 40,
    className = "",
}: {
    size?: number;
    className?: string;
}) {
    return (
        <div className="flex items-center justify-center">
            <Utensils
                className={`animate-spin text-emerald-500 ${className}`}
                size={size}
                strokeWidth={2.5}
            />
        </div>
    );
}
