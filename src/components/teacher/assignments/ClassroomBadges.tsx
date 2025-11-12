"use client"

import { useEffect, useState } from "react"

/**
 * Interface cho classroom data từ API
 */
interface ClassroomInfo {
  classroomId: string
  classroomName: string
  classroomCode: string
  classroomIcon: string
  studentCount: number
  submissionCount: number
  assignedAt: string
  color: string
}

/**
 * Props cho ClassroomBadges component
 */
interface ClassroomBadgesProps {
  assignmentId: string
  maxVisible?: number // Số lượng badges hiển thị tối đa
}

/**
 * Component hiển thị classroom badges cho assignment
 */
export default function ClassroomBadges({ 
  assignmentId, 
  maxVisible = 3 
}: ClassroomBadgesProps) {
  const [classrooms, setClassrooms] = useState<ClassroomInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/assignments/${assignmentId}/classrooms`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch classrooms')
        }

        const data = await response.json()
        if (data.success) {
          setClassrooms(data.data)
        } else {
          throw new Error(data.message || 'Unknown error')
        }
      } catch (error) {
        console.error('[ClassroomBadges] Error fetching classrooms:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    if (assignmentId) {
      fetchClassrooms()
    }
  }, [assignmentId])

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-pulse bg-gray-200 rounded-md h-6 w-16"></div>
        <div className="animate-pulse bg-gray-200 rounded-md h-6 w-16"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-xs text-red-500">
        Lỗi tải lớp học
      </div>
    )
  }

  if (classrooms.length === 0) {
    return (
      <div className="text-xs text-gray-400 italic">
        ⚠️ Chưa thêm vào lớp nào
      </div>
    )
  }

  const visibleClassrooms = classrooms.slice(0, maxVisible)
  const remainingCount = classrooms.length - maxVisible

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visibleClassrooms.map(classroom => (
        <div
          key={classroom.classroomId}
          className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs"
          title={`${classroom.classroomName} - ${classroom.submissionCount}/${classroom.studentCount} đã nộp`}
        >
          <span className="text-sm">{classroom.classroomIcon}</span>
          <span className="font-medium text-gray-700">
            {classroom.classroomName}
          </span>
          <span className="text-gray-500">
            ({classroom.submissionCount}/{classroom.studentCount})
          </span>
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div
          className="px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-500"
          title={`Còn ${remainingCount} lớp khác`}
        >
          +{remainingCount} lớp khác
        </div>
      )}
    </div>
  )
}
