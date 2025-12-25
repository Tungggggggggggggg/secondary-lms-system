"use client";

import React, { createContext, useContext } from "react";

export type ThemeColor = "violet" | "amber" | "blue" | "green";

export type ThemeRole = "teacher" | "student" | "parent" | "admin";

const RoleThemeContext = createContext<{ color: ThemeColor; role?: ThemeRole } | undefined>(undefined);

export function RoleThemeProvider({
  color,
  role,
  children,
}: {
  color: ThemeColor;
  role?: ThemeRole;
  children: React.ReactNode;
}) {
  return <RoleThemeContext.Provider value={{ color, role }}>{children}</RoleThemeContext.Provider>;
}

export function useRoleTheme() {
  return useContext(RoleThemeContext);
}
