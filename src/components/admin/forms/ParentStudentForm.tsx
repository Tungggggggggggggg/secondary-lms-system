"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreateParentStudentInput, UpdateParentStudentInput, ParentStudent } from "@/types/admin";
import useSWR from "swr";

/**
 * Props cho ParentStudentForm component
 */
interface ParentStudentFormProps {
  onSubmit: (data: CreateParentStudentInput | UpdateParentStudentInput) => Promise<void>;
  onCancel?: () => void;
  initialData?: ParentStudent;
  loading?: boolean;
  isEdit?: boolean;
}

/**
 * Fetcher function cho SWR
 */
const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Component ParentStudentForm - Form để tạo/sửa liên kết phụ huynh-học sinh
 */
export default function ParentStudentForm({
  onSubmit,
  onCancel,
  initialData,
  loading = false,
  isEdit = false,
}: ParentStudentFormProps) {
  const [formData, setFormData] = useState<CreateParentStudentInput | UpdateParentStudentInput>(
    isEdit && initialData
      ? {
          id: initialData.id,
          parentId: initialData.parentId,
          studentId: initialData.studentId,
        }
      : {
          parentId: "",
          studentId: "",
        }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [parentSearch, setParentSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  // Fetch parents
  const { data: parentsData, isLoading: loadingParents } = useSWR(
    `/api/admin/parent-students/users?role=PARENT${parentSearch ? `&search=${encodeURIComponent(parentSearch)}` : ""}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Fetch students
  const { data: studentsData, isLoading: loadingStudents } = useSWR(
    `/api/admin/parent-students/users?role=STUDENT${studentSearch ? `&search=${encodeURIComponent(studentSearch)}` : ""}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData && isEdit) {
      setFormData({
        id: initialData.id,
        parentId: initialData.parentId,
        studentId: initialData.studentId,
      });
    }
  }, [initialData, isEdit]);

  // Ensure we only use real data from API, never fallback to mock data
  const parents = (parentsData?.success && parentsData?.items) ? parentsData.items : [];
  const students = (studentsData?.success && studentsData?.items) ? studentsData.items : [];

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.parentId) {
      newErrors.parentId = "Vui lòng chọn phụ huynh";
    }

    if (!formData.studentId) {
      newErrors.studentId = "Vui lòng chọn học sinh";
    }

    if (formData.parentId && formData.studentId && formData.parentId === formData.studentId) {
      newErrors.studentId = "Phụ huynh và học sinh không thể là cùng một người";
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
      if (isEdit) {
        // For update, always send both parentId and studentId
        // API will validate and only update if values changed
        const updateData: UpdateParentStudentInput = {
          id: (formData as UpdateParentStudentInput).id,
          parentId: formData.parentId,
          studentId: formData.studentId,
        };
        
        await onSubmit(updateData);
      } else {
        await onSubmit(formData as CreateParentStudentInput);
      }
    } catch (error) {
      console.error("[ParentStudentForm] Error submitting form:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Parent Selection */}
      <div>
        <Label htmlFor="parentId">Phụ huynh *</Label>
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="Tìm kiếm phụ huynh theo tên hoặc email..."
            value={parentSearch}
            onChange={(e) => setParentSearch(e.target.value)}
            disabled={loading}
            className="mb-2"
          />
          <select
            id="parentId"
            value={formData.parentId}
            onChange={(e) =>
              setFormData({ ...formData, parentId: e.target.value })
            }
            disabled={loading || loadingParents}
            className={`block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-violet-500 ${
              errors.parentId ? "border-red-500" : ""
            }`}
          >
            <option value="">-- Chọn phụ huynh --</option>
            {parents.map((parent: any) => (
              <option key={parent.id} value={parent.id}>
                {parent.fullname} ({parent.email})
              </option>
            ))}
          </select>
          {errors.parentId && (
            <p className="mt-1 text-sm text-red-600">{errors.parentId}</p>
          )}
          {loadingParents && (
            <p className="mt-1 text-xs text-gray-500">Đang tải danh sách phụ huynh...</p>
          )}
        </div>
      </div>

      {/* Student Selection */}
      <div>
        <Label htmlFor="studentId">Học sinh *</Label>
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="Tìm kiếm học sinh theo tên hoặc email..."
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            disabled={loading}
            className="mb-2"
          />
          <select
            id="studentId"
            value={formData.studentId}
            onChange={(e) =>
              setFormData({ ...formData, studentId: e.target.value })
            }
            disabled={loading || loadingStudents}
            className={`block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-violet-500 ${
              errors.studentId ? "border-red-500" : ""
            }`}
          >
            <option value="">-- Chọn học sinh --</option>
            {students.map((student: any) => (
              <option key={student.id} value={student.id}>
                {student.fullname} ({student.email})
              </option>
            ))}
          </select>
          {errors.studentId && (
            <p className="mt-1 text-sm text-red-600">{errors.studentId}</p>
          )}
          {loadingStudents && (
            <p className="mt-1 text-xs text-gray-500">Đang tải danh sách học sinh...</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Hủy
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo liên kết"}
        </Button>
      </div>
    </form>
  );
}

