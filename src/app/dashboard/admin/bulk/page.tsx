/**
 * Admin Bulk Operations Page
 * Trang chính cho các thao tác hàng loạt
 */

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import AdminHeader from "@/components/admin/AdminHeader";
import AnimatedSection from "@/components/admin/AnimatedSection";
import BulkClassroomWizard from "@/components/admin/bulk/BulkClassroomWizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Zap, 
  Users, 
  BookOpen, 
  Plus,
  History,
  Download,
  Upload,
  Sparkles,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { BulkClassroomResult } from "@/types/bulk-operations";

type BulkOperationType = 'classroom' | 'users' | 'courses' | null;

export default function AdminBulkPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const [selectedOperation, setSelectedOperation] = useState<BulkOperationType>(null);
  const [completedOperations, setCompletedOperations] = useState<BulkClassroomResult[]>([]);

  const handleOperationComplete = (result: BulkClassroomResult) => {
    setCompletedOperations(prev => [result, ...prev]);
    // Có thể redirect hoặc show success message
  };

  const handleBackToMenu = () => {
    setSelectedOperation(null);
  };

  // Nếu đang trong wizard, hiển thị wizard
  if (selectedOperation === 'classroom') {
    return (
      <AnimatedSection className="space-y-6">
        <AdminHeader 
          userRole={role || ""} 
          title="Tạo lớp học hàng loạt"
        />
        
        <BulkClassroomWizard
          onComplete={handleOperationComplete}
          onCancel={handleBackToMenu}
        />
      </AnimatedSection>
    );
  }

  // Main menu
  return (
    <AnimatedSection className="space-y-6">
      <AdminHeader userRole={role || ""} title="Thao tác hàng loạt" />

      {/* Header Description */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-violet-100 rounded-full">
              <Zap className="h-8 w-8 text-violet-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Tạo và quản lý hàng loạt
              </h2>
              <p className="text-gray-600 mt-1">
                Tiết kiệm thời gian với các thao tác tạo nhiều đối tượng cùng lúc
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {completedOperations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Thống kê gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {completedOperations.reduce((sum, op) => sum + op.summary.successCount, 0)}
                </p>
                <p className="text-sm text-green-700">Học sinh đã tạo</p>
              </div>
              <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{completedOperations.length}</p>
                <p className="text-sm text-blue-700">Lớp học đã tạo</p>
              </div>
              <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {completedOperations.reduce((sum, op) => sum + op.parentLinks.length, 0)}
                </p>
                <p className="text-sm text-purple-700">Liên kết phụ huynh</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Bulk Classroom Creation */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-violet-600" />
              Tạo lớp học hàng loạt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 text-sm">
              Tạo lớp học mới với giáo viên và nhiều học sinh cùng lúc. 
              Hỗ trợ upload CSV và nhập thủ công.
            </p>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">CSV Upload</Badge>
              <Badge variant="outline">Auto Password</Badge>
              <Badge variant="outline">Duplicate Check</Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Tự động tạo mật khẩu</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Validation và duplicate check</span>
              </div>
            </div>

            <Button 
              onClick={() => setSelectedOperation('classroom')}
              className="w-full group-hover:bg-violet-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Bắt đầu tạo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Bulk User Creation - Coming Soon */}
        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Tạo người dùng hàng loạt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 text-sm">
              Tạo nhiều tài khoản người dùng cùng lúc với các vai trò khác nhau.
              Hỗ trợ giáo viên, học sinh, phụ huynh.
            </p>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Multi-Role</Badge>
              <Badge variant="outline">CSV Import</Badge>
              <Badge variant="outline">Email Notify</Badge>
            </div>

            <Button variant="outline" disabled className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              Sắp ra mắt
            </Button>
          </CardContent>
        </Card>

        {/* Bulk Course Creation - Coming Soon */}
        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              Tạo khóa học hàng loạt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 text-sm">
              Tạo nhiều khóa học và bài học cùng lúc. 
              Import từ template hoặc file cấu trúc.
            </p>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Template</Badge>
              <Badge variant="outline">Lessons</Badge>
              <Badge variant="outline">Assignments</Badge>
            </div>

            <Button variant="outline" disabled className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              Sắp ra mắt
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Templates và hướng dẫn
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Tải xuống các file template để chuẩn bị dữ liệu cho việc import hàng loạt
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Template học sinh</p>
                  <p className="text-sm text-gray-500">CSV với email, họ tên</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="default"
                onClick={async () => {
                  const response = await fetch('/api/admin/bulk/templates?type=student');
                  if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'student-template.csv';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  }
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Template giáo viên</p>
                  <p className="text-sm text-gray-500">CSV với email, họ tên</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="default"
                onClick={async () => {
                  const response = await fetch('/api/admin/bulk/templates?type=teacher');
                  if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'teacher-template.csv';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  }
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Operations */}
      {completedOperations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Thao tác gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedOperations.slice(0, 5).map((operation, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-violet-600" />
                    <div>
                      <p className="font-medium">{operation.classroom?.name || 'Lớp học'}</p>
                      <p className="text-sm text-gray-500">
                        {operation.summary.successCount} học sinh • 
                        {operation.parentLinks.length} liên kết PH • 
                        {Math.round(operation.summary.duration / 1000)}s
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {operation.success ? 'Thành công' : 'Có lỗi'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          <strong>Mẹo:</strong> Chuẩn bị file CSV với đầy đủ thông tin trước khi bắt đầu. 
          Kiểm tra định dạng email và tránh trùng lặp để quá trình import diễn ra mượt mà.
        </AlertDescription>
      </Alert>
    </AnimatedSection>
  );
}
