// src/app/admin/rewards/scan/page.tsx
"use client";

import ScanRewardPage from "@/components/ScanRewardPage";

export const dynamic = "force-dynamic"; // 🔥 evita pre-render server

export default function Page() {
    return <ScanRewardPage />;
}
