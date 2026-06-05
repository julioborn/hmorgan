"use client";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CajaLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user?.role !== "cajero" && user?.role !== "superadmin") {
            router.replace("/");
        }
    }, [user, loading, router]);

    if (loading || (user?.role !== "cajero" && user?.role !== "superadmin")) return null;

    return <>{children}</>;
}
