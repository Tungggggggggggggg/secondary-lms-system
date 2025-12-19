import { z } from "zod";

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
  description?: string | null;
  dueDate?: string | null;
  openAt?: string | null;
  lockAt?: string | null;
  timeLimitMinutes?: number | null;
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
  subject?: string;
  teacherName: string;
  createdAt: string;
  joined: boolean;
};

export type SearchClassesResponse = {
  items: SearchClassItem[];
  nextCursor?: string;
};

export const createAssignmentSchema = z.object({
  title: z.string().min(1, "Tiêu đề là bắt buộc").max(200),
  description: z.string().max(5000).optional().nullable(),
  dueDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable(),
  openAt: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable(),
  lockAt: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable(),
  timeLimitMinutes: z.coerce.number().int().positive().optional().nullable(),
  type: z.enum(["ESSAY", "QUIZ"]),
  questions: z
    .array(
      z.object({
        content: z.string().min(1),
        type: z.enum(["ESSAY", "SINGLE", "MULTIPLE"]).default("SINGLE"),
        order: z.number().int().positive().optional(),
        options: z
          .array(
            z.object({
              label: z.string().optional(),
              content: z.string().min(1),
              isCorrect: z.boolean().optional(),
            })
          )
          .optional(),
      })
    )
    .optional()
    .nullable(),
});

export const paginationSchema = z.object({
  take: z.coerce.number().int().min(1).max(100).default(10),
  skip: z.coerce.number().int().min(0).default(0),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;