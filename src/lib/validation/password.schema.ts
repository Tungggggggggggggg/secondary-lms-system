import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
  .max(200, "Mật khẩu tối đa 200 ký tự")
  .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ hoa")
  .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất 1 chữ thường")
  .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 số");

export type PasswordInput = z.infer<typeof passwordSchema>;
