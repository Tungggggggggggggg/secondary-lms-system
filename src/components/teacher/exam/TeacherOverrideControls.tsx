/**
 * Teacher Override Controls
 * Các công cụ can thiệp manual cho giáo viên: gia hạn, reset, chấm dứt
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { 
  Clock, 
  RotateCcw, 
  StopCircle, 
  Plus, 
  AlertTriangle,
  CheckCircle,
  User,
  Timer,
  FileText,
  Shield
} from 'lucide-react'
import { ExamSession } from '@/types/exam-system'
import { formatTime } from '@/lib/exam-session/personal-timer'

interface TeacherOverrideControlsProps {
  session: ExamSession
  onExtendTime: (sessionId: string, additionalMinutes: number, reason: string) => Promise<void>
  onResetSession: (sessionId: string, reason: string) => Promise<void>
  onTerminateSession: (sessionId: string, reason: string) => Promise<void>
  onApproveGracePeriod: (gracePeriodId: string, approvedMinutes: number, notes: string) => Promise<void>
  className?: string
}

export default function TeacherOverrideControls({
  session,
  onExtendTime,
  onResetSession,
  onTerminateSession,
  onApproveGracePeriod,
  className = ''
}: TeacherOverrideControlsProps) {
  // Dialog states
  const [showExtendDialog, setShowExtendDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showTerminateDialog, setShowTerminateDialog] = useState(false)
  const [showGraceDialog, setShowGraceDialog] = useState(false)

  // Form states
  const [extendMinutes, setExtendMinutes] = useState(15)
  const [extendReason, setExtendReason] = useState('')
  const [resetReason, setResetReason] = useState('')
  const [terminateReason, setTerminateReason] = useState('')
  const [graceMinutes, setGraceMinutes] = useState(3)
  const [graceNotes, setGraceNotes] = useState('')

  // Loading states
  const [isExtending, setIsExtending] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isTerminating, setIsTerminating] = useState(false)
  const [isApprovingGrace, setIsApprovingGrace] = useState(false)

  // Handle extend time
  const handleExtendTime = async () => {
    if (!extendMinutes || !extendReason.trim()) return

    setIsExtending(true)
    try {
      await onExtendTime(session.id, extendMinutes, extendReason)
      setShowExtendDialog(false)
      setExtendMinutes(15)
      setExtendReason('')
    } catch (error) {
      console.error('Error extending time:', error)
    } finally {
      setIsExtending(false)
    }
  }

  // Handle reset session
  const handleResetSession = async () => {
    if (!resetReason.trim()) return

    setIsResetting(true)
    try {
      await onResetSession(session.id, resetReason)
      setShowResetDialog(false)
      setResetReason('')
    } catch (error) {
      console.error('Error resetting session:', error)
    } finally {
      setIsResetting(false)
    }
  }

  // Handle terminate session
  const handleTerminateSession = async () => {
    if (!terminateReason.trim()) return

    setIsTerminating(true)
    try {
      await onTerminateSession(session.id, terminateReason)
      setShowTerminateDialog(false)
      setTerminateReason('')
    } catch (error) {
      console.error('Error terminating session:', error)
    } finally {
      setIsTerminating(false)
    }
  }

  // Handle approve grace period
  const handleApproveGrace = async () => {
    if (!graceMinutes || !graceNotes.trim()) return

    setIsApprovingGrace(true)
    try {
      await onApproveGracePeriod('mock-grace-id', graceMinutes, graceNotes)
      setShowGraceDialog(false)
      setGraceMinutes(3)
      setGraceNotes('')
    } catch (error) {
      console.error('Error approving grace period:', error)
    } finally {
      setIsApprovingGrace(false)
    }
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

  const canExtendTime = ['IN_PROGRESS', 'PAUSED'].includes(session.status)
  const canReset = ['IN_PROGRESS', 'PAUSED', 'COMPLETED'].includes(session.status)
  const canTerminate = ['IN_PROGRESS', 'PAUSED'].includes(session.status)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Session Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Thông tin phiên thi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <Label className="text-sm text-gray-600">Học sinh</Label>
                <p className="font-medium">{session.studentId}</p>
              </div>
              
              <div>
                <Label className="text-sm text-gray-600">Trạng thái</Label>
                <div className="mt-1">
                  <Badge className={getStatusColor(session.status)}>
                    {session.status}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label className="text-sm text-gray-600">Tiến độ</Label>
                <p className="font-medium">
                  Câu {session.currentQuestionIndex + 1}/{session.questionOrder.length}
                  <span className="text-sm text-gray-500 ml-2">
                    ({Math.round((session.currentQuestionIndex + 1) / session.questionOrder.length * 100)}%)
                  </span>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm text-gray-600">Thời gian còn lại</Label>
                <p className="font-mono text-lg font-medium">{formatTime(session.timeRemaining)}</p>
              </div>
              
              <div>
                <Label className="text-sm text-gray-600">Số lần disconnect</Label>
                <p className="font-medium">
                  {session.disconnectCount}
                  {session.disconnectCount > 2 && (
                    <Badge variant="destructive" className="ml-2">Nghi ngờ</Badge>
                  )}
                </p>
              </div>
              
              <div>
                <Label className="text-sm text-gray-600">Grace time đã dùng</Label>
                <p className="font-medium">{Math.floor(session.totalGraceTime / 60)} phút</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Override Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Công cụ can thiệp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Extend Time */}
            <Button
              onClick={() => setShowExtendDialog(true)}
              disabled={!canExtendTime}
              className="h-auto p-4 flex flex-col items-center gap-2"
              variant="outline"
            >
              <Plus className="w-6 h-6 text-blue-500" />
              <div className="text-center">
                <p className="font-medium">Gia hạn thời gian</p>
                <p className="text-xs text-gray-500">Thêm thời gian làm bài</p>
              </div>
            </Button>

            {/* Grace Period */}
            <Button
              onClick={() => setShowGraceDialog(true)}
              className="h-auto p-4 flex flex-col items-center gap-2"
              variant="outline"
            >
              <Clock className="w-6 h-6 text-green-500" />
              <div className="text-center">
                <p className="font-medium">Phê duyệt grace</p>
                <p className="text-xs text-gray-500">Duyệt thời gian bù</p>
              </div>
            </Button>

            {/* Reset Session */}
            <Button
              onClick={() => setShowResetDialog(true)}
              disabled={!canReset}
              className="h-auto p-4 flex flex-col items-center gap-2"
              variant="outline"
            >
              <RotateCcw className="w-6 h-6 text-orange-500" />
              <div className="text-center">
                <p className="font-medium">Reset phiên thi</p>
                <p className="text-xs text-gray-500">Làm lại từ đầu</p>
              </div>
            </Button>

            {/* Terminate Session */}
            <Button
              onClick={() => setShowTerminateDialog(true)}
              disabled={!canTerminate}
              className="h-auto p-4 flex flex-col items-center gap-2"
              variant="outline"
            >
              <StopCircle className="w-6 h-6 text-red-500" />
              <div className="text-center">
                <p className="font-medium">Chấm dứt</p>
                <p className="text-xs text-gray-500">Kết thúc phiên thi</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Lịch sử can thiệp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Phê duyệt grace period</p>
                <p className="text-xs text-gray-500">Thêm 3 phút do mất kết nối - 10 phút trước</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Plus className="w-4 h-4 text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Gia hạn thời gian</p>
                <p className="text-xs text-gray-500">Thêm 15 phút do sự cố kỹ thuật - 25 phút trước</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Extend Time Dialog */}
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gia hạn thời gian</DialogTitle>
            <DialogDescription>
              Thêm thời gian làm bài cho học sinh {session.studentId}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="extend-minutes">Số phút thêm</Label>
              <Input
                id="extend-minutes"
                type="number"
                min="1"
                max="120"
                value={extendMinutes}
                onChange={(e) => setExtendMinutes(parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div>
              <Label htmlFor="extend-reason">Lý do gia hạn</Label>
              <Textarea
                id="extend-reason"
                placeholder="Nhập lý do gia hạn thời gian..."
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowExtendDialog(false)}>
                Hủy
              </Button>
              <Button 
                onClick={handleExtendTime}
                disabled={!extendMinutes || !extendReason.trim() || isExtending}
              >
                {isExtending ? 'Đang xử lý...' : 'Gia hạn'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grace Period Dialog */}
      <Dialog open={showGraceDialog} onOpenChange={setShowGraceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Phê duyệt Grace Period</DialogTitle>
            <DialogDescription>
              Phê duyệt thời gian bù cho học sinh {session.studentId}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="grace-minutes">Số phút phê duyệt</Label>
              <Input
                id="grace-minutes"
                type="number"
                min="1"
                max="30"
                value={graceMinutes}
                onChange={(e) => setGraceMinutes(parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div>
              <Label htmlFor="grace-notes">Ghi chú</Label>
              <Textarea
                id="grace-notes"
                placeholder="Nhập ghi chú về việc phê duyệt..."
                value={graceNotes}
                onChange={(e) => setGraceNotes(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowGraceDialog(false)}>
                Từ chối
              </Button>
              <Button 
                onClick={handleApproveGrace}
                disabled={!graceMinutes || !graceNotes.trim() || isApprovingGrace}
              >
                {isApprovingGrace ? 'Đang xử lý...' : 'Phê duyệt'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset phiên thi</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="w-4 h-4" />
                Hành động này sẽ xóa tất cả đáp án và reset thời gian
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="reset-reason">Lý do reset</Label>
              <Textarea
                id="reset-reason"
                placeholder="Nhập lý do reset phiên thi..."
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowResetDialog(false)}>
                Hủy
              </Button>
              <Button 
                variant="destructive"
                onClick={handleResetSession}
                disabled={!resetReason.trim() || isResetting}
              >
                {isResetting ? 'Đang reset...' : 'Xác nhận reset'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terminate Dialog */}
      <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chấm dứt phiên thi</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                Hành động này sẽ kết thúc phiên thi và không thể hoàn tác
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="terminate-reason">Lý do chấm dứt</Label>
              <Textarea
                id="terminate-reason"
                placeholder="Nhập lý do chấm dứt phiên thi..."
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTerminateDialog(false)}>
                Hủy
              </Button>
              <Button 
                variant="destructive"
                onClick={handleTerminateSession}
                disabled={!terminateReason.trim() || isTerminating}
              >
                {isTerminating ? 'Đang chấm dứt...' : 'Xác nhận chấm dứt'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
