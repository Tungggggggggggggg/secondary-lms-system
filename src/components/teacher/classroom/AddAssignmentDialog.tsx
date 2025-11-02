"use client";

import { useState, useEffect, useMemo } from "react";
import { useAssignments, AssignmentT } from "@/hooks/use-assignments";
import { useClassroomAssignments } from "@/hooks/use-classroom-assignments";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

/**
 * Props cho AddAssignmentDialog component
 */
interface AddAssignmentDialogProps {
  classroomId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * AddAssignmentDialog Component
 * Dialog để thêm bài tập vào lớp học
 * - Tab 1: Chọn từ bài tập đã tạo
 * - Tab 2: Tạo bài tập mới (link đến trang tạo)
 */
export default function AddAssignmentDialog({
  classroomId,
  isOpen,
  onClose,
  onSuccess,
}: AddAssignmentDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"select" | "create">("select");
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "ESSAY" | "QUIZ">("all");

  // Lấy danh sách assignments có thể thêm (chưa được thêm vào classroom)
  const { getAvailableAssignments, addAssignmentToClassroom, isLoading } =
    useClassroomAssignments();
  const [availableAssignments, setAvailableAssignments] = useState<
    AssignmentT[]
  >([]);

  // Load available assignments khi dialog mở
  useEffect(() => {
    if (isOpen && activeTab === "select") {
      loadAvailableAssignments();
    }
  }, [isOpen, activeTab, classroomId]);

  const loadAvailableAssignments = async () => {
    const assignments = await getAvailableAssignments(classroomId);
    setAvailableAssignments(assignments);
  };

  // Filter assignments theo search query và type
  const filteredAssignments = useMemo(() => {
    let filtered = [...availableAssignments];

    // Filter theo search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title?.toLowerCase().includes(query) ||
          a.description?.toLowerCase().includes(query)
      );
    }

    // Filter theo type
    if (typeFilter !== "all") {
      filtered = filtered.filter((a) => a.type === typeFilter);
    }

    return filtered;
  }, [availableAssignments, searchQuery, typeFilter]);

  // Toggle selection assignment
  const toggleSelection = (assignmentId: string) => {
    const newSelection = new Set(selectedAssignments);
    if (newSelection.has(assignmentId)) {
      newSelection.delete(assignmentId);
    } else {
      newSelection.add(assignmentId);
    }
    setSelectedAssignments(newSelection);
  };

  // Select all filtered assignments
  const selectAll = () => {
    const allIds = new Set(filteredAssignments.map((a) => a.id));
    setSelectedAssignments(allIds);
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedAssignments(new Set());
  };

  // Thêm assignments đã chọn vào classroom
  const handleAddAssignments = async () => {
    if (selectedAssignments.size === 0) {
      toast({
        title: "Chưa chọn bài tập",
        description: "Vui lòng chọn ít nhất một bài tập để thêm vào lớp",
        variant: "destructive",
      });
      return;
    }

    try {
      let successCount = 0;
      let failCount = 0;

      // Thêm từng assignment (có thể parallel nhưng để dễ quản lý error thì sequential)
      for (const assignmentId of selectedAssignments) {
        const result = await addAssignmentToClassroom(classroomId, assignmentId);
        if (result) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Thêm bài tập thành công",
          description: `Đã thêm ${successCount} bài tập vào lớp${
            failCount > 0 ? ` (${failCount} bài thất bại)` : ""
          }`,
          variant: "success",
        });

        // Reset và refresh
        setSelectedAssignments(new Set());
        await loadAvailableAssignments();
        onSuccess?.();
      } else {
        toast({
          title: "Thêm bài tập thất bại",
          description: "Không thể thêm bài tập vào lớp",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[AddAssignmentDialog] Lỗi khi thêm bài tập:", error);
      toast({
        title: "Có lỗi xảy ra",
        description: "Không thể thêm bài tập vào lớp",
        variant: "destructive",
      });
    }
  };

  // Nếu dialog không mở, không render
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Thêm bài tập vào lớp</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 py-3 border-b border-gray-200 flex gap-4">
          <button
            onClick={() => setActiveTab("select")}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === "select"
                ? "bg-indigo-100 text-indigo-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Chọn từ bài tập đã tạo
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === "create"
                ? "bg-indigo-100 text-indigo-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Tạo bài tập mới
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === "select" ? (
            <div className="space-y-4">
              {/* Search và Filter */}
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm bài tập..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={typeFilter}
                  onChange={(e) =>
                    setTypeFilter(e.target.value as "all" | "ESSAY" | "QUIZ")
                  }
                  className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Tất cả loại</option>
                  <option value="ESSAY">Tự luận</option>
                  <option value="QUIZ">Trắc nghiệm</option>
                </select>
              </div>

              {/* Selection actions */}
              {filteredAssignments.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Đã chọn: {selectedAssignments.size} /{" "}
                    {filteredAssignments.length}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="text-indigo-600 hover:underline"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-gray-400">|</span>
                    <button
                      onClick={deselectAll}
                      className="text-indigo-600 hover:underline"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>
                </div>
              )}

              {/* Assignment list */}
              {filteredAssignments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  {availableAssignments.length === 0
                    ? "Không còn bài tập nào có thể thêm vào lớp"
                    : "Không tìm thấy bài tập nào phù hợp"}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedAssignments.has(assignment.id)
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-indigo-300"
                      }`}
                      onClick={() => toggleSelection(assignment.id)}
                    >
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={selectedAssignments.has(assignment.id)}
                          onChange={() => toggleSelection(assignment.id)}
                          className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">
                            {assignment.title}
                          </h3>
                          {assignment.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {assignment.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>
                              Loại:{" "}
                              {assignment.type === "ESSAY" ? "Tự luận" : "Trắc nghiệm"}
                            </span>
                            {assignment.dueDate && (
                              <span>
                                Hạn:{" "}
                                {new Date(assignment.dueDate).toLocaleDateString(
                                  "vi-VN"
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-6">
                Tạo bài tập mới và quay lại để thêm vào lớp
              </p>
              <Button
                onClick={() => {
                  window.open(
                    `/dashboard/teacher/assignments/new?returnTo=/dashboard/teacher/classrooms/${classroomId}/assignments`,
                    "_blank"
                  );
                }}
              >
                ➕ Tạo bài tập mới
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === "select" && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button
              onClick={handleAddAssignments}
              disabled={selectedAssignments.size === 0 || isLoading}
            >
              {isLoading
                ? "Đang thêm..."
                : `Thêm ${selectedAssignments.size} bài tập`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
