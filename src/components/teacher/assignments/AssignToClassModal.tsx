"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

/**
 * Interface cho classroom data từ API
 */
interface ClassroomData {
  id: string
  name: string
  description?: string
  code: string
  icon: string
  maxStudents: number
  studentCount: number
  createdAt: string
  color: string
}

/**
 * Props cho AssignToClassModal component
 */
interface AssignToClassModalProps {
  assignmentId: string
  assignmentTitle: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  showSkipOption?: boolean // Hiện nút "Bỏ qua" (cho modal sau khi tạo)
}

/**
 * Component Modal để assign assignment vào classrooms
 * Hiển thị sau khi tạo bài tập mới hoặc khi manually assign
 */
export default function AssignToClassModal({
  assignmentId,
  assignmentTitle,
  isOpen,
  onClose,
  onSuccess,
  showSkipOption = false
}: AssignToClassModalProps) {
  const [classrooms, setClassrooms] = useState<ClassroomData[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const { toast } = useToast()

  // Fetch danh sách classrooms khi modal mở
  useEffect(() => {
    if (isOpen) {
      fetchClassrooms()
    }
  }, [isOpen])

  /**
   * Lấy danh sách classrooms của teacher hiện tại
   */
  const fetchClassrooms = async () => {
    try {
      setFetching(true)
      const res = await fetch('/api/teachers/classrooms')
      
      if (!res.ok) {
        throw new Error('Failed to fetch classrooms')
      }
      
      const data = await res.json()
      if (data.success) {
        setClassrooms(data.data)
      } else {
        throw new Error(data.message || 'Unknown error')
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error)
      toast({ 
        title: 'Không thể tải danh sách lớp học', 
        variant: 'destructive' 
      })
    } finally {
      setFetching(false)
    }
  }

  /**
   * Xử lý khi toggle checkbox của classroom
   */
  const handleToggleClassroom = (classroomId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, classroomId])
    } else {
      setSelectedIds(prev => prev.filter(id => id !== classroomId))
    }
  }

  /**
   * Xử lý khi select/deselect all classrooms
   */
  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(classrooms.map(cls => cls.id))
    } else {
      setSelectedIds([])
    }
  }

  /**
   * Gửi request assign assignment vào các classrooms đã chọn
   */
  const handleAssign = async () => {
    if (selectedIds.length === 0) {
      toast({ 
        title: 'Vui lòng chọn ít nhất một lớp học', 
        variant: 'destructive' 
      })
      return
    }

    try {
      setLoading(true)
      
      const res = await fetch(`/api/assignments/${assignmentId}/assign`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          classroomIds: selectedIds 
        })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Failed to assign')
      }
      
      const data = await res.json()
      
      if (data.success) {
        toast({ 
          title: data.message || `Đã thêm vào ${selectedIds.length} lớp`, 
          variant: 'success' 
        })
        onSuccess?.()
        onClose()
        
        // Reset state
        setSelectedIds([])
      } else {
        throw new Error(data.message || 'Unknown error')
      }
    } catch (error) {
      console.error('Error assigning to classrooms:', error)
      toast({ 
        title: error instanceof Error ? error.message : 'Không thể thêm bài tập vào lớp', 
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Xử lý khi click skip/bỏ qua
   */
  const handleSkip = () => {
    onSuccess?.()
    onClose()
  }

  // Tính tổng số học sinh sẽ nhận được bài tập
  const totalStudents = selectedIds.reduce((sum, id) => {
    const classroom = classrooms.find(c => c.id === id)
    return sum + (classroom?.studentCount || 0)
  }, 0)

  // Kiểm tra tất cả classrooms đã được chọn chưa
  const allSelected = classrooms.length > 0 && selectedIds.length === classrooms.length

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🎉 Thêm bài tập vào lớp học
          </DialogTitle>
          <DialogDescription>
            Bài tập: <span className="font-semibold text-gray-900">{assignmentTitle}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Content area với scroll */}
        <div className="flex-1 overflow-y-auto py-4">
          {fetching ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Đang tải danh sách lớp...</span>
            </div>
          ) : classrooms.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📚</div>
              <p>Bạn chưa tạo lớp học nào</p>
              <p className="text-sm">Hãy tạo lớp học mới trước khi thêm bài tập</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All option */}
              {classrooms.length > 1 && (
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleToggleAll}
                  />
                  <div className="flex-1">
                    <div className="font-medium">Chọn tất cả ({classrooms.length} lớp)</div>
                    <div className="text-sm text-gray-500">
                      {classrooms.reduce((sum, cls) => sum + cls.studentCount, 0)} học sinh
                    </div>
                  </div>
                </label>
              )}

              {/* Classroom list */}
              {classrooms.map(cls => (
                <label 
                  key={cls.id} 
                  className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Checkbox
                    checked={selectedIds.includes(cls.id)}
                    onCheckedChange={(checked) => handleToggleClassroom(cls.id, checked as boolean)}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cls.icon}</span>
                      <div className="font-semibold">{cls.name}</div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Mã lớp: {cls.code} • {cls.studentCount} học sinh
                      {cls.description && ` • ${cls.description}`}
                    </div>
                  </div>
                  
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: cls.color }}
                    title="Màu sắc nhận diện"
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Selected summary */}
        {selectedIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <div className="text-sm text-blue-800">
              💡 Bài tập sẽ gửi đến <strong>{totalStudents} học sinh</strong> trong {selectedIds.length} lớp
            </div>
          </div>
        )}

        {/* Action buttons */}
        <DialogFooter className="gap-2 pt-4">
          {showSkipOption && (
            <Button 
              variant="ghost" 
              onClick={handleSkip}
              disabled={loading}
            >
              Bỏ qua, thêm sau
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={loading}
          >
            Hủy
          </Button>
          
          <Button 
            onClick={handleAssign} 
            disabled={selectedIds.length === 0 || loading || fetching}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Đang thêm...
              </>
            ) : (
              `Thêm vào ${selectedIds.length} lớp`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
