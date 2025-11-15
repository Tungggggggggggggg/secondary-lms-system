"use client";

import { useEffect, useState } from "react";
import { useTeacherComments } from "@/hooks/use-teacher-comments";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface AssignmentCommentsViewProps {
  assignmentId: string;
}

/**
 * Component hiển thị tất cả comments của học sinh trong assignment
 */
export default function AssignmentCommentsView({
  assignmentId,
}: AssignmentCommentsViewProps) {
  const {
    comments,
    isLoading,
    error,
    pagination,
    fetchComments,
    getCommentsByQuestion,
    getCommentsByStudent,
    getStatistics,
  } = useTeacherComments();

  const [filter, setFilter] = useState<"all" | "byQuestion" | "byStudent">("all");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch comments
  useEffect(() => {
    fetchComments(assignmentId, {
      questionId: selectedQuestionId || undefined,
      studentId: selectedStudentId || undefined,
    });
  }, [assignmentId, selectedQuestionId, selectedStudentId, fetchComments]);

  // Get unique questions và students từ comments
  const uniqueQuestions = Array.from(
    new Map(comments.map((c) => [c.question.id, c.question])).values()
  );
  const uniqueStudents = Array.from(
    new Map(comments.map((c) => [c.user.id, c.user])).values()
  );

  // Filter comments theo search
  const filteredComments = comments.filter((comment) => {
    if (!searchQuery.trim()) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      comment.content.toLowerCase().includes(searchLower) ||
      comment.user.fullname.toLowerCase().includes(searchLower) ||
      comment.question.content.toLowerCase().includes(searchLower)
    );
  });

  const stats = getStatistics();

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
        <h3 className="font-semibold mb-2">Lỗi tải danh sách bình luận</h3>
        <p className="text-sm mb-4">{error}</p>
        <Button onClick={() => fetchComments(assignmentId)}>Thử lại</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-600">Tổng số bình luận</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Học sinh đã bình luận</p>
          <p className="text-2xl font-bold text-indigo-600">{stats.uniqueStudents}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">Câu hỏi có bình luận</p>
          <p className="text-2xl font-bold text-green-600">{stats.uniqueQuestions}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Tìm kiếm trong bình luận..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
            <Button onClick={handleSearch} variant="outline">
              Tìm kiếm
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="default"
              onClick={() => {
                setFilter("all");
                setSelectedQuestionId(null);
                setSelectedStudentId(null);
              }}
            >
              Tất cả
            </Button>
            {uniqueQuestions.map((question) => (
              <Button
                key={question.id}
                variant={
                  selectedQuestionId === question.id ? "default" : "outline"
                }
                size="default"
                onClick={() => {
                  setFilter("byQuestion");
                  setSelectedQuestionId(
                    selectedQuestionId === question.id ? null : question.id
                  );
                  setSelectedStudentId(null);
                }}
              >
                Câu {question.order}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredComments.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">
            {searchQuery || selectedQuestionId || selectedStudentId
              ? "Không tìm thấy bình luận nào"
              : "Chưa có bình luận nào"}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredComments.map((comment) => (
            <Card key={comment.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-600 font-bold">
                    {comment.user.fullname.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-800">
                      {comment.user.fullname}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      Câu {comment.question.order}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
                    {comment.question.content}
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3 mt-2">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() =>
              fetchComments(assignmentId, {
                questionId: selectedQuestionId || undefined,
                studentId: selectedStudentId || undefined,
                page: pagination.page + 1,
              })
            }
            disabled={isLoading}
          >
            Tải thêm
          </Button>
        </div>
      )}
    </div>
  );
}

