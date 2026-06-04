"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell } from "lucide-react";

type Toast = { id: number; title: string; body: string };

export default function PushToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        const handler = (e: Event) => {
            const { title, body } = (e as CustomEvent).detail ?? {};
            if (!title && !body) return;
            const id = Date.now();
            setToasts((prev) => [...prev, { id, title, body }]);
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, 4500);
        };

        window.addEventListener("push-notification", handler);
        return () => window.removeEventListener("push-notification", handler);
    }, []);

    const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex flex-col items-center gap-2 pt-[calc(env(safe-area-inset-top)+56px)] px-4 pointer-events-none">
            <AnimatePresence>
                {toasts.map((t) => (
                    <motion.div
                        key={t.id}
                        initial={{ opacity: 0, y: -16, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                        className="pointer-events-auto w-full max-w-sm bg-black text-white rounded-2xl shadow-2xl px-4 py-3 flex items-start gap-3"
                    >
                        <div className="mt-0.5 shrink-0 bg-red-600 rounded-full p-1.5">
                            <Bell size={14} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            {t.title && <p className="font-semibold text-sm leading-tight">{t.title}</p>}
                            {t.body && <p className="text-xs text-gray-300 mt-0.5 leading-snug">{t.body}</p>}
                        </div>
                        <button
                            onClick={() => dismiss(t.id)}
                            className="shrink-0 text-gray-400 hover:text-white transition mt-0.5"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
