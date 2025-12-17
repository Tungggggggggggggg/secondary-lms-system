# BÁO CÁO FIX & KẾ HOẠCH TRIỂN KHAI

## 1) Mục tiêu
Chuẩn hoá và sửa các chức năng theo yêu cầu mới cho các vai trò:
- Parent
- Student
- Teacher
- Admin
- Auth / Export

Tài liệu này mô tả:
- Phạm vi thay đổi
- File ảnh hưởng
- Cách triển khai đề xuất
- Tiêu chí nghiệm thu (Acceptance Criteria)
- Kịch bản test (Manual Test Plan)

---

## 2) Tóm tắt quyết định nghiệp vụ (đã chốt)
- **Parent chat:** Phụ huynh nhắn **trực tiếp** với giáo viên (PARENT↔TEACHER).
- **Progress avg:** Assignment **không có hạn** (`dueDate = null`) và **chưa làm** ⇒ **không tính 0** vào trung bình.
- **Admin reset password:** **Bỏ hẳn** chức năng admin reset password.
- **Organizations:** Phase 1: gỡ khỏi sidebar + ẩn route/UI (không đụng DB).

Ghi chú trạng thái (đã triển khai trong codebase):
- P1 ✅
- P2 ✅
- S1 ✅
- T1 ✅
- T2 ✅
- A1 ✅
- A2 ✅
- A3 ✅
- A4 ✅
- A5 ✅
- AUTH1 ✅
- EXP1 ✅
- (3) Align avg score Student/Teacher ✅
- Còn lại: (không)

---

## 3) Danh sách hạng mục triển khai

### 3.1 Parent

#### P1. Parent nhắn tin trực tiếp với giáo viên (PARENT↔TEACHER)
- **Trạng thái**: ✅ Đã triển khai.
- **Hiện trạng**
  - Parent Teachers page đang tạo hội thoại dạng teacher↔student (hoặc theo context student) thông qua [createConversationGeneric](cci:1://file:///d:/DATN/secondary-lms-system/src/hooks/use-chat.ts:104:0-111:1).
- **Mục tiêu**
  - Tạo hội thoại DM giữa parent và teacher.
- **File liên quan**
  - [src/app/dashboard/parent/teachers/page.tsx](cci:7://file:///d:/DATN/secondary-lms-system/src/app/dashboard/parent/teachers/page.tsx:0:0-0:0)
  - [src/components/parent/TeacherCard.tsx](cci:7://file:///d:/DATN/secondary-lms-system/src/components/parent/TeacherCard.tsx:0:0-0:0)
  - [src/hooks/use-chat.ts](cci:7://file:///d:/DATN/secondary-lms-system/src/hooks/use-chat.ts:0:0-0:0) (hàm [createConversationGeneric](cci:1://file:///d:/DATN/secondary-lms-system/src/hooks/use-chat.ts:104:0-111:1))
  - `src/app/api/chat/conversations/route.ts` (POST tạo conversation)
- **Cách triển khai đề xuất**
  - Tại nút “Nhắn tin” trên TeacherCard:
    - Gọi [createConversationGeneric([teacherId], classId?, null)](cci:1://file:///d:/DATN/secondary-lms-system/src/hooks/use-chat.ts:104:0-111:1)
    - Không truyền `studentId` vào participants nữa.
  - (Khuyến nghị) Thêm kiểm tra quyền ở API:
    - Khi `user.role === "PARENT"` và tạo generic conversation với teacher:
      - Chỉ cho phép nếu teacher đó đang dạy ít nhất 1 con của parent trong classroom hợp lệ.
- **Acceptance Criteria**
  - Parent có thể bấm “Nhắn tin” ở trang giáo viên và vào đúng hội thoại DM Parent↔Teacher.
  - Teacher nhận được tin nhắn và có thể trả lời.
  - (Nếu có guard) Parent không thể tự ý tạo hội thoại với teacher không liên quan.
- **Test plan**
  - Đăng nhập Parent → Dashboard → Parent → Teachers:
    - Bấm “Nhắn tin” tại 1 giáo viên có liên kết qua con → chuyển qua màn chat, thấy hội thoại mới (hoặc hội thoại cũ được reuse).
    - Gửi tin nhắn → Teacher đăng nhập → thấy tin nhắn trong chat.
  - Trường hợp guard:
    - Dùng DevTools thử POST `/api/chat/conversations` với `participantIds=[teacherId_khong_lien_quan]` → trả 403.

#### P2. Sửa cách tính điểm trung bình (Learning Progress) theo quy tắc overdue
- **Trạng thái**: ✅ Đã triển khai.
- **Hiện trạng**
  - API tổng quan (`/api/parent/children/grades`) chỉ dựa vào submissions có `grade !== null` → không tính bài missing overdue.
  - API chi tiết 1 con có “missingGrades 0” nhưng thống kê trung bình vẫn lấy `_avg` từ submissions → không tính 0 ảo.
- **Mục tiêu**
  - Tính trung bình theo rule:
    - **Tính vào trung bình**
      - Bài đã có `submission` và đã có điểm (kể cả 0)
      - Bài **có hạn** và **đã quá hạn** nhưng chưa nộp ⇒ tính **0**
    - **Không tính**
      - Bài chưa quá hạn và chưa nộp
      - Bài `dueDate=null` và chưa nộp (không tính 0)
- **File liên quan**
  - [src/app/api/parent/children/grades/route.ts](cci:7://file:///d:/DATN/secondary-lms-system/src/app/api/parent/children/grades/route.ts:0:0-0:0)
  - `src/app/api/parent/children/[childId]/grades/route.ts`
  - [src/app/dashboard/parent/progress/page.tsx](cci:7://file:///d:/DATN/secondary-lms-system/src/app/dashboard/parent/progress/page.tsx:0:0-0:0) (hiển thị)
  - [src/hooks/use-parent-grades.ts](cci:7://file:///d:/DATN/secondary-lms-system/src/hooks/use-parent-grades.ts:0:0-0:0) (fetch/cache)
- **Cách triển khai đề xuất**
  - Ở API:
    - Query assignments theo classroom/courses của học sinh (trong các lớp mà parent có quyền xem).
    - Merge assignments với submissions theo `assignmentId` + `studentId`.
    - Tạo “grade entries” để tính average:
      - Nếu có submission và `grade != null` → include grade
      - Nếu không có submission:
        - Nếu `effectiveDeadline = lockAt ?? dueDate` và `effectiveDeadline < now` → include grade=0
        - Nếu `dueDate == null` → exclude
        - Nếu `effectiveDeadline >= now` → exclude
  - Đảm bảo cả endpoint “tổng quan” và “chi tiết 1 con” dùng cùng logic để tránh lệch số.
- **Acceptance Criteria**
  - Điểm TB thay đổi đúng theo rule trên các case:
    - Có bài điểm 0 thật vẫn tính vào average.
    - Missing overdue có hạn bị tính 0.
    - Missing nhưng chưa đến hạn không bị tính.
    - Missing và `dueDate=null` không bị tính 0.
- **Test plan**
  - Chuẩn bị data (có thể seed hoặc tạo bằng UI):
    - 1 assignment có `dueDate` hôm qua, student chưa submit → avg phải giảm vì tính 0.
    - 1 assignment có `dueDate` tuần sau, student chưa submit → avg không đổi (không tính).
    - 1 assignment `dueDate=null`, student chưa submit → avg không đổi (không tính).
    - 1 submission grade=0 → avg có tính 0.
  - Mở Parent → Progress:
    - So sánh avg hiển thị với tính tay từ danh sách bài.
  - Check endpoint:
    - Call `/api/parent/children/grades` và `/api/parent/children/{id}/grades` → avg thống nhất.

---

### 3.2 Student

#### S1. Trang Lessons nhóm theo Course hoặc filter theo course
- **Trạng thái**: ✅ Đã triển khai.
- **Hiện trạng**
  - UI render danh sách bài học phẳng, dễ hiểu nhầm “tất cả lesson của mọi course”.
  - API đã trả về `courseId/courseTitle`.
- **File liên quan**
  - `src/app/dashboard/student/classes/[classId]/lessons/page.tsx`
  - `src/app/api/students/classes/[classId]/lessons/route.ts`
- **Cách triển khai đề xuất**
  - Nhóm UI theo `courseTitle` (section/accordion), lessons bên trong sắp theo `order`.
  - (Tuỳ chọn) Thêm dropdown chọn course và gọi API với `?courseId=...`.
- **Acceptance Criteria**
  - Không còn hiển thị “lẫn” lessons giữa các course trong cùng một khối.
  - Loading/error state vẫn hoạt động.
- **Test plan**
  - Student → Class → Lessons:
    - Quan sát nhóm theo course.
    - Nếu có filter: chọn course A → chỉ hiện lesson course A.

---

### 3.3 Teacher

#### T1. Chi tiết bài tập: giữ format cho nội dung tự luận (ESSAY)
- **Trạng thái**: ✅ Đã triển khai.
- **Hiện trạng**
  - Trang chi tiết bài tập đang [stripHtml(...)](cci:1://file:///d:/DATN/secondary-lms-system/src/app/dashboard/teacher/assignments/%5Bid%5D/page.tsx:22:0-25:1) làm mất format.
  - Đã có component [RichTextPreview](cci:1://file:///d:/DATN/secondary-lms-system/src/components/shared/RichTextPreview.tsx:10:0-17:1).
- **File liên quan**
  - `src/app/dashboard/teacher/assignments/[id]/page.tsx`
  - [src/components/shared/RichTextPreview.tsx](cci:7://file:///d:/DATN/secondary-lms-system/src/components/shared/RichTextPreview.tsx:0:0-0:0)
- **Cách triển khai đề xuất**
  - Với câu hỏi ESSAY: render `<RichTextPreview html={q.content} />` thay vì text stripped.
- **Acceptance Criteria**
  - Nội dung ESSAY giữ được danh sách, in đậm, gạch chân, link (nếu có).
- **Test plan**
  - Tạo bài tập ESSAY có format (bullet/bold/link) → vào trang chi tiết → kiểm tra hiển thị.

#### T2. Giám sát thi: AI summary yêu cầu Student ID (tự fill)
- **Trạng thái**: ✅ Đã triển khai.
- **Hiện trạng**
  - [callAiSummary()](cci:1://file:///d:/DATN/secondary-lms-system/src/app/dashboard/teacher/exams/monitor/page.tsx:637:2-702:4) yêu cầu `studentIdInput` nhưng khi chọn học sinh chưa auto-fill.
- **File liên quan**
  - [src/app/dashboard/teacher/exams/monitor/page.tsx](cci:7://file:///d:/DATN/secondary-lms-system/src/app/dashboard/teacher/exams/monitor/page.tsx:0:0-0:0)
- **Cách triển khai đề xuất**
  - Khi chọn học sinh trong danh sách monitoring:
    - Parse `studentId|attempt` (nếu sessionKey có dạng này) và tự set `studentIdInput` + `attemptInput`.
- **Acceptance Criteria**
  - Chọn học sinh → bấm AI summary chạy được mà không cần copy/paste studentId thủ công.
- **Test plan**
  - Teacher → Exam Monitor:
    - Chọn 1 học sinh đang có log → kiểm tra input studentId tự điền.
    - Bấm AI summary → không báo thiếu Student ID.

---

### 3.4 Admin

#### A1. Tạo user với role + bulk import (không chỉ teacher)
- **Trạng thái**: ✅ Đã triển khai.
- **Hiện trạng**
  - Admin Users page đang “tạo giáo viên” và bulk endpoint set role TEACHER.
- **File liên quan**
  - [src/app/dashboard/admin/users/page.tsx](cci:7://file:///d:/DATN/secondary-lms-system/src/app/dashboard/admin/users/page.tsx:0:0-0:0)
  - [src/app/api/admin/users/bulk/route.ts](cci:7://file:///d:/DATN/secondary-lms-system/src/app/api/admin/users/bulk/route.ts:0:0-0:0)
- **Cách triển khai đề xuất**
  - UI: modal tạo user chung, có dropdown role (TEACHER/STUDENT/PARENT).
  - Bulk: cho phép chọn role chung (hoặc per-row), validate email/password.
- **Acceptance Criteria**
  - Admin tạo được user với role đúng.
  - Bulk import tạo đúng role theo cấu hình.
- **Test plan**
  - Admin tạo 1 student + 1 parent từ UI.
  - Bulk import file mẫu (ví dụ `teachers_sample.csv` đang mở) nhưng đổi thành `users_sample.csv` phù hợp format → tạo đúng số lượng.

#### A2. Bỏ hẳn reset password cho admin
- **Trạng thái**: ✅ Đã triển khai (UI gỡ; API trả 410 Gone).
- **Hiện trạng**
  - Có UI call endpoint reset password và có route API `.../reset-password`.
- **File liên quan**
  - [src/app/dashboard/admin/users/page.tsx](cci:7://file:///d:/DATN/secondary-lms-system/src/app/dashboard/admin/users/page.tsx:0:0-0:0)
  - `src/app/dashboard/admin/users/[id]/page.tsx`
  - `src/app/api/admin/users/[id]/reset-password/route.ts`
- **Cách triển khai đề xuất**
  - Gỡ toàn bộ nút/flow reset password khỏi UI.
  - Xoá route API hoặc trả lỗi 410/403 (tuỳ chọn).
- **Acceptance Criteria**
  - Admin không còn thấy bất kỳ nút “Reset password” nào.
  - Gọi endpoint cũ không còn hoạt động.
- **Test plan**
  - Admin Users list + User detail:
    - Xác nhận không còn action reset password.
  - Thử gọi API cũ:
    - Nếu xoá: 404
    - Nếu soft: 410/403 + message.

#### A3. Organizations Phase 1: gỡ sidebar + ẩn route/UI
- **Trạng thái**: ✅ Đã triển khai (ẩn/gỡ UI; API trả 410 Gone).
- **Hiện trạng**
  - Sidebar có Organizations.
  - Có pages + APIs organizations.
- **File liên quan**
  - [src/constants/sidebar.config.ts](cci:7://file:///d:/DATN/secondary-lms-system/src/constants/sidebar.config.ts:0:0-0:0)
  - [src/app/dashboard/admin/organizations/page.tsx](cci:7://file:///d:/DATN/secondary-lms-system/src/app/dashboard/admin/organizations/page.tsx:0:0-0:0)
  - `src/app/dashboard/admin/organizations/[id]/page.tsx`
- **Cách triển khai đề xuất**
  - Remove item khỏi sidebar.
  - Ở page organizations: redirect/notFound để không truy cập trực tiếp.
  - Chưa động tới Prisma/DB.
- **Acceptance Criteria**
  - Không còn menu Organizations.
  - Truy cập URL organizations bị redirect hoặc 404.
- **Test plan**
  - Admin sidebar: không thấy Organizations.
  - Gõ URL `/dashboard/admin/organizations`:
    - Bị redirect về dashboard/users hoặc hiển thị 404 theo thiết kế.

#### A4. Tham gia lớp học archived: message đúng
- **Trạng thái**: ✅ Đã triển khai.
- **Hiện trạng**
  - API join class trả “Lớp học đang bị khóa” khi `isActive=false`.
- **File liên quan**
  - [src/app/api/classrooms/join/route.ts](cci:7://file:///d:/DATN/secondary-lms-system/src/app/api/classrooms/join/route.ts:0:0-0:0)
- **Cách triển khai đề xuất**
  - Đổi message: “Không thể tham gia lớp học đã lưu trữ”.
- **Ghi chú triển khai bổ sung (UX)**
  - Join archived class hiển thị toast lỗi (không chỉ log console).
  - File liên quan: `src/hooks/use-classroom.ts`, `src/app/dashboard/student/classes/join/page.tsx`, `src/app/join/[code]/page.tsx`.
- **Acceptance Criteria**
  - Student join archived class thấy message đúng, rõ ràng.
- **Test plan**
  - Tạo lớp `isActive=false` → student join bằng code → nhận message mới.

#### A5. System Settings: enforcement (nếu đang thiếu)
- **Trạng thái**: ✅ Đã triển khai.
- **Hiện trạng**
  - Có trang settings và API save.
- **File liên quan**
  - [src/app/dashboard/admin/settings/page.tsx](cci:7://file:///d:/DATN/secondary-lms-system/src/app/dashboard/admin/settings/page.tsx:0:0-0:0)
  - `src/app/api/admin/settings/route.ts`
  - (có thể) `src/middleware.ts` hoặc layout để enforce maintenance/announcement
- **Cách triển khai đề xuất**
  - Hiển thị announcement ở layout chung.
  - Khi maintenance=true: chặn route theo role (tuỳ policy).
- **Ghi chú triển khai**
  - Announcement + maintenance banner: `src/components/shared/SystemStatusGate.tsx` (được wrap trong `src/components/layout/DashboardLayout.tsx`).
  - Enforce routing maintenance: `src/middleware.ts` redirect non-admin dashboard → `/maintenance`.
  - Trang `/maintenance`: `src/app/maintenance/page.tsx`.
  - Không cache settings: `src/app/api/system/settings/route.ts` set `Cache-Control: no-store`.
  - Realtime propagation khi bấm “Lưu thay đổi” (không cần reload):
    - Admin settings phát signal (storage + BroadcastChannel).
    - `SystemStatusGate` và `/maintenance` lắng nghe và `mutate()` SWR để apply ngay.
- **Acceptance Criteria**
  - Announcement xuất hiện đúng nội dung.
  - Maintenance mode chặn truy cập theo đúng policy.
- **Test plan**
  - Admin bật announcement → refresh user pages → thấy banner.
  - Admin bật maintenance → truy cập route bị chặn theo rule.

---

### 3.5 Auth / Validation

#### AUTH1. Thống nhất policy mật khẩu giữa Register và Reset Password
- **Trạng thái**: ✅ Đã triển khai.
- **Hiện trạng**
  - Register API đang min(6); Reset password API min(8 + uppercase/lowercase/number).
- **File liên quan**
  - [src/app/api/auth/register/route.ts](cci:7://file:///d:/DATN/secondary-lms-system/src/app/api/auth/register/route.ts:0:0-0:0)
  - [src/components/auth/RegisterForm.tsx](cci:7://file:///d:/DATN/secondary-lms-system/src/components/auth/RegisterForm.tsx:0:0-0:0)
  - [src/app/api/auth/reset-password/reset/route.ts](cci:7://file:///d:/DATN/secondary-lms-system/src/app/api/auth/reset-password/reset/route.ts:0:0-0:0)
  - `src/components/auth/reset-password/NewPasswordStep.tsx`
- **Cách triển khai đề xuất**
  - Tạo schema dùng chung (zod) cho password.
  - Dùng cùng message lỗi (UI/UX).
- **Acceptance Criteria**
  - Register và reset password dùng cùng rule.
  - UI hiện lỗi rõ ràng, không “lỗi im lặng”.
- **Test plan**
  - Register với password yếu → bị chặn, hiện message rõ.
  - Reset password với password yếu → bị chặn, message đồng bộ.

---

### 3.6 Export

#### EXP1. Thay CSV export → Excel export (.xlsx)
- **Trạng thái**: ✅ Đã triển khai.
- **Hiện trạng**
  - Có util `src/lib/csv.ts` và các page dùng `exportToCsv`.
- **File liên quan**
  - `src/lib/csv.ts` (sẽ thay thế hoặc bổ sung util excel)
  - Các nơi gọi `exportToCsv` (ví dụ teacher assignments page)
  - [package.json](cci:7://file:///d:/DATN/secondary-lms-system/package.json:0:0-0:0) (thêm dependency `xlsx` hoặc `exceljs`)
- **Cách triển khai đề xuất**
  - Thêm thư viện `xlsx`.
  - Tạo hàm export `.xlsx` và thay toàn bộ nút export.
- **Acceptance Criteria**
  - File tải về là `.xlsx` mở tốt trên Excel.
  - Dữ liệu đúng cột/định dạng.
- **Test plan**
  - Export từ trang teacher assignments → mở bằng Excel → dữ liệu hiển thị đúng.

---

## 4) Thứ tự ưu tiên triển khai (khuyến nghị)
Các mục đã hoàn thành: P1, P2, (3), S1, T1, T2, A1, A2, A3, A4, A5, AUTH1, EXP1.

Các mục còn lại cần triển khai:
- (không)

---

## 5) Ghi chú triển khai
- Khi chỉnh permission chat cho parent, cần test cả trường hợp:
- Với avg score, cần thống nhất cách xác định “quá hạn”:
  - ưu tiên `lockAt`, fallback `dueDate` (deadline hiệu lực = `lockAt ?? dueDate`).