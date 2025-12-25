/**
 * Exam Monitoring Dashboard
 * Dashboard real-time cho giáo viên giám sát các phiên thi
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Pause, 
  Play,
  WifiOff,
  Eye,
  BarChart3,
  RefreshCw,
  Download,
  Settings
} from 'lucide-react'
import { ExamSession } from '@/types/exam-system'
import { formatTime } from '@/lib/exam-session/personal-timer'

interface ExamMonitoringDashboardProps {
  assignmentId: string
  className?: string
}

// Mock data - trong thực tế sẽ fetch từ API
const mockSessions: ExamSession[] = [
  {
    id: 'session-1',
    assignmentId: 'assignment-1',
    studentId: 'student-1',
    status: 'IN_PROGRESS',
    startTime: new Date(Date.now() - 1800000), // 30 phút trước
    expectedEndTime: new Date(Date.now() + 1800000), // 30 phút nữa
    timeRemaining: 1800,
    currentQuestionIndex: 5,
    questionOrder: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'],
    optionOrders: {},
    answers: { q1: 'A', q2: 'B', q3: ['A', 'C'], q4: 'D', q5: 'A' },
    disconnectCount: 1,
    totalGraceTime: 180,
    antiCheatConfig: { shuffleQuestions: true, shuffleOptions: false, singleQuestionMode: false, requireFullscreen: false, detectTabSwitch: false, disableCopyPaste: false, preset: 'BASIC' },
    metadata: {
      userAgent: 'Chrome/91.0',
      ipAddress: '192.168.1.100',
      screenResolution: '1920x1080',
      timezone: 'Asia/Ho_Chi_Minh'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'session-2',
    assignmentId: 'assignment-1',
    studentId: 'student-2',
    status: 'PAUSED',
    startTime: new Date(Date.now() - 2400000), // 40 phút trước
    expectedEndTime: new Date(Date.now() + 1200000), // 20 phút nữa
    timeRemaining: 1200,
    currentQuestionIndex: 3,
    questionOrder: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'],
    optionOrders: {},
    answers: { q1: 'B', q2: 'A', q3: 'C' },
    disconnectCount: 3,
    totalGraceTime: 300,
    antiCheatConfig: { shuffleQuestions: true, shuffleOptions: false, singleQuestionMode: false, requireFullscreen: false, detectTabSwitch: false, disableCopyPaste: false, preset: 'BASIC' },
    metadata: {
      userAgent: 'Firefox/89.0',
      ipAddress: '192.168.1.101',
      screenResolution: '1366x768',
      timezone: 'Asia/Ho_Chi_Minh'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

export default function ExamMonitoringDashboard({
  assignmentId,
  className = ''
}: ExamMonitoringDashboardProps) {
  const [sessions, setSessions] = useState<ExamSession[]>(mockSessions)
  const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5000) // 5 seconds

  // Auto refresh data
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // TODO: Fetch real data from API
      console.log('Refreshing exam data...')
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  // Calculate statistics
  const stats = {
    totalStudents: sessions.length,
    activeStudents: sessions.filter(s => s.status === 'IN_PROGRESS').length,
    pausedStudents: sessions.filter(s => s.status === 'PAUSED').length,
    completedStudents: sessions.filter(s => s.status === 'COMPLETED').length,
    suspiciousActivities: sessions.filter(s => s.disconnectCount > 2).length,
    averageProgress: sessions.length > 0 
      ? Math.round(sessions.reduce((sum, s) => sum + ((s.currentQuestionIndex + 1) / s.questionOrder.length * 100), 0) / sessions.length)
      : 0
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800'
      case 'PAUSED': return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800'
      case 'TERMINATED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return <Play className="w-3 h-3" />
      case 'PAUSED': return <Pause className="w-3 h-3" />
      case 'COMPLETED': return <CheckCircle className="w-3 h-3" />
      case 'TERMINATED': return <AlertTriangle className="w-3 h-3" />
      default: return <Clock className="w-3 h-3" />
    }
  }

  const getSuspiciousLevel = (session: ExamSession) => {
    if (session.disconnectCount > 3) return 'high'
    if (session.disconnectCount > 1) return 'medium'
    return 'low'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Giám Sát Thi Trực Tuyến</h1>
          <p className="text-gray-600">Theo dõi real-time các phiên thi của học sinh</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50' : ''}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Đang cập nhật' : 'Tạm dừng'}
          </Button>
          
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Xuất báo cáo
          </Button>
          
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Cài đặt
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Tổng học sinh</p>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Đang làm bài</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Pause className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Tạm dừng</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pausedStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Hoàn thành</p>
                <p className="text-2xl font-bold text-blue-600">{stats.completedStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Nghi ngờ</p>
                <p className="text-2xl font-bold text-red-600">{stats.suspiciousActivities}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Tiến độ TB</p>
                <p className="text-2xl font-bold text-purple-600">{stats.averageProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="students">Danh sách học sinh</TabsTrigger>
          <TabsTrigger value="suspicious">Hoạt động nghi ngờ</TabsTrigger>
          <TabsTrigger value="analytics">Phân tích</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-green-500" />
                  Phiên thi đang hoạt động
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sessions.filter(s => s.status === 'IN_PROGRESS').map(session => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Học sinh {session.studentId}</p>
                        <p className="text-sm text-gray-600">
                          Câu {session.currentQuestionIndex + 1}/{session.questionOrder.length}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm">{formatTime(session.timeRemaining)}</p>
                        <p className="text-xs text-gray-500">
                          {Math.round((session.currentQuestionIndex + 1) / session.questionOrder.length * 100)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  Hoạt động gần đây
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-2 border-l-4 border-green-500 bg-green-50">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <div className="flex-1">
                      <p className="text-sm">Học sinh student-3 đã hoàn thành bài thi</p>
                      <p className="text-xs text-gray-500">2 phút trước</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-2 border-l-4 border-yellow-500 bg-yellow-50">
                    <WifiOff className="w-4 h-4 text-yellow-500" />
                    <div className="flex-1">
                      <p className="text-sm">Học sinh student-2 bị disconnect</p>
                      <p className="text-xs text-gray-500">5 phút trước</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-2 border-l-4 border-blue-500 bg-blue-50">
                    <Play className="w-4 h-4 text-blue-500" />
                    <div className="flex-1">
                      <p className="text-sm">Học sinh student-4 bắt đầu làm bài</p>
                      <p className="text-xs text-gray-500">8 phút trước</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách học sinh</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Học sinh</th>
                      <th className="text-left p-2">Trạng thái</th>
                      <th className="text-left p-2">Tiến độ</th>
                      <th className="text-left p-2">Thời gian còn lại</th>
                      <th className="text-left p-2">Disconnect</th>
                      <th className="text-left p-2">Nghi ngờ</th>
                      <th className="text-left p-2">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(session => (
                      <tr key={session.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div>
                            <p className="font-medium">{session.studentId}</p>
                            <p className="text-xs text-gray-500">{session.metadata.ipAddress}</p>
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge className={getStatusColor(session.status)}>
                            {getStatusIcon(session.status)}
                            <span className="ml-1">{session.status}</span>
                          </Badge>
                        </td>
                        <td className="p-2">
                          <div>
                            <p className="text-sm">
                              {session.currentQuestionIndex + 1}/{session.questionOrder.length}
                            </p>
                            <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ 
                                  width: `${(session.currentQuestionIndex + 1) / session.questionOrder.length * 100}%` 
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <p className="font-mono text-sm">{formatTime(session.timeRemaining)}</p>
                        </td>
                        <td className="p-2">
                          <Badge variant={session.disconnectCount > 2 ? "destructive" : "outline"}>
                            {session.disconnectCount}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge 
                            variant={
                              getSuspiciousLevel(session) === 'high' ? 'destructive' :
                              getSuspiciousLevel(session) === 'medium' ? 'default' : 'outline'
                            }
                          >
                            {getSuspiciousLevel(session)}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <Button variant="outline" onClick={() => setSelectedSession(session)}>
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suspicious Tab */}
        <TabsContent value="suspicious">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Hoạt động nghi ngờ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.filter(s => s.disconnectCount > 2).map(session => (
                  <div key={session.id} className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-red-800">Học sinh {session.studentId}</h4>
                      <Badge variant="destructive">Mức độ cao</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Số lần disconnect: <span className="font-medium">{session.disconnectCount}</span></p>
                        <p className="text-gray-600">Grace time: <span className="font-medium">{session.totalGraceTime}s</span></p>
                      </div>
                      <div>
                        <p className="text-gray-600">IP: <span className="font-medium">{session.metadata.ipAddress}</span></p>
                        <p className="text-gray-600">Browser: <span className="font-medium">{session.metadata.userAgent}</span></p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline">Xem chi tiết</Button>
                      <Button variant="outline">Chấm dứt</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Phân bố trạng thái</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Đang làm bài</span>
                    <span className="font-medium">{stats.activeStudents}/{stats.totalStudents}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tạm dừng</span>
                    <span className="font-medium">{stats.pausedStudents}/{stats.totalStudents}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Hoàn thành</span>
                    <span className="font-medium">{stats.completedStudents}/{stats.totalStudents}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Thống kê disconnect</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Không disconnect</span>
                    <span className="font-medium">
                      {sessions.filter(s => s.disconnectCount === 0).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>1-2 lần</span>
                    <span className="font-medium">
                      {sessions.filter(s => s.disconnectCount >= 1 && s.disconnectCount <= 2).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>3+ lần</span>
                    <span className="font-medium text-red-600">
                      {sessions.filter(s => s.disconnectCount > 2).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
