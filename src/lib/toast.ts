/**
 * Toast utility wrapper
 * Cung cấp API tương tự sonner để dễ dàng sử dụng
 */

import { useToast } from "@/hooks/use-toast";

// Singleton instance để có thể gọi toast từ bất kỳ đâu
let toastInstance: ReturnType<typeof useToast> | null = null;

export function setToastInstance(instance: ReturnType<typeof useToast>) {
  toastInstance = instance;
}

export const toast = {
  success: (message: string, description?: string) => {
    if (toastInstance) {
      toastInstance.toast({
        title: message,
        description,
        variant: "success",
        duration: 3000,
      });
    } else {
      console.warn("[Toast] Toast instance not initialized");
    }
  },

  error: (message: string, description?: string) => {
    if (toastInstance) {
      toastInstance.toast({
        title: message,
        description,
        variant: "destructive",
        duration: 4000,
      });
    } else {
      console.warn("[Toast] Toast instance not initialized");
    }
  },

  info: (message: string, description?: string) => {
    if (toastInstance) {
      toastInstance.toast({
        title: message,
        description,
        variant: "default",
        duration: 3000,
      });
    } else {
      console.warn("[Toast] Toast instance not initialized");
    }
  },

  message: (message: string, description?: string) => {
    if (toastInstance) {
      toastInstance.toast({
        title: message,
        description,
        variant: "default",
        duration: 3000,
      });
    } else {
      console.warn("[Toast] Toast instance not initialized");
    }
  },
};
