/**
 * Teacher Selection Step - Bước 2 của Wizard
 * Chọn giáo viên có sẵn hoặc tạo mới
 */

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  Search, 
  Plus, 
  UserCheck, 
  UserPlus,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { WizardData } from "../BulkClassroomWizard";

interface TeacherSelectionStepProps {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

interface Teacher {
  id: string;
  email: string;
  fullname: string;
  role: string;
}

export default function TeacherSelectionStep({
  data,
  onUpdate,
  onNext,
  onPrevious
}: TeacherSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Search teachers
  const searchTeachers = async (query: string) => {
    if (!query || query.length < 2) {
      setTeachers([]);
      return;
    }

    setIsLoading(true);
    setSearchError('');

    try {
      const response = await fetch(`/api/admin/system/users?q=${encodeURIComponent(query)}&role=TEACHER`);
      const result = await response.json();

      if (response.ok && result.success) {
        setTeachers(result.items || []);
      } else {
        setSearchError('Không thể tìm kiếm giáo viên');
        setTeachers([]);
      }
    } catch (error) {
      console.error('Error searching teachers:', error);
      setSearchError('Lỗi kết nối khi tìm kiếm');
      setTeachers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (data.useExistingTeacher) {
        searchTeachers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, data.useExistingTeacher]);

  const handleModeChange = (useExisting: boolean) => {
    onUpdate({ 
      useExistingTeacher: useExisting,
      teacherEmail: '',
      teacherData: undefined
    });
    setSearchQuery('');
    setTeachers([]);
  };

  const handleSelectTeacher = (teacher: Teacher) => {
    onUpdate({ 
      teacherEmail: teacher.email,
      teacherData: undefined
    });
  };

  const handleNewTeacherChange = (field: string, value: string) => {
    const currentTeacherData = data.teacherData || { email: '', fullname: '', password: '' };
    onUpdate({
      teacherData: {
        ...currentTeacherData,
        [field]: value
      }
    });
  };

  const isValid = data.useExistingTeacher 
    ? !!data.teacherEmail 
    : !!(data.teacherData?.email && data.teacherData?.fullname);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-violet-600" />
          Chọn giáo viên cho lớp học
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Chọn cách thức</Label>
          <div className="flex gap-3">
            <Button
              type="button"
              variant={data.useExistingTeacher ? "default" : "outline"}
              onClick={() => handleModeChange(true)}
              className="flex items-center gap-2"
            >
              <UserCheck className="h-4 w-4" />
              Chọn giáo viên có sẵn
            </Button>
            <Button
              type="button"
              variant={!data.useExistingTeacher ? "default" : "outline"}
              onClick={() => handleModeChange(false)}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Tạo giáo viên mới
            </Button>
          </div>
        </div>

        {/* Existing Teacher Selection */}
        {data.useExistingTeacher && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teacher-search" className="text-sm font-medium">
                Tìm kiếm giáo viên
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="teacher-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nhập email hoặc tên giáo viên..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Search Results */}
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-500"></div>
                Đang tìm kiếm...
              </div>
            )}

            {searchError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{searchError}</AlertDescription>
              </Alert>
            )}

            {teachers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Kết quả tìm kiếm</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {teachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        data.teacherEmail === teacher.email
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleSelectTeacher(teacher)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{teacher.fullname}</p>
                          <p className="text-sm text-gray-500">{teacher.email}</p>
                        </div>
                        {data.teacherEmail === teacher.email && (
                          <CheckCircle className="h-5 w-5 text-violet-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchQuery.length >= 2 && teachers.length === 0 && !isLoading && !searchError && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Không tìm thấy giáo viên nào. Thử tìm kiếm với từ khóa khác hoặc tạo giáo viên mới.
                </AlertDescription>
              </Alert>
            )}

            {/* Selected Teacher */}
            {data.teacherEmail && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Đã chọn giáo viên</p>
                    <p className="text-sm text-green-600">{data.teacherEmail}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* New Teacher Creation */}
        {!data.useExistingTeacher && (
          <div className="space-y-4">
            <Alert>
              <Plus className="h-4 w-4" />
              <AlertDescription>
                Tạo tài khoản giáo viên mới. Thông tin đăng nhập sẽ được gửi qua email.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-teacher-email" className="text-sm font-medium">
                  Email giáo viên *
                </Label>
                <Input
                  id="new-teacher-email"
                  type="email"
                  value={data.teacherData?.email || ''}
                  onChange={(e) => handleNewTeacherChange('email', e.target.value)}
                  placeholder="giaovien@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-teacher-fullname" className="text-sm font-medium">
                  Họ và tên *
                </Label>
                <Input
                  id="new-teacher-fullname"
                  value={data.teacherData?.fullname || ''}
                  onChange={(e) => handleNewTeacherChange('fullname', e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-teacher-password" className="text-sm font-medium">
                Mật khẩu (tùy chọn)
              </Label>
              <Input
                id="new-teacher-password"
                type="password"
                value={data.teacherData?.password || ''}
                onChange={(e) => handleNewTeacherChange('password', e.target.value)}
                placeholder="Để trống để tự động tạo mật khẩu"
              />
              <p className="text-xs text-gray-500">
                Nếu để trống, hệ thống sẽ tự động tạo mật khẩu an toàn
              </p>
            </div>
          </div>
        )}

        {/* Validation Summary */}
        {!isValid && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              ⚠️ {data.useExistingTeacher 
                ? 'Vui lòng chọn một giáo viên' 
                : 'Vui lòng điền đầy đủ thông tin giáo viên'
              }
            </p>
          </div>
        )}

        {isValid && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">
              ✅ Thông tin giáo viên đã đầy đủ
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
