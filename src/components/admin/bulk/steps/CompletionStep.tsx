/**
 * Completion Step - Bước 5 của Wizard
 * Hiển thị kết quả và thông tin đăng nhập
 */

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  BookOpen,
  Download,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Mail
} from "lucide-react";
import { WizardData } from "../BulkClassroomWizard";
import { BulkOperationProgress } from "@/types/bulk-operations";
import { useToast } from "@/hooks/use-toast";

interface CompletionStepProps {
  data: WizardData;
  operationId: string | null;
}

export default function CompletionStep({
  data,
  operationId
}: CompletionStepProps) {
  const { toast } = useToast();
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [isPolling, setIsPolling] = useState(true);

  // Poll for progress updates
  useEffect(() => {
    if (!operationId || !isPolling) return;

    const pollProgress = async () => {
      try {
        const response = await fetch(`/api/admin/bulk/classrooms/${operationId}`);
        const result = await response.json();

        if (response.ok && result.success && result.data) {
          setProgress(result.data);
          
          // Stop polling when completed or failed
          if (result.data.status === 'COMPLETED' || result.data.status === 'FAILED') {
            setIsPolling(false);
          }
        }
      } catch (error) {
        console.error('Error polling progress:', error);
        setIsPolling(false);
      }
    };

    // Poll immediately and then every 2 seconds
    pollProgress();
    const interval = setInterval(pollProgress, 2000);

    return () => clearInterval(interval);
  }, [operationId, isPolling]);

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Đã sao chép",
        description: "Thông tin đã được sao chép vào clipboard",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Lỗi sao chép",
        description: "Không thể sao chép vào clipboard",
        variant: "destructive"
      });
    }
  };

  const generateLoginInfo = () => {
    if (!progress?.result) return '';

    let info = `=== THÔNG TIN ĐĂNG NHẬP LỚP HỌC ===\n\n`;
    info += `Lớp học: ${data.name}\n`;
    

    // Teacher info
    if (progress.result.teacher) {
      info += `=== GIÁO VIÊN ===\n`;
      info += `Họ tên: ${progress.result.teacher.fullname}\n`;
      info += `Email: ${progress.result.teacher.email}\n`;
      if (progress.result.teacher.generatedPassword) {
        info += `Mật khẩu: ${progress.result.teacher.generatedPassword}\n`;
      }
      info += `\n`;
    }

    // Students info
    info += `=== HỌC SINH ===\n`;
    progress.result.students.forEach((student, index) => {
      if (student.success && student.created) {
        info += `${index + 1}. ${student.created.fullname}\n`;
        info += `   Email: ${student.created.email}\n`;
        if (student.created.generatedPassword) {
          info += `   Mật khẩu: ${student.created.generatedPassword}\n`;
        }
        info += `\n`;
      }
    });

    return info;
  };

  if (!progress) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
            <p className="text-lg font-medium">Đang tạo lớp học...</p>
            <p className="text-gray-500">Vui lòng chờ trong giây lát</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (progress.status === 'FAILED') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Tạo lớp học thất bại
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {progress.error || 'Có lỗi xảy ra trong quá trình tạo lớp học'}
            </AlertDescription>
          </Alert>

          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Thử lại
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (progress.status === 'IN_PROGRESS') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-violet-600" />
            Đang xử lý...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{progress.currentStep}</span>
              <span>{progress.progress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-violet-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.progress.percentage}%` }}
              />
            </div>
          </div>

          <p className="text-center text-gray-600">
            {progress.progress.current} / {progress.progress.total} bước hoàn thành
          </p>
        </CardContent>
      </Card>
    );
  }

  // Success state
  const result = progress.result!;
  const successCount = result.summary.successCount;
  const errorCount = result.summary.errorCount;
  const totalProcessed = result.summary.totalProcessed;

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            Tạo lớp học thành công!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Lớp học "{data.name}" đã được tạo thành công với {successCount}/{totalProcessed} học sinh.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Tổng kết
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{successCount}</p>
              <p className="text-sm text-green-700">Thành công</p>
            </div>
            
            {errorCount > 0 && (
              <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{errorCount}</p>
                <p className="text-sm text-red-700">Lỗi</p>
              </div>
            )}
            
            <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{result.parentLinks.length}</p>
              <p className="text-sm text-blue-700">Liên kết PH</p>
            </div>
            
            <div className="text-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-2xl font-bold text-gray-600">{Math.round(result.summary.duration / 1000)}s</p>
              <p className="text-sm text-gray-700">Thời gian</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classroom Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Thông tin lớp học
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-violet-50 border border-violet-200 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{data.icon}</span>
              <div>
                <p className="font-semibold text-lg">{data.name}</p>
               
              </div>
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={() => handleCopyToClipboard(result.classroom?.code || '')}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Sao chép mã
            </Button>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => window.open(`/dashboard/teacher/classrooms/${result.classroom?.id}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              Xem lớp học
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => handleCopyToClipboard(generateLoginInfo())}
            >
              <Download className="h-4 w-4" />
              Xuất thông tin đăng nhập
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Login Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Thông tin đăng nhập
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={() => setShowPasswords(!showPasswords)}
              className="flex items-center gap-2"
            >
              {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPasswords ? 'Ẩn' : 'Hiện'} mật khẩu
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Teacher Login */}
          {result.teacher && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Giáo viên</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Họ tên:</strong> {result.teacher.fullname}</p>
                <p><strong>Email:</strong> {result.teacher.email}</p>
                {result.teacher.generatedPassword && (
                  <p>
                    <strong>Mật khẩu:</strong> 
                    <span className="ml-2 font-mono">
                      {showPasswords ? result.teacher.generatedPassword : '••••••••'}
                    </span>
                  </p>
                )}
                {result.teacher.isNew && (
                  <Badge variant="outline" className="mt-2">Tài khoản mới</Badge>
                )}
              </div>
            </div>
          )}

          {/* Students Login */}
          <div className="space-y-2">
            <h4 className="font-medium">Học sinh ({successCount})</h4>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {result.students.map((student, index) => {
                if (!student.success || !student.created) return null;
                
                return (
                  <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 text-sm">
                        <p><strong>{student.created.fullname}</strong></p>
                        <p className="text-gray-600">{student.created.email}</p>
                        {student.created.generatedPassword && (
                          <p className="font-mono text-xs">
                            {showPasswords ? student.created.generatedPassword : '••••••••'}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="default"
                        onClick={() => handleCopyToClipboard(`${student.created!.email}:${student.created!.generatedPassword || 'N/A'}`)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Errors */}
      {errorCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Lỗi ({errorCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {result.errors.map((error, index) => (
                <Alert key={index} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Bước tiếp theo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-blue-500" />
            <span>Gửi thông tin đăng nhập cho giáo viên và học sinh</span>
          </div>
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-green-500" />
            <span>Thêm khóa học và bài tập vào lớp học</span>
          </div>
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-purple-500" />
            <span>Hướng dẫn học sinh tham gia lớp học</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
