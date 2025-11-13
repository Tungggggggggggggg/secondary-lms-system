/**
 * Classroom Detail Modal
 * Modal hiển thị chi tiết lớp học và danh sách học sinh
 */

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  X, 
  Users, 
  Download, 
  Mail, 
  UserMinus,
  Calendar,
  GraduationCap,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ============================================
// Types
// ============================================

interface Student {
  id: string;
  stt: number;
  fullname: string;
  email: string;
  role: string;
  joinedAt: string;
  createdAt: string;
  classroomStudentId: string;
}

interface ClassroomDetail {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon: string;
  maxStudents: number;
  teacher: {
    id: string;
    fullname: string;
    email: string;
    role: string;
  };
  students: Student[];
  studentsCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ClassroomDetailModalProps {
  classroomId: string;
  isOpen: boolean;
  onClose: () => void;
  onClassroomDeleted?: () => void;
}

// ============================================
// Main Component
// ============================================

export default function ClassroomDetailModal({ 
  classroomId, 
  isOpen, 
  onClose,
  onClassroomDeleted
}: ClassroomDetailModalProps) {
  const { toast } = useToast();
  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null);
  const [isDeletingClassroom, setIsDeletingClassroom] = useState(false);
  
  // Pagination & Search states
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(10);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  // ============================================
  // Data Fetching
  // ============================================

  const fetchClassroomDetail = async () => {
    if (!classroomId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/classrooms/${classroomId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch classroom detail');
      }

      const data = await response.json();
      setClassroom(data.classroom);
    } catch (error) {
      console.error('Error fetching classroom detail:', error);
      toast({
        title: "Lỗi tải dữ liệu",
        description: "Không thể tải chi tiết lớp học",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && classroomId) {
      fetchClassroomDetail();
    }
  }, [isOpen, classroomId]);

  // Filter students based on search query
  useEffect(() => {
    if (!classroom) return;
    
    const filtered = classroom.students.filter(student =>
      student.fullname.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(studentSearchQuery.toLowerCase())
    );
    
    setFilteredStudents(filtered);
    setCurrentPage(1); // Reset to first page when search changes
  }, [classroom, studentSearchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const endIndex = startIndex + studentsPerPage;
  const currentStudents = filteredStudents.slice(startIndex, endIndex);

  // ============================================
  // Event Handlers
  // ============================================

  const handleExportStudents = async () => {
    if (!classroom) return;

    try {
      setIsExporting(true);
      const response = await fetch(`/api/admin/classrooms/${classroom.id}/export`);
      
      if (!response.ok) {
        throw new Error('Failed to export students');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or generate one
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `${classroom.code}_students.csv`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Xuất danh sách thành công",
        description: `Đã tải xuống danh sách học sinh lớp ${classroom.name}`,
        variant: "success"
      });
    } catch (error) {
      console.error('Error exporting students:', error);
      toast({
        title: "Lỗi xuất danh sách",
        description: "Không thể tải xuống danh sách học sinh",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!classroom) return;
    
    const confirmed = window.confirm(`Bạn có chắc muốn xóa học sinh "${studentName}" khỏi lớp "${classroom.name}"?`);
    if (!confirmed) return;

    try {
      setRemovingStudentId(studentId);
      const response = await fetch(`/api/admin/classrooms/${classroom.id}?studentId=${studentId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove student');
      }

      // Refresh classroom data
      await fetchClassroomDetail();

      toast({
        title: "Xóa học sinh thành công",
        description: `Đã xóa ${studentName} khỏi lớp ${classroom.name}`,
        variant: "success"
      });
    } catch (error) {
      console.error('Error removing student:', error);
      toast({
        title: "Lỗi xóa học sinh",
        description: "Không thể xóa học sinh khỏi lớp",
        variant: "destructive"
      });
    } finally {
      setRemovingStudentId(null);
    }
  };

  const handleDeleteClassroom = async () => {
    if (!classroom) return;
    
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa lớp học "${classroom.name}"?\n\nViệc này sẽ xóa lớp học và loại bỏ tất cả học sinh khỏi lớp. Thao tác này không thể hoàn tác.`
    );
    if (!confirmed) return;

    try {
      setIsDeletingClassroom(true);
      const response = await fetch(`/api/admin/classrooms/${classroom.id}?deleteClassroom=true`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete classroom');
      }

      toast({
        title: "Xóa lớp học thành công",
        description: `Đã xóa lớp "${classroom.name}" và loại bỏ tất cả học sinh`,
        variant: "success"
      });

      // Close modal and notify parent
      onClose();
      if (onClassroomDeleted) {
        onClassroomDeleted();
      }
    } catch (error) {
      console.error('Error deleting classroom:', error);
      toast({
        title: "Lỗi xóa lớp học",
        description: "Không thể xóa lớp học. Vui lòng thử lại.",
        variant: "destructive"
      });
    } finally {
      setIsDeletingClassroom(false);
    }
  };

  // ============================================
  // Render
  // ============================================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{classroom?.icon || '📚'}</div>
            <div>
              <h2 className="text-xl font-semibold">{classroom?.name || 'Chi tiết lớp học'}</h2>
              <p className="text-sm text-gray-600">Mã lớp: {classroom?.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {classroom && (
              <Button
                variant="ghost"
                onClick={handleDeleteClassroom}
                disabled={isDeletingClassroom}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {isDeletingClassroom ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Đang tải...</span>
            </div>
          ) : classroom ? (
            <div className="space-y-6">
              {/* Classroom Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Thông tin lớp học
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Tên lớp</p>
                      <p className="font-medium">{classroom.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Mã lớp</p>
                      <p className="font-medium">{classroom.code}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Sĩ số</p>
                      <p className="font-medium">{classroom.studentsCount}/{classroom.maxStudents} học sinh</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ngày tạo</p>
                      <p className="font-medium">{new Date(classroom.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>
                  
                  {classroom.description && (
                    <div>
                      <p className="text-sm text-gray-600">Mô tả</p>
                      <p className="font-medium">{classroom.description}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-gray-600">Giáo viên:</span>
                      <span className="font-medium">{classroom.teacher.fullname}</span>
                      <span className="text-sm text-gray-500">({classroom.teacher.email})</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Students List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Danh sách học sinh ({filteredStudents.length}/{classroom.studentsCount})
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleExportStudents}
                        disabled={isExporting || classroom.studentsCount === 0}
                        className="flex items-center gap-2"
                      >
                        {isExporting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        Xuất CSV
                      </Button>
                    </div>
                  </div>
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Tìm kiếm học sinh theo tên hoặc email..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardHeader>
                
                <CardContent>
                  {classroom.students.length === 0 ? (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Lớp học này chưa có học sinh nào.
                      </AlertDescription>
                    </Alert>
                  ) : filteredStudents.length === 0 ? (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Không tìm thấy học sinh nào với từ khóa "{studentSearchQuery}".
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      {/* Students List */}
                      <div className="space-y-2">
                        {currentStudents.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600">
                                  {student.stt}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{student.fullname}</p>
                                <p className="text-sm text-gray-600">{student.email}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span>Tham gia: {new Date(student.joinedAt).toLocaleDateString('vi-VN')}</span>
                                  <span>Tạo TK: {new Date(student.createdAt).toLocaleDateString('vi-VN')}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{student.role}</Badge>
                              <Button
                                variant="ghost"
                                onClick={() => handleRemoveStudent(student.id, student.fullname)}
                                disabled={removingStudentId === student.id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {removingStudentId === student.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <UserMinus className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="text-sm text-gray-600">
                            Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredStudents.length)} trong {filteredStudents.length} học sinh
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="flex items-center gap-1"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Trước
                            </Button>
                            
                            <div className="flex items-center gap-1">
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <Button
                                  key={page}
                                  variant={page === currentPage ? "default" : "outline"}
                                  onClick={() => setCurrentPage(page)}
                                  className="w-8 h-8 p-0"
                                >
                                  {page}
                                </Button>
                              ))}
                            </div>
                            
                            <Button
                              variant="outline"
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                              className="flex items-center gap-1"
                            >
                              Sau
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Không thể tải thông tin lớp học.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
