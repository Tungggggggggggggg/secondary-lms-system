# BÁO CÁO ĐỀ XUẤT NÂNG CẤP: HỆ THỐNG LMS TÍCH HỢP TRÍ TUỆ NHÂN TẠO (GEN AI)

**Dự án:** Secondary LMS System  
**Sinh viên thực hiện:** Nguyễn Quốc Tùng  
**Công nghệ lõi:** Next.js 14, Supabase, Google Gemini API

---

## 1. Đặt vấn đề & Mục tiêu
### 1.1. Hiện trạng
Hệ thống `secondary-lms-system` hiện tại đã hoàn thiện các chức năng quản lý học tập cơ bản (Core LMS) như: quản lý lớp học, bài tập (Essay/Quiz), nộp bài qua file và giao tiếp cơ bản.

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

1.  **AI Provider:** Sử dụng **Google Gemini API** (Model `gemini-2.5-flash` cho tốc độ cao và chi phí tối ưu).
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
- **Model:** `gemini-2.5-flash`.

### 3.2. Tạo đề thi tự động từ tài liệu (AI Quiz Generator)
*Giải quyết bài toán: Soạn đề thi mất thời gian.*

- **Mô tả:** Giáo viên upload tài liệu (PDF bài giảng/Word) hoặc paste nội dung bài học.
- **Cơ chế hoạt động:**
    1. Server parse nội dung văn bản từ file.
    2. Gửi Prompt tới Gemini: *"Dựa trên nội dung này, hãy tạo 10 câu hỏi trắc nghiệm độ khó trung bình..."*.
    3. Gemini trả về mảng JSON các câu hỏi (Question + Options + Correct Answer).
    4. Hệ thống map dữ liệu này vào bảng `Question` trong Database thông qua Prisma.

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
- [ ] Đăng ký Google AI Studio API Key.
- [ ] Cài đặt `google-generative-ai` SDK.
- [ ] Triển khai API route `/api/ai/grade` (Chấm bài).
- [ ] Triển khai API route `/api/ai/quiz` (Tạo đề từ text).

### Giai đoạn 2: Intelligent Data (Độ khó cao)
*Mục tiêu: Triển khai Chatbot RAG.*
- [ ] Config `pgvector` trên Supabase.
- [ ] Viết script tạo Embeddings cho bài học (`Lesson`).
- [ ] Xây dựng UI Chatbot cho học sinh.

### Giai đoạn 3: Analytics & UX (Hoàn thiện)
*Mục tiêu: Báo cáo và Giám sát.*
- [ ] Xây dựng hook `useAntiCheat` trên React.
- [ ] Triển khai API tổng hợp báo cáo tuần cho phụ huynh.

---

## 5. Kết luận
Việc tích hợp **Gemini API** không chỉ giúp hệ thống `secondary-lms-system` bắt kịp xu hướng công nghệ giáo dục (EdTech) hiện đại mà còn giải quyết triệt để các bài toán về hiệu suất làm việc của giáo viên và trải nghiệm cá nhân hóa của học sinh. Đây là điểm nhấn quan trọng giúp đồ án đạt được hàm lượng công nghệ cao và giá trị thực tiễn lớn.