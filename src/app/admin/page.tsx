"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { AdminHome } from "@/components/AdminHomePanel";
import Loader from "@/components/Loader";

export default function AdminPanelPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user?.role !== "admin") {
            router.replace("/");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader size={64} />
            </div>
        );
    }

    if (!user || user.role !== "admin") return null;

    return <AdminHome />;
}
