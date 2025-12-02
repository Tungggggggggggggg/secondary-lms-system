"use client";

import React, { createContext, useContext } from "react";

export type ThemeColor = "violet" | "amber" | "blue" | "green";

const RoleThemeContext = createContext<{ color: ThemeColor } | undefined>(undefined);

export function RoleThemeProvider({ color, children }: { color: ThemeColor; children: React.ReactNode }) {
  return <RoleThemeContext.Provider value={{ color }}>{children}</RoleThemeContext.Provider>;
}

export function useRoleTheme() {
  return useContext(RoleThemeContext);
}
