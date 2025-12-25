export type AppRole = "teacher" | "student" | "parent";

export const roleBorderClass: Record<AppRole, string> = {
  teacher: "border-blue-100",
  student: "border-green-100",
  parent: "border-amber-100",
};

export const roleAccentText: Record<AppRole, string> = {
  teacher: "text-blue-700",
  student: "text-green-700",
  parent: "text-amber-700",
};

export const roleAccentStrongText: Record<AppRole, string> = {
  teacher: "text-blue-900",
  student: "text-green-900",
  parent: "text-amber-900",
};
