"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Monitor, 
  Users, 
  Clock, 
  AlertTriangle, 
  RefreshCw,
  Settings,
  Eye,
  Shield,
  Play,
  Pause,
  StopCircle,
  Plus,
  CheckCircle,
  WifiOff,
  BarChart3
} from "lucide-react";

// Mock data đơn giản cho UI
const mockStudentSessions = [
  {
    id: "1",
    studentName: "Nguyễn Văn A",
    assignmentTitle: "Kiểm tra Toán học",
    status: "IN_PROGRESS",
    startTime: "14:30",
    timeRemaining: "25:30",
    progress: 60,
    currentQuestion: 8,
    totalQuestions: 15,
    suspiciousActivities: 2,
    isOnline: true
  },
  {
    id: "2", 
    studentName: "Trần Thị B",
    assignmentTitle: "Kiểm tra Toán học",
    status: "PAUSED",
    startTime: "14:15",
    timeRemaining: "10:45",
    progress: 40,
    currentQuestion: 6,
    totalQuestions: 15,
    suspiciousActivities: 0,
    isOnline: false
  },
  {
    id: "3",
    studentName: "Lê Văn C", 
    assignmentTitle: "Kiểm tra Toán học",
    status: "COMPLETED",
    startTime: "14:00",
    timeRemaining: "00:00",
    progress: 100,
    currentQuestion: 15,
    totalQuestions: 15,
    suspiciousActivities: 1,
    isOnline: true
  }
];

/**
 * Trang giám sát thi trực tuyến cho giáo viên
 * URL: /dashboard/teacher/exams/monitor
 */
export default function ExamMonitorPage() {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  // Stats tính từ mock data
  const activeCount = mockStudentSessions.filter(s => s.status === 'IN_PROGRESS').length;
  const pausedCount = mockStudentSessions.filter(s => s.status === 'PAUSED').length;
  const completedCount = mockStudentSessions.filter(s => s.status === 'COMPLETED').length;
  const totalSuspicious = mockStudentSessions.reduce((sum, s) => sum + s.suspiciousActivities, 0);

  // Auto refresh
  useEffect(() => {
    if (!isAutoRefresh) return;
    const interval = setInterval(() => {
      console.log("Refreshing exam sessions...");
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoRefresh]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Badge variant="default" className="bg-green-100 text-green-800">Đang thi</Badge>;
      case 'PAUSED':
        return <Badge variant="warning" className="bg-yellow-100 text-yellow-800">Tạm dừng</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Hoàn thành</Badge>;
      default:
        return <Badge variant="outline">Không xác định</Badge>;
    }
  };

  const handleExtendTime = (studentId: string) => {
    console.log("Extending time for student:", studentId);
    // Implement extend time logic
  };

  const handleTerminateSession = (studentId: string) => {
    console.log("Terminating session for student:", studentId);
    // Implement terminate logic
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Monitor className="w-8 h-8 text-blue-600" />
                Giám Sát Thi Trực Tuyến
              </h1>
              <p className="text-gray-600 mt-1">
                Theo dõi và quản lý các phiên thi đang diễn ra
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Làm mới
              </Button>
              
              <Button className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Cài đặt
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Đang thi</p>
                  <p className="text-2xl font-bold text-green-600">{activeCount}</p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tạm dừng</p>
                  <p className="text-2xl font-bold text-yellow-600">{pausedCount}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Hoạt động đáng ngờ</p>
                  <p className="text-2xl font-bold text-red-600">{totalSuspicious}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng phiên</p>
                  <p className="text-2xl font-bold text-blue-600">{mockStudentSessions.length}</p>
                </div>
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="monitoring" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="monitoring">Giám sát</TabsTrigger>
            <TabsTrigger value="controls">Điều khiển</TabsTrigger>
            <TabsTrigger value="analytics">Phân tích</TabsTrigger>
          </TabsList>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Danh sách học sinh đang thi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockStudentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedStudent(session.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {session.isOnline ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <WifiOff className="w-5 h-5 text-red-500" />
                          )}
                          <div>
                            <h3 className="font-medium">{session.studentName}</h3>
                            <p className="text-sm text-gray-600">{session.assignmentTitle}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Tiến độ</p>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${session.progress}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{session.progress}%</span>
                          </div>
                        </div>

                        <div className="text-center">
                          <p className="text-sm text-gray-600">Thời gian còn lại</p>
                          <p className="font-medium">{session.timeRemaining}</p>
                        </div>

                        <div className="text-center">
                          <p className="text-sm text-gray-600">Câu hỏi</p>
                          <p className="font-medium">{session.currentQuestion}/{session.totalQuestions}</p>
                        </div>

                        <div className="text-center">
                          <p className="text-sm text-gray-600">Cảnh báo</p>
                          <Badge variant={session.suspiciousActivities > 0 ? "destructive" : "outline"}>
                            {session.suspiciousActivities}
                          </Badge>
                        </div>

                        <div>
                          {getStatusBadge(session.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Controls Tab */}
          <TabsContent value="controls">
            {selectedStudent ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Điều khiển phiên thi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {(() => {
                    const student = mockStudentSessions.find(s => s.id === selectedStudent);
                    if (!student) return null;

                    return (
                      <div>
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                          <h3 className="font-medium text-blue-900">{student.studentName}</h3>
                          <p className="text-blue-700">{student.assignmentTitle}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Gia hạn thời gian</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div>
                                <Label htmlFor="extend-minutes">Số phút gia hạn</Label>
                                <Input id="extend-minutes" type="number" placeholder="15" />
                              </div>
                              <div>
                                <Label htmlFor="extend-reason">Lý do</Label>
                                <Input id="extend-reason" placeholder="Sự cố kỹ thuật..." />
                              </div>
                              <Button 
                                onClick={() => handleExtendTime(student.id)}
                                className="w-full"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Gia hạn thời gian
                              </Button>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Hành động khẩn cấp</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <Button variant="outline" className="w-full">
                                <Pause className="w-4 h-4 mr-2" />
                                Tạm dừng phiên thi
                              </Button>
                              <Button variant="outline" className="w-full">
                                <Play className="w-4 h-4 mr-2" />
                                Tiếp tục phiên thi
                              </Button>
                              <Button 
                                variant="outline" 
                                className="w-full border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => handleTerminateSession(student.id)}
                              >
                                <StopCircle className="w-4 h-4 mr-2" />
                                Chấm dứt phiên thi
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Chọn học sinh để điều khiển
                  </h3>
                  <p className="text-gray-600">
                    Vui lòng chọn một học sinh từ tab Giám sát để sử dụng các công cụ điều khiển
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Phân tích và Báo cáo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Tính năng phân tích
                  </h3>
                  <p className="text-gray-600">
                    Báo cáo chi tiết và phân tích dữ liệu thi sẽ được phát triển trong phiên bản tiếp theo
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
