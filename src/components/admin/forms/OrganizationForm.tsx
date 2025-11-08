"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreateOrganizationInput, UpdateOrganizationInput } from "@/types/admin";

/**
 * Props cho OrganizationForm component
 */
interface OrganizationFormProps {
  initialData?: UpdateOrganizationInput;
  onSubmit: (data: CreateOrganizationInput | UpdateOrganizationInput) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  isEdit?: boolean;
}

/**
 * Component OrganizationForm - Form để tạo/sửa organization
 */
export default function OrganizationForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  isEdit = false,
}: OrganizationFormProps) {
  const [formData, setFormData] = useState<CreateOrganizationInput>({
    name: initialData?.name || "",
    slug: initialData?.slug || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        slug: initialData.slug || "",
      });
    }
  }, [initialData]);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = "Tên tổ chức là bắt buộc";
    } else if (formData.name.length < 2) {
      newErrors.name = "Tên tổ chức phải có ít nhất 2 ký tự";
    }

    // Slug validation (optional)
    if (formData.slug && formData.slug.length > 0) {
      if (!/^[a-z0-9-]+$/.test(formData.slug)) {
        newErrors.slug = "Slug chỉ được chứa chữ thường, số và dấu gạch ngang";
      }
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
        const updateData: UpdateOrganizationInput = {
          id: initialData.id,
          name: formData.name,
          slug: formData.slug || undefined,
        };
        await onSubmit(updateData);
      } else {
        await onSubmit(formData);
      }
    } catch (error) {
      console.error("[OrganizationForm] Error submitting form:", error);
    }
  };

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
    // Auto-generate slug if empty
    if (!formData.slug && !isEdit) {
      setFormData((prev) => ({
        ...prev,
        name: value,
        slug: generateSlug(value),
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <Label htmlFor="name">Tên tổ chức *</Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleNameChange(e.target.value)}
          disabled={loading}
          className={errors.name ? "border-red-500" : ""}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      {/* Slug */}
      <div>
        <Label htmlFor="slug">Slug (tùy chọn)</Label>
        <Input
          id="slug"
          type="text"
          value={formData.slug || ""}
          onChange={(e) =>
            setFormData({ ...formData, slug: e.target.value })
          }
          disabled={loading}
          className={errors.slug ? "border-red-500" : ""}
          placeholder="auto-generated"
        />
        {errors.slug && (
          <p className="mt-1 text-sm text-red-600">{errors.slug}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Slug được dùng trong URL. Nếu để trống, sẽ tự động tạo từ tên tổ chức.
        </p>
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

