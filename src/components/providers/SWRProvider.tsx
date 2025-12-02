"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";
import fetcher from "@/lib/fetcher";

export default function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        shouldRetryOnError: false,
        dedupingInterval: 4000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
