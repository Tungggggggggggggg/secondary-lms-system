/**
 * Admin Classrooms Management Page
 * Quản lý danh sách lớp học và thông tin học sinh
 */

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  BookOpen, 
  Users, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  Download,
  Mail,
  Key,
  UserCheck,
  Calendar,
  GraduationCap
} from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";
import ClassroomDetailModal from "@/components/admin/classrooms/ClassroomDetailModal";
import { useToast } from "@/hooks/use-toast";

// ============================================
// Types
// ============================================

interface Classroom {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon: string;
  maxStudents: number;
  teacherId: string;
  teacher: {
    id: string;
    fullname: string;
    email: string;
  };
  students: ClassroomStudent[];
  createdAt: string;
  updatedAt: string;
}

interface ClassroomStudent {
  id: string;
  studentId: string;
  student: {
    id: string;
    fullname: string;
    email: string;
    role: string;
  };
  joinedAt: string;
}

// ============================================
// Main Component
// ============================================

export default function AdminClassroomsPage() {
  const { toast } = useToast();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [filteredClassrooms, setFilteredClassrooms] = useState<Classroom[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ============================================
  // Data Fetching
  // ============================================

  const fetchClassrooms = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/classrooms');
      
      if (!response.ok) {
        throw new Error('Failed to fetch classrooms');
      }

      const data = await response.json();
      setClassrooms(data.classrooms || []);
      setFilteredClassrooms(data.classrooms || []);
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      toast({
        title: "Lỗi tải dữ liệu",
        description: "Không thể tải danh sách lớp học",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  // ============================================
  // Search & Filter
  // ============================================

  useEffect(() => {
    const filtered = classrooms.filter(classroom => 
      classroom.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      classroom.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      classroom.teacher.fullname.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredClassrooms(filtered);
  }, [searchQuery, classrooms]);

  // ============================================
  // Event Handlers
  // ============================================

  const handleViewClassroom = (classroom: Classroom) => {
    setSelectedClassroomId(classroom.id);
    setShowDetailModal(true);
  };

  const handleExportStudents = (classroom: Classroom) => {
    const csvContent = [
      ['STT', 'Họ tên', 'Email', 'Ngày tham gia'].join(','),
      ...classroom.students.map((student, index) => [
        index + 1,
        student.student.fullname,
        student.student.email,
        new Date(student.joinedAt).toLocaleDateString('vi-VN')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${classroom.code}_students.csv`;
    link.click();

    toast({
      title: "Xuất danh sách thành công",
      description: `Đã xuất danh sách học sinh lớp ${classroom.name}`,
      variant: "success"
    });
  };

  // ============================================
  // Render Functions
  // ============================================

  const renderClassroomCard = (classroom: Classroom) => (
    <Card key={classroom.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{classroom.icon}</div>
            <div>
              <CardTitle className="text-lg">{classroom.name}</CardTitle>
              <p className="text-sm text-gray-600">Mã lớp: {classroom.code}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {classroom.students.length}/{classroom.maxStudents} học sinh
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <GraduationCap className="h-4 w-4" />
          <span>Giáo viên: {classroom.teacher.fullname}</span>
        </div>
        
        {classroom.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {classroom.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="h-3 w-3" />
          <span>Tạo: {new Date(classroom.createdAt).toLocaleDateString('vi-VN')}</span>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => handleViewClassroom(classroom)}
            className="flex-1 text-sm py-1 px-2"
          >
            <Eye className="h-4 w-4 mr-2" />
            Xem chi tiết
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExportStudents(classroom)}
            className="text-sm py-1 px-2"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );


  // ============================================
  // Main Render
  // ============================================

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Quản lý lớp học"
        userRole="ADMIN"
      />

      {/* Stats & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Tổng lớp học</p>
                <p className="text-2xl font-bold">{classrooms.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Tổng học sinh</p>
                <p className="text-2xl font-bold">
                  {classrooms.reduce((total, classroom) => total + classroom.students.length, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Giáo viên</p>
                <p className="text-2xl font-bold">
                  {new Set(classrooms.map(c => c.teacherId)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Button 
              onClick={() => window.location.href = '/dashboard/admin/bulk'}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tạo lớp mới
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tìm kiếm lớp học, mã lớp, hoặc giáo viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Classrooms Grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <p>Đang tải danh sách lớp học...</p>
        </div>
      ) : filteredClassrooms.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {searchQuery ? 'Không tìm thấy lớp học nào' : 'Chưa có lớp học nào'}
            </p>
            {!searchQuery && (
              <Button 
                onClick={() => window.location.href = '/dashboard/admin/bulk'}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tạo lớp học đầu tiên
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClassrooms.map(renderClassroomCard)}
        </div>
      )}

      {/* Classroom Detail Modal */}
      <ClassroomDetailModal
        classroomId={selectedClassroomId}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedClassroomId('');
          // Refresh data after modal closes
          fetchClassrooms();
        }}
        onClassroomDeleted={() => {
          // Refresh classroom list after deletion
          fetchClassrooms();
        }}
      />
    </div>
  );
}
