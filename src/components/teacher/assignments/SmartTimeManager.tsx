"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, Clock, Timer, AlertCircle, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { TimeSettings } from '@/types/assignment-builder'
import { 
  formatDateTimeForAPI, 
  formatDateTimeForInput, 
  getVietnamTime, 
  formatDisplayTime as formatDisplayTimeUtil,
  logDateTimeOperation 
} from '@/lib/datetime-utils'

interface SmartTimeManagerProps {
  timeSettings: TimeSettings
  onTimeSettingsChange: (settings: TimeSettings) => void
  className?: string
}

/**
 * Preset thời gian đơn giản
 */
const SIMPLE_PRESETS = [
  { 
    name: "⚡ Thi ngay 15 phút", 
    openNow: true, 
    durationMinutes: 15,
    description: "Mở ngay, 15 phút làm bài"
  },
  { 
    name: "⚡ Thi ngay 30 phút", 
    openNow: true, 
    durationMinutes: 30,
    description: "Mở ngay, 30 phút làm bài"
  },
  { 
    name: "⚡ Thi ngay 45 phút", 
    openNow: true, 
    durationMinutes: 45,
    description: "Mở ngay, 45 phút làm bài"
  },
  { 
    name: "📅 Bài tập 1 ngày", 
    openNow: true, 
    daysFromNow: 1,
    description: "Mở ngay, hạn nộp 1 ngày"
  },
  { 
    name: "📅 Bài tập 1 tuần", 
    openNow: true, 
    daysFromNow: 7,
    description: "Mở ngay, hạn nộp 1 tuần"
  },
  { 
    name: "🏠 Bài tập về nhà", 
    openNow: true, 
    daysFromNow: 30,
    description: "Mở ngay, hạn nộp 1 tháng"
  }
]

/**
 * Format thời gian cho input datetime-local (wrapper)
 */
const formatForInput = (date: Date): string => {
  return formatDateTimeForInput(date.toISOString())
}

export default function SmartTimeManager({ 
  timeSettings, 
  onTimeSettingsChange, 
  className = '' 
}: SmartTimeManagerProps) {
  const { toast } = useToast()
  const [selectedPreset, setSelectedPreset] = useState<any>(null)

  /**
   * Áp dụng preset
   */
  const applyPreset = (preset: any) => {
    try {
      const now = getVietnamTime()
      let dueDate: Date
      let openAt = now
      
      if (preset.durationMinutes) {
        // Thi ngay - có thời gian làm bài
        dueDate = new Date(now.getTime() + (preset.durationMinutes * 60 * 1000))
      } else if (preset.daysFromNow) {
        // Bài tập theo lịch - có deadline
        dueDate = new Date(now.getTime() + (preset.daysFromNow * 24 * 60 * 60 * 1000))
        // Set giờ hành chính cho deadline
        if (preset.daysFromNow === 1) {
          dueDate.setHours(23, 59, 0, 0) // Ngày mai 23:59
        } else {
          dueDate.setHours(17, 0, 0, 0) // 17:00
        }
      } else {
        return
      }

      const newSettings: TimeSettings = {
        openAt: formatForInput(openAt),
        dueDate: formatForInput(dueDate),
        lockAt: formatForInput(dueDate), // Khóa khi đến deadline
        timeLimitMinutes: preset.durationMinutes ? preset.durationMinutes.toString() : ''
      }

      setSelectedPreset(preset)
      onTimeSettingsChange(newSettings)
      
      toast({
        title: "Áp dụng thành công",
        description: `Đã thiết lập "${preset.name}"`
      })
    } catch (error) {
      console.error('Error applying preset:', error)
      toast({
        title: "Lỗi",
        description: "Không thể áp dụng preset",
        variant: "destructive"
      })
    }
  }

  /**
   * Cập nhật thời gian mở bài
   */
  const updateOpenAt = (value: string) => {
    onTimeSettingsChange({
      ...timeSettings,
      openAt: value
    })
  }

  /**
   * Cập nhật hạn nộp
   */
  const updateDueDate = (value: string) => {
    onTimeSettingsChange({
      ...timeSettings,
      dueDate: value,
      lockAt: value // Tự động set lockAt = dueDate
    })
  }

  /**
   * Cập nhật thời gian làm bài
   */
  const updateTimeLimitMinutes = (value: string) => {
    onTimeSettingsChange({
      ...timeSettings,
      timeLimitMinutes: value
    })
  }

  /**
   * Render thông tin hiện tại
   */
  const renderCurrentSettings = () => {
    const hasSettings = timeSettings.openAt || timeSettings.dueDate || timeSettings.timeLimitMinutes

    if (!hasSettings) {
      return (
        <div className="text-gray-500 text-center py-4">
          Chưa thiết lập thời gian
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {timeSettings.openAt && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>Mở bài: {formatDisplayTimeUtil(timeSettings.openAt)}</span>
          </div>
        )}
        
        {timeSettings.dueDate && (
          <div className="flex items-center gap-2 text-orange-600">
            <Calendar className="w-4 h-4" />
            <span>Hạn nộp: {formatDisplayTimeUtil(timeSettings.dueDate)}</span>
          </div>
        )}
        
        {timeSettings.timeLimitMinutes && (
          <div className="flex items-center gap-2 text-blue-600">
            <Timer className="w-4 h-4" />
            <span>Thời gian làm bài: {timeSettings.timeLimitMinutes} phút</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Thiết Lập Thời Gian
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hiển thị cài đặt hiện tại */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-3">Cài đặt hiện tại:</h4>
          {renderCurrentSettings()}
        </div>

        {/* Preset nhanh */}
        <div>
          <Label className="text-base font-medium mb-3 block">Chọn preset nhanh:</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SIMPLE_PRESETS.map((preset, index) => (
              <Button
                key={index}
                variant={selectedPreset?.name === preset.name ? "default" : "outline"}
                onClick={() => applyPreset(preset)}
                className="h-auto p-4 text-left"
              >
                <div>
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-sm text-gray-500">{preset.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Thiết lập thủ công */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Hoặc thiết lập thủ công:</Label>
          
          {/* Thời gian mở bài */}
          <div>
            <Label htmlFor="openAt" className="text-sm font-medium mb-2 block">
              Thời gian mở bài:
            </Label>
            <Input
              id="openAt"
              type="datetime-local"
              value={timeSettings.openAt || ''}
              onChange={(e) => updateOpenAt(e.target.value)}
              min={formatForInput(getVietnamTime())}
            />
          </div>

          {/* Hạn nộp */}
          <div>
            <Label htmlFor="dueDate" className="text-sm font-medium mb-2 block">
              Hạn nộp:
            </Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={timeSettings.dueDate || ''}
              onChange={(e) => updateDueDate(e.target.value)}
              min={timeSettings.openAt || formatForInput(getVietnamTime())}
            />
          </div>

          {/* Thời gian làm bài */}
          <div>
            <Label htmlFor="timeLimitMinutes" className="text-sm font-medium mb-2 block">
              Thời gian làm bài (phút, tùy chọn):
            </Label>
            <Input
              id="timeLimitMinutes"
              type="number"
              placeholder="Ví dụ: 45"
              value={timeSettings.timeLimitMinutes || ''}
              onChange={(e) => updateTimeLimitMinutes(e.target.value)}
              min="1"
              max="600"
            />
          </div>
        </div>

        {/* Lưu ý */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">Lưu ý:</div>
              <ul className="space-y-1 text-xs">
                <li>• Tất cả thời gian được tính theo múi giờ Việt Nam (UTC+7)</li>
                <li>• <strong>Thời gian mở bài:</strong> Khi nào học sinh có thể bắt đầu làm</li>
                <li>• <strong>Hạn nộp:</strong> Deadline cuối cùng, bài sẽ tự động khóa</li>
                <li>• <strong>Thời gian làm bài:</strong> Giới hạn thời gian cho mỗi lượt làm (tùy chọn)</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}