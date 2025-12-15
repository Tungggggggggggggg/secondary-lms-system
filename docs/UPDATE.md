# BÁO CÁO ĐỀ XUẤT NÂNG CẤP: HỆ THỐNG LMS TÍCH HỢP TRÍ TUỆ NHÂN TẠO (GEN AI)

**Dự án:** Secondary LMS System  
**Sinh viên thực hiện:** Nguyễn Quốc Tùng  
**Công nghệ lõi:** Next.js 14, Supabase, Google Gemini API

---

## 1. Đặt vấn đề & Mục tiêu
### 1.1. Hiện trạng
Hệ thống `secondary-lms-system` hiện tại đã hoàn thiện các chức năng quản lý học tập cơ bản (Core LMS) như: quản lý lớp học, bài tập (Essay/Quiz), nộp bài qua file và giao tiếp cơ bản.

Ngoài Core LMS, hệ thống đã có **Admin Portal** phục vụ vận hành: quản lý người dùng/lớp học toàn hệ thống, audit log và các thao tác quản trị.

### 1.2. Vấn đề tồn tại
Tuy nhiên, mô hình LMS truyền thống đang gặp phải các hạn chế:
- **Gánh nặng cho giáo viên:** Tốn quá nhiều thời gian để chấm bài tự luận và soạn bộ câu hỏi trắc nghiệm thủ công.
- **Thiếu tính cá nhân hóa:** Học sinh khi gặp khó khăn trong bài học không được giải đáp tức thì (phải đợi giáo viên trả lời chat).
- **Phụ huynh khó nắm bắt:** Các báo cáo điểm số dạng bảng biểu khô khan khó giúp phụ huynh hiểu rõ tình hình thực tế của con em.

### 1.3. Giải pháp đề xuất
Nâng cấp hệ thống trở thành **AI-Powered Smart LMS** bằng cách tích hợp **Google Gemini API**. Tận dụng sức mạnh của Generative AI để tự động hóa quy trình nghiệp vụ và cung cấp trải nghiệm học tập thông minh.

---

## 2. Kiến trúc hệ thống nâng cấp
Hệ thống giữ nguyên Tech Stack hiện tại (Next.js App Router, Supabase, Prisma) và bổ sung thêm lớp xử lý AI (AI Layer):

1.  **AI Provider:** Sử dụng **Google Gemini API** (Model `gemini-2.5-flash-lite` cho tốc độ cao và chi phí tối ưu).
2.  **Vector Database:** Kích hoạt extension `pgvector` trên Supabase để lưu trữ vector embeddings của dữ liệu bài học (phục vụ Chatbot).
3.  **AI SDK:** Sử dụng `Vercel AI SDK` để quản lý luồng dữ liệu (streaming) giữa Client và Gemini API.

---

## 3. Các tính năng AI trọng tâm

### 3.1. Trợ lý Chấm bài Tự luận (AI Auto-Grading)
*Giải quyết bài toán: Giảm tải chấm bài thủ công.*

- **Mô tả:** Giáo viên bấm "AI Gợi ý chấm". Hệ thống gửi nội dung bài làm của học sinh + Đề bài + Đáp án mẫu tới Gemini.
- **Cơ chế hoạt động:**
    - Sử dụng kỹ thuật **Structured Output** để yêu cầu Gemini trả về JSON gồm: `{ "score": number, "feedback": string, "corrections": array }`.
    - Giáo viên có thể chỉnh sửa lại điểm số/nhận xét do AI gợi ý trước khi lưu.
- **Model:** `gemini-2.5-flash-lite`.

### 3.2. Tạo đề thi tự động từ tài liệu (AI Quiz Generator)
*Giải quyết bài toán: Soạn đề thi mất thời gian.*

- **Mô tả:** Giáo viên **paste nội dung bài học** (đã triển khai) hoặc trong tương lai có thể upload tài liệu (PDF bài giảng/Word).
- **Cơ chế hoạt động (bản triển khai hiện tại):**
    1. UI cho phép giáo viên dán nội dung văn bản bài học và chọn số lượng câu hỏi.
    2. Server gửi prompt tới Gemini (`gemini-2.5-flash-lite`) nhiều lượt (multi-call) để sinh đủ số câu hỏi trắc nghiệm, tránh trùng lặp.
    3. Gemini trả về danh sách câu hỏi + đáp án, hệ thống parse và chuẩn hoá, đánh dấu đáp án đúng/sai.
    4. Hệ thống map dữ liệu này vào bảng `Question`/`Option` trong Database thông qua Prisma.
    5. Từ đó giáo viên có thể chỉnh sửa lại nội dung câu hỏi trước khi lưu.

### 3.3. Chatbot Gia sư thông minh (RAG Tutor)
*Giải quyết bài toán: Hỗ trợ học sinh 24/7.*

- **Mô tả:** Chatbot hiểu nội dung bài học, trả lời câu hỏi và giải thích kiến thức cho học sinh.
- **Công nghệ: RAG (Retrieval-Augmented Generation)**.
    1. **Indexing:** Khi giáo viên tạo bài học (`Lesson`), nội dung được chia nhỏ (chunking) và tạo vector embedding qua model `text-embedding-004`, lưu vào Supabase.
    2. **Retrieval:** Khi học sinh hỏi, hệ thống tìm các đoạn văn bản liên quan nhất trong DB.
    3. **Generation:** Gửi Context tìm được + Câu hỏi cho Gemini để sinh câu trả lời chính xác, tránh "ảo giác" (hallucination).

### 3.4. Giám sát & Báo cáo thông minh
*Giải quyết bài toán: Gian lận thi cử & Kết nối phụ huynh.*

- **Giám sát hành vi (Anti-Cheat):**
    - Client-side tracking: Phát hiện rời tab, copy/paste, mất focus.
    - AI Analysis: Phân tích log hành vi để gắn cờ các bài thi có dấu hiệu bất thường.
- **Báo cáo Phụ huynh (Smart Summary):**
    - Cuối tuần, Gemini tổng hợp điểm số và nhật ký hoạt động để viết một đoạn tóm tắt ngắn gọn, dễ hiểu gửi cho phụ huynh (VD: *"Tuần này em Tùng tiến bộ môn Toán nhưng cần chú ý nộp bài đúng hạn hơn..."*).

---

## 4. Kế hoạch triển khai (Roadmap)

### Giai đoạn 1: AI Automation (Ưu tiên cao - Dễ Demo)
*Mục tiêu: Hoàn thiện tính năng hỗ trợ giáo viên.*
- [x] Đăng ký Google AI Studio API Key và cấu hình biến môi trường `GEMINI_API_KEY`.
- [x] Cài đặt `@google/generative-ai` SDK và tích hợp vào lớp AI Layer.
- [x] Triển khai API route `/api/ai/grade` (Chấm bài).
- [x] Triển khai API route `/api/ai/quiz` (Tạo đề từ **text** + tích hợp UI cho giáo viên).

### Giai đoạn 2: Intelligent Data (Độ khó cao)
*Mục tiêu: Triển khai Chatbot RAG.*
- [x] Config `pgvector` trên Supabase.
- [x] Viết pipeline tạo Embeddings cho bài học (`Lesson`) với bảng `lesson_embedding_chunks` (dim = 1536).
- [x] Xây dựng UI Chatbot (Tutor) cho học sinh trên trang lesson, truy vấn embeddings theo course/lớp.

### Giai đoạn 3: Analytics & UX (Hoàn thiện)
*Mục tiêu: Báo cáo và Giám sát.*
- [ ] Xây dựng hook `useAntiCheat` trên React.
- [x] Triển khai API tóm tắt học tập **on-demand** cho phụ huynh: `POST /api/ai/parent/summary`.
- [ ] Triển khai báo cáo tuần tự động cho phụ huynh (Cron).

---

## 5. Kết luận
Việc tích hợp **Gemini API** không chỉ giúp hệ thống `secondary-lms-system` bắt kịp xu hướng công nghệ giáo dục (EdTech) hiện đại mà còn giải quyết triệt để các bài toán về hiệu suất làm việc của giáo viên và trải nghiệm cá nhân hóa của học sinh. Đây là điểm nhấn quan trọng giúp đồ án đạt được hàm lượng công nghệ cao và giá trị thực tiễn lớn.

Ghi chú triển khai kèm theo: Admin Portal đã được cải tiến theo hướng chuẩn hoá UI/UX để demo và vận hành ổn định hơn (chuẩn hoá trạng thái loading/error/empty/pagination, bổ sung thao tác xóa user có guard/audit, tối ưu sidebar admin để dễ đọc).