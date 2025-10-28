// Types cho API classroom
export interface CreateClassroomDTO {
  name: string;
  description?: string;
  icon: string;
  maxStudents: number;
}

export interface ClassroomResponse {
  id: string;
  name: string;
  description?: string;
  code: string;
  icon: string;
  maxStudents: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  teacherId: string;
  _count?: {
    students: number;
  }
}

// Response khi tạo lớp thành công
export interface CreateClassroomResponse {
  success: boolean;
  message: string;
  data: ClassroomResponse;
}