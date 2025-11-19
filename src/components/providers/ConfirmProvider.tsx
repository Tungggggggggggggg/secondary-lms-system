"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import ConfirmDialog from "@/components/admin/modals/ConfirmDialog";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger" | "warning" | "info" | "success";
};

type ConfirmContextType = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmContextType>((opts) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleClose = useCallback((v: boolean) => {
    if (loading) return;
    setOpen(false);
    const r = resolver;
    setResolver(null);
    setTimeout(() => r && r(v), 0);
  }, [resolver, loading]);

  const onConfirm = useCallback(() => {
    setLoading(true);
    handleClose(true);
    setLoading(false);
  }, [handleClose]);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={open}
        onOpenChange={(o) => {
          if (!o) handleClose(false);
          else setOpen(true);
        }}
        onConfirm={onConfirm}
        title={options?.title || ""}
        description={options?.description}
        variant={options?.variant}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
        loading={loading}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirmInternal(): ConfirmContextType {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("ConfirmProvider is missing");
  return ctx;
}

export const useConfirm = useConfirmInternal;
