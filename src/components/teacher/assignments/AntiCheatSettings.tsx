/**
 * Anti-Cheat Settings Component
 * UI cho giáo viên cấu hình các tính năng chống gian lận
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Shield, 
  Shuffle, 
  Eye, 
  Clock, 
  Monitor, 
  Copy, 
  AlertTriangle,
  CheckCircle,
  Info,
  Settings,
  Zap,
  Target
} from 'lucide-react'
import { AntiCheatConfig } from '@/types/exam-system'
import { ANTI_CHEAT_PRESETS, ConfigManager } from '@/lib/exam-session/fallback-config'

interface AntiCheatSettingsProps {
  config: AntiCheatConfig
  onConfigChange: (config: AntiCheatConfig) => void
  className?: string
}

export default function AntiCheatSettings({
  config,
  onConfigChange,
  className = ''
}: AntiCheatSettingsProps) {
  const [activePreset, setActivePreset] = useState<string>(config.preset)
  const [validation, setValidation] = useState<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }>({ isValid: true, errors: [], warnings: [] })

  // Validate config khi thay đổi
  useEffect(() => {
    const result = ConfigManager.validateAntiCheatConfig(config)
    setValidation(result)
  }, [config])

  // Áp dụng preset
  const applyPreset = (presetName: keyof typeof ANTI_CHEAT_PRESETS) => {
    const presetConfig = ANTI_CHEAT_PRESETS[presetName]
    setActivePreset(presetName)
    onConfigChange(presetConfig)
  }

  // Cập nhật config field
  const updateConfig = (field: keyof AntiCheatConfig, value: any) => {
    const newConfig = { ...config, [field]: value }
    
    // Nếu thay đổi từ preset, chuyển sang CUSTOM
    if (activePreset !== 'CUSTOM') {
      newConfig.preset = 'CUSTOM'
      setActivePreset('CUSTOM')
    }
    
    onConfigChange(newConfig)
  }

  // Tính security level
  const getSecurityLevel = (): 'low' | 'medium' | 'high' => {
    const enabledFeatures = [
      config.shuffleQuestions,
      config.shuffleOptions,
      config.singleQuestionMode,
      config.requireFullscreen,
      config.detectTabSwitch,
      config.disableCopyPaste
    ].filter(Boolean).length

    if (enabledFeatures >= 4) return 'high'
    if (enabledFeatures >= 2) return 'medium'
    return 'low'
  }

  const securityLevel = getSecurityLevel()

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Cài Đặt Chống Gian Lận
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="presets" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="presets">Mẫu Có Sẵn</TabsTrigger>
              <TabsTrigger value="custom">Tùy Chỉnh</TabsTrigger>
              <TabsTrigger value="preview">Xem Trước</TabsTrigger>
            </TabsList>

            {/* Preset Tab */}
            <TabsContent value="presets" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(ANTI_CHEAT_PRESETS).map(([key, preset]) => (
                  <Card 
                    key={key}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      activePreset === key 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => applyPreset(key as keyof typeof ANTI_CHEAT_PRESETS)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {key === 'BASIC' && <Zap className="w-4 h-4 text-green-500" />}
                          {key === 'MEDIUM' && <Target className="w-4 h-4 text-yellow-500" />}
                          {key === 'ADVANCED' && <Shield className="w-4 h-4 text-red-500" />}
                          {key === 'CUSTOM' && <Settings className="w-4 h-4 text-gray-500" />}
                          <h4 className="font-medium">{key}</h4>
                        </div>
                        {activePreset === key && (
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Shuffle className="w-3 h-3" />
                          <span>Xáo câu hỏi: {preset.shuffleQuestions ? '✓' : '✗'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Shuffle className="w-3 h-3" />
                          <span>Xáo đáp án: {preset.shuffleOptions ? '✓' : '✗'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="w-3 h-3" />
                          <span>Từng câu một: {preset.singleQuestionMode ? '✓' : '✗'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Monitor className="w-3 h-3" />
                          <span>Fullscreen: {preset.requireFullscreen ? '✓' : '✗'}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <Badge 
                          variant={
                            key === 'BASIC' ? 'secondary' :
                            key === 'MEDIUM' ? 'default' :
                            key === 'ADVANCED' ? 'destructive' : 'outline'
                          }
                          className="text-xs"
                        >
                          {key === 'BASIC' && 'Cơ bản'}
                          {key === 'MEDIUM' && 'Trung bình'}
                          {key === 'ADVANCED' && 'Nâng cao'}
                          {key === 'CUSTOM' && 'Tùy chỉnh'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Security Level Indicator */}
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span className="font-medium">Mức độ bảo mật:</span>
                    </div>
                    <Badge 
                      variant={
                        securityLevel === 'high' ? 'destructive' :
                        securityLevel === 'medium' ? 'default' : 'secondary'
                      }
                    >
                      {securityLevel === 'high' && 'Cao'}
                      {securityLevel === 'medium' && 'Trung bình'}
                      {securityLevel === 'low' && 'Thấp'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Custom Tab */}
            <TabsContent value="custom" className="space-y-6">
              {/* Question Shuffling */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shuffle className="w-4 h-4" />
                    Xáo Trộn Câu Hỏi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="shuffle-questions">Xáo thứ tự câu hỏi</Label>
                      <p className="text-sm text-gray-600">
                        Mỗi học sinh sẽ nhận được thứ tự câu hỏi khác nhau
                      </p>
                    </div>
                    <Switch
                      id="shuffle-questions"
                      checked={config.shuffleQuestions}
                      onCheckedChange={(checked) => updateConfig('shuffleQuestions', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="shuffle-options">Xáo thứ tự đáp án</Label>
                      <p className="text-sm text-gray-600">
                        Thứ tự A, B, C, D sẽ khác nhau cho mỗi học sinh
                      </p>
                    </div>
                    <Switch
                      id="shuffle-options"
                      checked={config.shuffleOptions}
                      onCheckedChange={(checked) => updateConfig('shuffleOptions', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Question Display */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Hiển Thị Câu Hỏi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="single-question">Hiển thị từng câu một</Label>
                      <p className="text-sm text-gray-600">
                        Học sinh chỉ thấy 1 câu tại một thời điểm, không thể quay lại
                      </p>
                    </div>
                    <Switch
                      id="single-question"
                      checked={config.singleQuestionMode}
                      onCheckedChange={(checked) => updateConfig('singleQuestionMode', checked)}
                    />
                  </div>

                  {config.singleQuestionMode && (
                    <div className="space-y-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <Label htmlFor="time-per-question">Thời gian mỗi câu (giây)</Label>
                      <Input
                        id="time-per-question"
                        type="number"
                        min="10"
                        max="3600"
                        value={config.timePerQuestion || ''}
                        onChange={(e) => updateConfig('timePerQuestion', parseInt(e.target.value) || undefined)}
                        placeholder="Không giới hạn"
                      />
                      <p className="text-xs text-gray-600">
                        Để trống nếu không muốn giới hạn thời gian mỗi câu
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Browser Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    Kiểm Soát Trình Duyệt
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="fullscreen">Bắt buộc toàn màn hình</Label>
                      <p className="text-sm text-gray-600">
                        Học sinh phải làm bài ở chế độ fullscreen
                      </p>
                    </div>
                    <Switch
                      id="fullscreen"
                      checked={config.requireFullscreen}
                      onCheckedChange={(checked) => updateConfig('requireFullscreen', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="tab-switch">Phát hiện chuyển tab</Label>
                      <p className="text-sm text-gray-600">
                        Cảnh báo khi học sinh chuyển sang tab/ứng dụng khác
                      </p>
                    </div>
                    <Switch
                      id="tab-switch"
                      checked={config.detectTabSwitch}
                      onCheckedChange={(checked) => updateConfig('detectTabSwitch', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="copy-paste">Vô hiệu hóa copy/paste</Label>
                      <p className="text-sm text-gray-600">
                        Không cho phép sao chép và dán nội dung
                      </p>
                    </div>
                    <Switch
                      id="copy-paste"
                      checked={config.disableCopyPaste}
                      onCheckedChange={(checked) => updateConfig('disableCopyPaste', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tóm Tắt Cấu Hình</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Tính năng được bật:</h4>
                      {[
                        { key: 'shuffleQuestions', label: 'Xáo câu hỏi', icon: Shuffle },
                        { key: 'shuffleOptions', label: 'Xáo đáp án', icon: Shuffle },
                        { key: 'singleQuestionMode', label: 'Từng câu một', icon: Eye },
                        { key: 'requireFullscreen', label: 'Fullscreen', icon: Monitor },
                        { key: 'detectTabSwitch', label: 'Phát hiện chuyển tab', icon: AlertTriangle },
                        { key: 'disableCopyPaste', label: 'Vô hiệu copy/paste', icon: Copy }
                      ].map(({ key, label, icon: Icon }) => (
                        <div key={key} className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className={`text-sm ${
                            (config as any)[key] ? 'text-green-600' : 'text-gray-400'
                          }`}>
                            {label}
                          </span>
                          {(config as any)[key] ? (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border border-gray-300" />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Thông tin bổ sung:</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div>Preset: <Badge variant="outline">{config.preset}</Badge></div>
                        {config.timePerQuestion && (
                          <div>Thời gian mỗi câu: {config.timePerQuestion}s</div>
                        )}
                        <div>
                          Mức bảo mật: 
                          <Badge 
                            variant={
                              securityLevel === 'high' ? 'destructive' :
                              securityLevel === 'medium' ? 'default' : 'secondary'
                            }
                            className="ml-2"
                          >
                            {securityLevel === 'high' && 'Cao'}
                            {securityLevel === 'medium' && 'Trung bình'}
                            {securityLevel === 'low' && 'Thấp'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                    <div className="space-y-2">
                      <h4 className="font-medium text-blue-900">Khuyến nghị:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        {!config.shuffleQuestions && !config.shuffleOptions && (
                          <li>• Nên bật ít nhất một tính năng xáo trộn để tăng tính bảo mật</li>
                        )}
                        {config.requireFullscreen && !config.detectTabSwitch && (
                          <li>• Nên bật phát hiện chuyển tab khi yêu cầu fullscreen</li>
                        )}
                        {config.singleQuestionMode && !config.timePerQuestion && (
                          <li>• Có thể đặt giới hạn thời gian cho mỗi câu để tăng hiệu quả</li>
                        )}
                        {securityLevel === 'low' && (
                          <li>• Mức bảo mật thấp - cân nhắc bật thêm các tính năng chống gian lận</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Validation Messages */}
          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="space-y-2">
              {validation.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {validation.errors.map((error, index) => (
                        <div key={index}>• {error}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {validation.warnings.length > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {validation.warnings.map((warning, index) => (
                        <div key={index}>• {warning}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => applyPreset('BASIC')}
            >
              Reset về Cơ bản
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const exported = ConfigManager.exportConfig(
                    { gracePeriodMinutes: 3, maxReconnects: 2, autoApproveGrace: true, autoSaveInterval: 10, suspiciousThreshold: 3, offlineMode: false },
                    config
                  )
                  navigator.clipboard.writeText(exported)
                }}
              >
                Xuất Cấu Hình
              </Button>
              
              <Button
                disabled={!validation.isValid}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Áp Dụng Cài Đặt
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
