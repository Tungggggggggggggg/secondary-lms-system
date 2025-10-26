import { useCallback } from "react";

type ToastVariant = "default" | "destructive" | "success";

interface Toast {
    id: string;
    title: string;
    description?: string;
    variant?: ToastVariant;
}

interface ToastOptions {
    title: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
}

const toasts: Toast[] = [];
let listeners: Array<(toasts: Toast[]) => void> = [];

function notifyListeners() {
    listeners.forEach((listener) => listener([...toasts]));
}

export function useToast() {

    const subscribe = useCallback((listener: (toasts: Toast[]) => void) => {
        listeners.push(listener);
        return () => {
            listeners = listeners.filter((l) => l !== listener);
        };
    }, []);

    const toast = useCallback((options: ToastOptions) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast: Toast = {
            id,
            title: options.title,
            description: options.description,
            variant: options.variant || "default",
        };

        toasts.push(newToast);
        notifyListeners();

        const duration = options.duration || 3000;
        setTimeout(() => {
            const index = toasts.findIndex((t) => t.id === id);
            if (index > -1) {
                toasts.splice(index, 1);
                notifyListeners();
            }
        }, duration);

        return id;
    }, []);

    const dismiss = useCallback((id: string) => {
        const index = toasts.findIndex((t) => t.id === id);
        if (index > -1) {
            toasts.splice(index, 1);
            notifyListeners();
        }
    }, []);

    return {
        toast,
        dismiss,
        subscribe,
    };
}
