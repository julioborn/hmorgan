"use client";
import { useState } from "react";

interface MenuImgProps {
    src: string;
    alt: string;
    className?: string;
    style?: React.CSSProperties;
}

export default function MenuImg({ src, alt, className = "", style }: MenuImgProps) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    if (error) return <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-600" />;

    return (
        <>
            {!loaded && (
                <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                    <span className="w-7 h-7 border-[3px] border-red-600 border-t-transparent rounded-full animate-spin" />
                </div>
            )}
            <img
                src={src}
                alt={alt}
                className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
                style={style}
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
            />
        </>
    );
}
