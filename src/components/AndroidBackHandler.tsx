"use client";

import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";

export default function AndroidBackHandler() {
    useAndroidBackButton();
    return null; // no renderiza nada, solo ejecuta el hook
}
