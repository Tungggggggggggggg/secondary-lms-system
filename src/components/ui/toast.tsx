"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Toast {
    id: string;
    title: string;
    description?: string;
    variant?: "default" | "destructive" | "success";
}

export function Toaster() {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const { subscribe } = useToast();

    useEffect(() => {
        const unsubscribe = subscribe(setToasts);
        return unsubscribe;
    }, [subscribe]);

    return (
        <div className="fixed top-6 right-6 z-[100] flex flex-col gap-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    role="alert"
                    aria-live="polite"
                    className={cn(
                        "min-w-[300px] rounded-xl p-4 shadow-2xl animate-slide-in",
                        "text-white font-medium text-sm",
                        {
                            "bg-gradient-to-r from-blue-400 to-blue-600":
                                toast.variant === "default",
                            "bg-gradient-to-r from-red-400 to-red-600":
                                toast.variant === "destructive",
                            "bg-gradient-to-r from-green-400 to-green-600":
                                toast.variant === "success",
                        }
                    )}
                >
                    <div className="font-semibold">{toast.title}</div>
                    {toast.description && (
                        <div className="mt-1 text-xs opacity-90">
                            {toast.description}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
