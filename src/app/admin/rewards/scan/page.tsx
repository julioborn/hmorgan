"use client";

import { Suspense } from "react";
import ScanRewardPage from "@/components/ScanRewardPage";
import Loader from "@/components/Loader";

export default function ScanRewardPageWrapper() {
    return (
        <Suspense
            fallback={
                <div className="p-12 flex justify-center">
                    <Loader size={40} />
                </div>
            }
        >
            <ScanRewardPage />
        </Suspense>
    );
}
