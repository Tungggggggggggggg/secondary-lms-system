/**
 * Preview Step - Bước 4 của Wizard
 * Xem trước tất cả thông tin trước khi submit
 */

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Eye, 
  BookOpen, 
  Users, 
  UserCheck, 
  Mail,
  Hash,
  Calendar,
  GraduationCap,
  AlertTriangle,
  CheckCircle,
  Sparkles
} from "lucide-react";
import { WizardData } from "../BulkClassroomWizard";

interface PreviewStepProps {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
  isProcessing: boolean;
}

export default function PreviewStep({
  data,
  onUpdate,
  onNext,
  onPrevious,
  onSubmit,
  isProcessing
}: PreviewStepProps) {

  const studentsWithParents = data.students.filter(s => s.metadata?.parentEmail).length;
  const studentsWithStudentId = data.students.filter(s => s.metadata?.studentId).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-violet-600" />
            Xem trước thông tin lớp học
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Kiểm tra kỹ thông tin bên dưới trước khi tạo lớp học. Sau khi tạo, một số thông tin không thể thay đổi.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Classroom Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5" />
            Thông tin lớp học
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{data.icon}</span>
                <div>
                  <p className="font-semibold text-lg">{data.name}</p>
                  {data.description && (
                    <p className="text-gray-600 text-sm">{data.description}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {data.code && (
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-500" />
                    <span className="font-mono font-medium">{data.code}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span>Tối đa {data.maxStudents} học sinh</span>
                </div>

                {data.academicYear && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>Năm học {data.academicYear}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {data.grade && (
                  <Badge variant="outline">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    Lớp {data.grade}
                  </Badge>
                )}
                {data.subject && (
                  <Badge variant="outline">{data.subject}</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teacher Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCheck className="h-5 w-5" />
            Thông tin giáo viên
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.useExistingTeacher ? (
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">Sử dụng giáo viên có sẵn</p>
                <p className="text-sm text-gray-600">{data.teacherEmail}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Tạo giáo viên mới</p>
                <p className="text-sm text-gray-600">
                  {data.teacherData?.fullname} ({data.teacherData?.email})
                </p>
                {!data.teacherData?.password && (
                  <p className="text-xs text-gray-500">
                    Mật khẩu sẽ được tự động tạo
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Students Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Danh sách học sinh ({data.students.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-violet-600">{data.students.length}</p>
              <p className="text-sm text-gray-600">Tổng học sinh</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{studentsWithParents}</p>
              <p className="text-sm text-gray-600">Có phụ huynh</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{studentsWithStudentId}</p>
              <p className="text-sm text-gray-600">Có mã HS</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {data.students.length - studentsWithParents}
              </p>
              <p className="text-sm text-gray-600">Không có PH</p>
            </div>
          </div>

          {/* Students List Preview */}
          <div className="space-y-2">
            <p className="font-medium">Danh sách học sinh (hiển thị 5 đầu tiên):</p>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {data.students.slice(0, 5).map((student, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                >
                  <div>
                    <p className="font-medium">{student.fullname}</p>
                    <p className="text-sm text-gray-500">{student.email}</p>
                    {student.metadata?.parentEmail && (
                      <p className="text-xs text-gray-400">
                        <Mail className="h-3 w-3 inline mr-1" />
                        PH: {student.metadata.parentEmail}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {student.metadata?.studentId && (
                      <Badge variant="outline" className="text-xs">
                        {student.metadata.studentId}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              
              {data.students.length > 5 && (
                <div className="text-center p-3 text-gray-500 text-sm">
                  ... và {data.students.length - 5} học sinh khác
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5" />
            Cài đặt tự động
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${data.autoGeneratePasswords ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className={data.autoGeneratePasswords ? 'text-green-700' : 'text-gray-500'}>
                Tự động tạo mật khẩu
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${data.createParentLinks ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className={data.createParentLinks ? 'text-green-700' : 'text-gray-500'}>
                Tạo liên kết phụ huynh
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${data.sendWelcomeEmails ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className={data.sendWelcomeEmails ? 'text-green-700' : 'text-gray-500'}>
                Gửi email chào mừng
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {data.maxStudents && data.students.length > data.maxStudents && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ Số lượng học sinh ({data.students.length}) vượt quá giới hạn lớp học ({data.maxStudents}). 
            Bạn có thể tăng giới hạn hoặc giảm số học sinh.
          </AlertDescription>
        </Alert>
      )}

      {studentsWithParents === 0 && data.createParentLinks && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ℹ️ Không có học sinh nào có email phụ huynh. Tính năng tạo liên kết phụ huynh sẽ không hoạt động.
          </AlertDescription>
        </Alert>
      )}

      {/* Final Confirmation */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <p className="text-lg font-semibold">Sẵn sàng tạo lớp học</p>
            </div>
            
            <p className="text-gray-600">
              Hệ thống sẽ tạo lớp học "{data.name}" với {data.students.length} học sinh.
              {!data.useExistingTeacher && " Tài khoản giáo viên mới cũng sẽ được tạo."}
            </p>

            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <AlertTriangle className="h-4 w-4" />
              <span>Quá trình này có thể mất vài phút để hoàn thành</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
