"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserRole } from "@prisma/client";
import { CreateUserInput, UpdateUserInput } from "@/types/admin";
import { USER_ROLES, ROLE_LABELS } from "@/lib/admin/admin-constants";

/**
 * Props cho UserForm component
 */
interface UserFormProps {
  initialData?: UpdateUserInput;
  onSubmit: (data: CreateUserInput | UpdateUserInput) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  isEdit?: boolean;
}

/**
 * Component UserForm - Form để tạo/sửa user
 * Hỗ trợ validation và role selection
 */
export default function UserForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  isEdit = false,
}: UserFormProps) {
  const [formData, setFormData] = useState<CreateUserInput>({
    email: initialData?.email || "",
    fullname: initialData?.fullname || "",
    password: "",
    role: (initialData?.role as UserRole) || "STUDENT",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        email: initialData.email || "",
        fullname: initialData.fullname || "",
        password: "",
        role: (initialData.role as UserRole) || "STUDENT",
      });
    }
  }, [initialData]);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email là bắt buộc";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ";
    }

    if (!formData.fullname) {
      newErrors.fullname = "Họ tên là bắt buộc";
    } else if (formData.fullname.length < 2) {
      newErrors.fullname = "Họ tên phải có ít nhất 2 ký tự";
    }

    if (!isEdit && !formData.password) {
      newErrors.password = "Mật khẩu là bắt buộc";
    } else if (!isEdit && formData.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      if (isEdit && initialData) {
        const updateData: UpdateUserInput = {
          id: initialData.id,
          email: formData.email,
          fullname: formData.fullname,
          role: formData.role,
        };
        await onSubmit(updateData);
      } else {
        await onSubmit(formData);
      }
    } catch (error) {
      console.error("[UserForm] Error submitting form:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email */}
      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
          disabled={isEdit || loading}
          className={errors.email ? "border-red-500" : ""}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      {/* Fullname */}
      <div>
        <Label htmlFor="fullname">Họ tên *</Label>
        <Input
          id="fullname"
          type="text"
          value={formData.fullname}
          onChange={(e) =>
            setFormData({ ...formData, fullname: e.target.value })
          }
          disabled={loading}
          className={errors.fullname ? "border-red-500" : ""}
        />
        {errors.fullname && (
          <p className="mt-1 text-sm text-red-600">{errors.fullname}</p>
        )}
      </div>

      {/* Password (chỉ hiển thị khi tạo mới) */}
      {!isEdit && (
        <div>
          <Label htmlFor="password">Mật khẩu *</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            disabled={loading}
            className={errors.password ? "border-red-500" : ""}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Mật khẩu phải có ít nhất 6 ký tự
          </p>
        </div>
      )}

      {/* Role */}
      <div>
        <Label htmlFor="role">Vai trò *</Label>
        <select
          id="role"
          value={formData.role}
          onChange={(e) =>
            setFormData({ ...formData, role: e.target.value as UserRole })
          }
          disabled={loading}
          className="block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          {USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Hủy
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo mới"}
        </Button>
      </div>
    </form>
  );
}

