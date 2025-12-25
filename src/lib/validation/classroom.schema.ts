import { z } from "zod";

export const classroomIconKeys = [
  "book",
  "map",
  "mic",
  "calc",
  "lab",
  "palette",
  "music",
  "trophy",
] as const;

export const classroomCreateSchema = z.object({
  name: z.string().trim().min(1, "Tên lớp không được để trống"),
  description: z.string().trim().optional().default(""),
  icon: z.enum(classroomIconKeys),
  maxStudents: z
    .number()
    .int("Sĩ số tối đa phải là số nguyên")
    .min(1, "Sĩ số tối đa phải lớn hơn 0"),
  code: z
    .string()
    .trim()
    .regex(/^[A-Z2-9]{4,10}$/i, "Mã lớp 4–10 ký tự, chỉ A–Z và 2–9")
    .optional()
    .or(z.literal("")).optional(),
});

export type ClassroomCreateInput = z.infer<typeof classroomCreateSchema>;
