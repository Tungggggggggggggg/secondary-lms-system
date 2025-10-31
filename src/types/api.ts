// Các kiểu dữ liệu chung cho API assignment

// Đáp án trắc nghiệm cho câu hỏi
export interface Option {
  id: string;
  content?: string;
  label?: string;
  isCorrect?: boolean;
  order?: number;
}

// Câu hỏi trong bài tập
export interface Question {
  id: string;
  content: string;
  order: number;
  type: string;
  options?: Option[];
}

// Thông tin chi tiết của bài tập (Assignment)
export interface AssignmentDetail {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  questions?: Question[];
  type?: string;
  // Các trường khác có thể mở rộng
}

// Tìm kiếm lớp học (Student - Class Search)
export type SearchClassesQuery = {
  q?: string;
  subject?: string;
  teacher?: string;
  grade?: string;
  visibility?: "PUBLIC" | "JOINABLE";
  sort?: "relevance" | "newest";
  cursor?: string;
  limit?: number;
};

export type SearchClassItem = {
  id: string;
  name: string;
  code: string;
  subject?: string;
  teacherName: string;
  createdAt: string;
  joined: boolean;
};

export type SearchClassesResponse = {
  items: SearchClassItem[];
  nextCursor?: string;
};