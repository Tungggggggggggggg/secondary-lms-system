"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import PromptDialog from "@/components/shared/PromptDialog";

type PromptOptions = {
  title: string;
  description?: string;
  placeholder?: string;
  initialValue?: string;
  type?: "text" | "password" | "textarea";
  confirmText?: string;
  cancelText?: string;
  validate?: (value: string) => string | null; // return error text or null
};

type PromptContextType = (options: PromptOptions) => Promise<string | null>;

const PromptContext = createContext<PromptContextType | null>(null);

export function PromptProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<PromptOptions | null>(null);
  const [value, setValue] = useState<string>("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [resolver, setResolver] = useState<((value: string | null) => void) | null>(null);

  const prompt = useCallback<PromptContextType>((opts) => {
    setOptions(opts);
    setValue(opts.initialValue || "");
    setErrorText(null);
    setOpen(true);
    return new Promise<string | null>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleClose = useCallback((v: string | null) => {
    if (loading) return;
    setOpen(false);
    const r = resolver;
    setResolver(null);
    setTimeout(() => r && r(v), 0);
  }, [resolver, loading]);

  const onConfirm = useCallback(() => {
    if (options?.validate) {
      const err = options.validate(value);
      if (err) {
        setErrorText(err);
        return;
      }
    }
    setLoading(true);
    handleClose(value);
    setLoading(false);
  }, [options, value, handleClose]);

  const valueChange = useCallback((v: string) => {
    setValue(v);
    if (errorText) setErrorText(null);
  }, [errorText]);

  const ctxValue = useMemo(() => prompt, [prompt]);

  return (
    <PromptContext.Provider value={ctxValue}>
      {children}
      <PromptDialog
        open={open}
        onOpenChange={(o) => {
          if (!o) handleClose(null);
          else setOpen(true);
        }}
        title={options?.title || ""}
        description={options?.description}
        placeholder={options?.placeholder}
        initialValue={options?.initialValue}
        type={options?.type}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
        loading={loading}
        errorText={errorText}
        onChange={valueChange}
        onConfirm={onConfirm}
      />
    </PromptContext.Provider>
  );
}

export function usePromptInternal(): PromptContextType {
  const ctx = useContext(PromptContext);
  if (!ctx) throw new Error("PromptProvider is missing");
  return ctx;
}

export const usePrompt = usePromptInternal;
