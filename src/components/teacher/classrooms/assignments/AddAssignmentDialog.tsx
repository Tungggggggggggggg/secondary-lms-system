"use client";

import { useState, useEffect, useMemo } from "react";
import type { AssignmentT } from "@/hooks/use-assignments";
import { useClassroomAssignments } from "@/hooks/use-classroom-assignments";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared";
import AssignmentListItem from "@/components/teacher/assignments/AssignmentListItem";
import SelectionToolbar from "@/components/teacher/assignments/SelectionToolbar";
import { useDebounce } from "@/hooks/use-debounce";
import { useSelection } from "@/hooks/use-selection";

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
  const { value: selectedAssignments, toggle, clear, selectAll } =
    useSelection<string>();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "ESSAY" | "QUIZ">("all");

  // Lấy danh sách assignments có thể thêm (chưa được thêm vào classroom)
  const { getAvailableAssignments, addAssignmentToClassroom, isLoading } =
    useClassroomAssignments();
  const [availableAssignments, setAvailableAssignments] = useState<
    AssignmentT[]
  >([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);

  // Load available assignments khi dialog mở
  useEffect(() => {
    if (isOpen && activeTab === "select") {
      loadAvailableAssignments();
    }
  }, [isOpen, activeTab, classroomId]);

  const loadAvailableAssignments = async () => {
    setLoadingAvailable(true);
    const assignments = await getAvailableAssignments(classroomId);
    setAvailableAssignments(assignments);
    setLoadingAvailable(false);
  };

  // Filter assignments theo search query và type
  const debouncedQuery = useDebounce(searchQuery, 300);
  const filteredAssignments = useMemo(() => {
    let filtered = [...availableAssignments];

    // Filter theo search query
    if (debouncedQuery.trim()) {
      const query = debouncedQuery.toLowerCase();
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
  }, [availableAssignments, debouncedQuery, typeFilter]);

  // Toggle selection assignment
  const toggleSelection = (assignmentId: string) => {
    toggle(assignmentId);
  };

  // Select all filtered assignments
  const selectAllFiltered = () => {
    const allIds = filteredAssignments.map((a) => a.id);
    selectAll(allIds);
  };

  // Deselect all
  const deselectAll = () => {
    clear();
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
        clear();
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

  const handleClose = () => {
    if (selectedAssignments.size > 0) {
      const ok = window.confirm(
        "Bạn đang có lựa chọn đang dở. Đóng cửa sổ sẽ mất lựa chọn. Bạn có chắc muốn đóng?"
      );
      if (!ok) return;
    }
    clear();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? handleClose() : undefined)}>
      <DialogContent onClose={handleClose} className="max-w-4xl">
        {/* Header */}
        <DialogHeader>
          <DialogTitle>Thêm bài tập vào lớp</DialogTitle>
          <DialogDescription className="sr-only">
            Chọn bài tập có sẵn hoặc tạo bài tập mới để thêm vào lớp học.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "select" | "create")}>
          <div className="px-6 py-3">
            <TabsList>
              <TabsTrigger value="select">Chọn từ bài tập đã tạo</TabsTrigger>
              <TabsTrigger value="create">Tạo bài tập mới</TabsTrigger>
            </TabsList>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="select" className="space-y-4">
              {/* Search và Filter */}
              <div className="flex items-center gap-4">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm bài tập..."
                  aria-label="Tìm kiếm bài tập"
                />
                <Select
                  value={typeFilter}
                  onChange={(e) =>
                    setTypeFilter(e.target.value as "all" | "ESSAY" | "QUIZ")
                  }
                  aria-label="Lọc theo loại bài tập"
                >
                  <option value="all">Tất cả loại</option>
                  <option value="ESSAY">Tự luận</option>
                  <option value="QUIZ">Trắc nghiệm</option>
                </Select>
              </div>

              {/* Selection actions */}
              {filteredAssignments.length > 0 && (
                <SelectionToolbar
                  selected={selectedAssignments.size}
                  total={filteredAssignments.length}
                  onSelectAll={selectAllFiltered}
                  onClear={deselectAll}
                />
              )}

              {/* Assignment list */}
              {loadingAvailable ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                  ))}
                </div>
              ) : filteredAssignments.length === 0 ? (
                availableAssignments.length === 0 ? (
                  <EmptyState
                    title="Không còn bài tập khả dụng"
                    description="Hãy tạo bài tập mới rồi quay lại để thêm vào lớp."
                    variant="teacher"
                  />
                ) : (
                  <EmptyState
                    title="Không tìm thấy bài tập phù hợp"
                    description="Thử đổi từ khóa tìm kiếm hoặc bộ lọc."
                    variant="teacher"
                  />
                )
              ) : (
                <div className="space-y-3">
                  {filteredAssignments.map((assignment) => (
                    <AssignmentListItem
                      key={assignment.id}
                      assignment={assignment}
                      checked={selectedAssignments.has(assignment.id)}
                      onChange={() => toggleSelection(assignment.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="create">
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
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        {activeTab === "select" && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
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
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
