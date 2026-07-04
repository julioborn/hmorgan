"use client";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Loader from "@/components/Loader";

export default function CajaLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user?.role !== "cajero" && user?.role !== "superadmin" && user?.role !== "admin") {
            router.replace("/");
        }
    }, [user, loading, router]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader size={48} />
        </div>
    );

    if (user?.role !== "cajero" && user?.role !== "superadmin" && user?.role !== "admin") return null;

    return <>{children}</>;
}
