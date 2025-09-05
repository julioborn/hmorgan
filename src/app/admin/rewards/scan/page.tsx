"use client";

import { Suspense } from "react";
import ScanRewardPage from "@/components/ScanRewardPage";

export default function ScanRewardPageWrapper() {
    return (
        <Suspense fallback={<div className="p-6">Cargando…</div>}>
            <ScanRewardPage />
        </Suspense>
    );
}
