"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { OWNER_USER_ID } from "@/lib/owner";
import { AdminHome } from "@/app/page";
import Loader from "@/components/Loader";

export default function AdminPanelPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user?.role !== "admin" && user?.id !== OWNER_USER_ID) {
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

    if (!user || (user.role !== "admin" && user.id !== OWNER_USER_ID)) return null;

    return <AdminHome />;
}
