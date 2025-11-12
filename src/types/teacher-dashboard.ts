// Types cho Teacher Dashboard

// Thống kê tổng quan
export interface DashboardStats {
  totalStudents: number;
  totalClassrooms: number;
  totalLessons: number;
  pendingSubmissions: number;
  studentsChange?: number; // Phần trăm thay đổi so với tháng trước
  classroomsChange?: number; // Số lớp mới tuần này
  lessonsChange?: number; // Số bài giảng mới tháng này
}

// Hiệu suất giảng dạy theo lớp/môn
export interface PerformanceData {
  classroomId: string;
  classroomName: string;
  icon: string;
  averageGrade: number; // Điểm trung bình lớp (0-100)
  totalStudents: number;
  submittedCount: number;
  color: string;
}

// Công việc sắp tới
export interface UpcomingTask {
  id: string;
  type: 'ASSIGNMENT' | 'MEETING' | 'LESSON' | 'OTHER';
  title: string;
  detail: string;
  priority: 'URGENT' | 'IMPORTANT' | 'NORMAL' | 'COMPLETED';
  dueDate: Date | string;
  relatedClassroom?: string;
  relatedId?: string; // ID của assignment, meeting, etc.
}

// Hoạt động gần đây
export interface RecentActivity {
  id: string;
  type: 'SUBMISSION' | 'MESSAGE' | 'JOIN' | 'LIKE' | 'COMMENT';
  actorName: string;
  actorType: 'STUDENT' | 'PARENT' | 'TEACHER';
  action: string;
  detail: string;
  timestamp: Date | string;
  relatedId?: string;
}

// Mục tiêu tuần
export interface WeeklyGoal {
  id: string;
  title: string;
  completed: number;
  total: number;
  category: 'GRADING' | 'LESSON' | 'COMMUNICATION' | 'OTHER';
}

// Thành tích
export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlockedAt?: Date | string;
  progress?: number; // 0-100 nếu chưa đạt được
}

// Response từ API
export interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStats;
}

export interface PerformanceResponse {
  success: boolean;
  data: PerformanceData[];
}

export interface TasksResponse {
  success: boolean;
  data: UpcomingTask[];
}

export interface ActivitiesResponse {
  success: boolean;
  data: RecentActivity[];
}

export interface GoalsResponse {
  success: boolean;
  data: {
    goals: WeeklyGoal[];
    streak: number;
  };
}

export interface AchievementsResponse {
  success: boolean;
  data: Achievement[];
}
