"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bug, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react'

import { AssignmentData, ValidationState } from '@/types/assignment-builder'
import { 
  debugAssignmentData,
  debugValidation,
  autoFixTimeSettings,
  debugTimeSettings,
  isDebugMode,
  enableDebugMode
} from '@/lib/assignment-builder/debug'

interface DebugPanelProps {
  assignmentData: AssignmentData
  validation: ValidationState
  onDataChange: (data: AssignmentData) => void
  onValidate: () => void
}

export default function DebugPanel({ 
  assignmentData, 
  validation, 
  onDataChange,
  onValidate 
}: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [debugEnabled, setDebugEnabled] = useState(isDebugMode())

  // Chỉ hiển thị trong development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const handleEnableDebug = () => {
    enableDebugMode()
    setDebugEnabled(true)
  }

  const handleAutoFix = () => {
    try {
      const fixedTimeSettings = autoFixTimeSettings(assignmentData.timeSettings)
      const fixedData = { ...assignmentData, timeSettings: fixedTimeSettings }
      onDataChange(fixedData)
      onValidate()
    } catch (error) {
      console.error('Auto-fix failed:', error)
    }
  }

  const handleDebugAll = () => {
    debugAssignmentData(assignmentData)
    debugValidation(assignmentData)
    debugTimeSettings(assignmentData.timeSettings)
  }

  const getValidationIcon = () => {
    if (validation.isValid) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    }
    if (validation.globalErrors.length > 0) {
      return <XCircle className="w-4 h-4 text-red-500" />
    }
    return <AlertTriangle className="w-4 h-4 text-yellow-500" />
  }

  const getValidationColor = () => {
    if (validation.isValid) return 'bg-green-50 border-green-200'
    if (validation.globalErrors.length > 0) return 'bg-red-50 border-red-200'
    return 'bg-yellow-50 border-yellow-200'
  }

  return (
    <Card className={`border-2 border-dashed ${getValidationColor()}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4" />
            Debug Panel
            {getValidationIcon()}
          </div>
          <div className="flex items-center gap-2">
            {!debugEnabled && (
              <Button
                size="default"
                variant="outline"
                onClick={handleEnableDebug}
                className="h-6 px-2 text-xs"
              >
                Enable Debug
              </Button>
            )}
            <Button
              size="default"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 px-1"
            >
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="p-2 bg-white rounded border">
              <div className="font-medium">Title</div>
              <Badge variant={assignmentData.title ? "default" : "destructive"} className="text-xs">
                {assignmentData.title ? "✓" : "✗"}
              </Badge>
            </div>
            <div className="p-2 bg-white rounded border">
              <div className="font-medium">Type</div>
              <Badge variant="outline" className="text-xs">
                {assignmentData.type}
              </Badge>
            </div>
            <div className="p-2 bg-white rounded border">
              <div className="font-medium">Due Date</div>
              <Badge variant={assignmentData.timeSettings.dueDate ? "default" : "destructive"} className="text-xs">
                {assignmentData.timeSettings.dueDate ? "✓" : "✗"}
              </Badge>
            </div>
            <div className="p-2 bg-white rounded border">
              <div className="font-medium">Content</div>
              <Badge 
                variant={
                  assignmentData.type === 'QUIZ' 
                    ? (assignmentData.quizQuestions?.length || 0) > 0 ? "default" : "destructive"
                    : assignmentData.essayQuestion?.content ? "default" : "destructive"
                } 
                className="text-xs"
              >
                {assignmentData.type === 'QUIZ' 
                  ? `${assignmentData.quizQuestions?.length || 0} Q`
                  : assignmentData.essayQuestion?.content ? "✓" : "✗"
                }
              </Badge>
            </div>
          </div>

          {/* Validation Status */}
          <div className="p-3 bg-white rounded border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Validation Status</span>
              <Badge variant={validation.isValid ? "default" : "destructive"}>
                {validation.isValid ? "Valid" : "Invalid"}
              </Badge>
            </div>
            
            {validation.globalErrors.length > 0 && (
              <div className="mb-2">
                <div className="text-xs font-medium text-red-700 mb-1">Errors:</div>
                <ul className="text-xs text-red-600 space-y-1">
                  {validation.globalErrors.map((error, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {validation.warnings.length > 0 && (
              <div>
                <div className="text-xs font-medium text-yellow-700 mb-1">Warnings:</div>
                <ul className="text-xs text-yellow-600 space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Time Settings Debug */}
          <div className="p-3 bg-white rounded border">
            <div className="text-sm font-medium mb-2">Time Settings</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-medium">Due:</span>
                <div className="text-gray-600 truncate">
                  {assignmentData.timeSettings.dueDate || 'Not set'}
                </div>
              </div>
              <div>
                <span className="font-medium">Open:</span>
                <div className="text-gray-600 truncate">
                  {assignmentData.timeSettings.openAt || 'Not set'}
                </div>
              </div>
              <div>
                <span className="font-medium">Lock:</span>
                <div className="text-gray-600 truncate">
                  {assignmentData.timeSettings.lockAt || 'Not set'}
                </div>
              </div>
              <div>
                <span className="font-medium">Limit:</span>
                <div className="text-gray-600 truncate">
                  {assignmentData.timeSettings.timeLimitMinutes || 'No limit'}
                </div>
              </div>
            </div>
          </div>

          {/* Debug Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="default"
              variant="outline"
              onClick={handleDebugAll}
              className="text-xs h-7"
            >
              <Bug className="w-3 h-3 mr-1" />
              Debug All
            </Button>
            
            <Button
              size="default"
              variant="outline"
              onClick={onValidate}
              className="text-xs h-7"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Re-validate
            </Button>
            
            {!validation.isValid && (
              <Button
                size="default"
                variant="outline"
                onClick={handleAutoFix}
                className="text-xs h-7"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Auto Fix
              </Button>
            )}
            
            <Button
              size="default"
              variant="outline"
              onClick={() => console.log('Assignment Data:', assignmentData)}
              className="text-xs h-7"
            >
              Log Data
            </Button>
          </div>

          {/* Raw Data Preview */}
          <details className="text-xs">
            <summary className="cursor-pointer font-medium mb-2">Raw Data</summary>
            <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-32 text-xs">
              {JSON.stringify(assignmentData, null, 2)}
            </pre>
          </details>
        </CardContent>
      )}
    </Card>
  )
}
