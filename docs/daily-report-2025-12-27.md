# Báo cáo triển khai ngày 27/12/2025

> Ghi chú thay đổi chính trong phiên làm việc, kèm checklist để người sau có thể verify nhanh.

---

## 1. Nộp bài tự luận học sinh (ESSAY – BOTH)

**Mục tiêu**

- Học sinh chỉ có **1 nút Nộp bài** cho bài ESSAY có `submissionFormat = "BOTH"`.
- Lần nộp đầu tiên có thể chứa **văn bản, file, hoặc cả hai** (ít nhất một trong hai).

**File chính**

- `src/app/dashboard/student/assignments/[id]/page.tsx`
- `src/components/student/assignments/EssayAssignmentForm.tsx`
- `src/components/student/assignments/FileSubmissionPanel.tsx`

**Checklist kiểm tra**

- [x] Tạo 1 bài ESSAY với `submissionFormat = BOTH`.
- [x] Đăng nhập học sinh, mở trang chi tiết bài tập.
- [x] Nhập **chỉ text**, không chọn file → bấm `Nộp bài` → thành công, giáo viên thấy 1 submission text.
- [x] Xoá text, chỉ chọn **file**, bấm `Nộp bài` → thành công, giáo viên thấy 1 submission file.
- [x] Nhập **text + file** rồi `Nộp bài` → chỉ có **1 lần nộp** cho học sinh đó, không tách 2 thẻ.

---

## 2. Gộp hiển thị bài nộp BOTH trên trang giáo viên

**Mục tiêu**

- Với bài ESSAY+BOTH, giáo viên chỉ thấy **1 card** mỗi học sinh (không tách "Nộp file" và "Nội dung" thành 2 thẻ).

**File chính**

- `src/hooks/use-teacher-submissions.ts`
- `src/components/teacher/submissions/SubmissionCard.tsx`
- `src/app/api/assignments/[id]/submissions/route.ts`

**Checklist**

- [x] Tạo bài ESSAY `BOTH`, để học sinh nộp **text + file**.
- [x] Vào `/dashboard/teacher/assignments/[id]/submissions`.
- [x] Mỗi học sinh chỉ có **1 card**.
- [x] Card hiển thị:
  - [x] Text preview (nếu có nội dung).
  - [x] Dòng phụ: `Có kèm tệp: x tệp` nếu có file.
  - [x] Nút `Tải file (x)` tải đúng file.

---

## 3. Avatar giáo viên trong trang phụ huynh

**Mục tiêu**

- Avatar giáo viên trên trang `Giáo viên của con` đồng bộ style với avatar của con (chữ cái, gradient, bo tròn).

**File**

- `src/components/parent/TeacherCard.tsx`

**Checklist**

- [x] Đăng nhập phụ huynh, mở `/dashboard/parent/teachers`.
- [x] Avatar chữ cái của giáo viên và avatar của con có **cùng kích thước, cùng gradient, cùng bo tròn**.

---

## 4. Dọn trang Overview admin

**Mục tiêu**

- Trang `/dashboard/admin/dashboard` chỉ là trang tổng quan, **không có** 2 nút `Quản lý người dùng` và `Cài đặt hệ thống` ở header.

**File**

- `src/app/dashboard/admin/dashboard/page.tsx`

**Checklist**

- [x] Mở `/dashboard/admin/dashboard`.
- [x] Header chỉ có **tiêu đề + mô tả**, **không** có 2 nút điều hướng Users/Settings.
- [x] Vẫn có KPIs và biểu đồ phân bố người dùng như trước.

---

## 5. Trang chi tiết người dùng admin

**Mục tiêu**

- Giao diện gọn hơn:
  - Bỏ cụm 3 ô nhỏ `Lớp (GV)`, `Lớp (HS)`, `Liên kết (PH)`.
  - Màu section `Lớp đang dạy` đồng bộ với các section khác.

**File**

- `src/app/dashboard/admin/users/[id]/page.tsx`

**Checklist**

- [x] Mở `/dashboard/admin/users/[userId]` với user là **GV**.
- [x] Không còn 3 ô thống kê nhỏ ở cột phải.
- [x] Section `Lớp đang dạy` cùng style card với `Lớp đang học`, `Phụ huynh liên kết`, v.v.

---

## 6. Trang quản lý lớp học Admin

**Mục tiêu chính**

1. Dọn toolbar & tìm kiếm:
   - Bỏ nút `Reset` cạnh ô tìm kiếm chính.
2. Thu gọn dialog:
   - Tạo lớp, sửa lớp, danh sách học sinh, đổi GV, thêm HS hàng loạt có width/height hợp lý.
3. Đổi giáo viên phụ trách:
   - Tìm GV mới auto-filter theo tên/email.
   - Bắt buộc chọn GV mới trước khi `Cập nhật`.
4. Tạo lớp mới:
   - Ô chọn giáo viên cũng auto-filter như dialog đổi GV.
5. Nút thao tác có hiệu ứng bấm (press state).

**File chính**

- `src/app/dashboard/admin/classrooms/page.tsx`
- `src/components/admin/AdminClassroomsToolbar.tsx`
- `src/components/admin/ClassroomRowActionsMenu.tsx`
- `src/components/admin/AdminClassroomOverview.tsx`

**Checklist**

- Toolbar:
  - [x] Ở `/dashboard/admin/classrooms`, trên toolbar **không còn** nút `Reset` cạnh ô tìm kiếm.
- Dialog tạo lớp:
  - [x] Mở `Tạo lớp học`, dialog **không quá rộng**, nội dung scroll bên trong nếu dài.
  - [x] Gõ tên/email giáo viên trong ô `Giáo viên phụ trách` → danh sách bên cạnh auto lọc sau ~0.4s, **không cần** bấm `Tải danh sách`.
- Dialog đổi giáo viên:
  - [x] Mở `Thao tác → Đổi giáo viên phụ trách`.
  - [x] Ban đầu dropdown `Giáo viên mới` trống (`-- Chọn giáo viên --`), nút `Cập nhật` disabled.
  - [x] Gõ tên/email → danh sách GV tự lọc; chọn 1 GV → `Cập nhật` enabled, update thành công.
- Dialog khác (danh sách HS, bulk add, sửa lớp):
  - [x] Tất cả dialog có width/max-h gọn (không full-width), nội dung dài scroll bên trong.
- Nút thao tác & chi tiết:
  - [x] Nút `Chi tiết` trong bảng lớp có hiệu ứng **nhún nhẹ** khi click.
  - [x] Nút `Thao tác` trong bảng lớp và bảng Users cũng có hiệu ứng press.
  - [x] Các nút dải `Thêm HS / Sửa lớp / Đổi GV / Xuất Excel / Lưu trữ / Xóa vĩnh viễn` trên trang chi tiết lớp đều có hiệu ứng press.

---

## 7. Prompt dialog cho các thao tác xác nhận (ví dụ Lưu trữ lớp)

**Mục tiêu**

- Prompt chung nhỏ gọn hơn (ví dụ khi lưu trữ lớp, nhập lý do).

**File**

- `src/components/shared/PromptDialog.tsx`

**Checklist**

- [x] Ở `/dashboard/admin/classrooms/[id]` bấm `Lưu trữ` → dialog lý do hiển thị với width ~32rem, **không** quá to.
- [x] Nội dung vẫn là 1 textarea + nút `Hủy` / `Lưu trữ`, không thay đổi logic.

---

## 8. Cải thiện hiệu ứng hover/press cho nút admin

**Mục tiêu**

- Các nút filter dạng chip ở trang Users/Lớp và nút phân trang nhỏ trong dialog học sinh đều có hiệu ứng press.

**File**

- `src/components/admin/AdminUsersToolbar.tsx`
- `src/components/admin/AdminClassroomsToolbar.tsx`
- `src/app/dashboard/admin/classrooms/page.tsx` (nút `Trước` / `Sau` trong dialog học sinh)

**Checklist**

- [x] Ở `/dashboard/admin/users`, các chip lọc role (Tất cả/Teacher/Student/...) có hiệu ứng **nhún** khi bấm.
- [x] Ở `/dashboard/admin/classrooms`, các chip lọc trạng thái (Tất cả/Đang hoạt động/Đã lưu trữ) có hiệu ứng press.
- [x] Trong dialog `Danh sách học sinh`, 2 nút `Trước`/`Sau` có hiệu ứng press khi click.

---

## 9. Nâng cấp trang Audit Logs

**Mục tiêu**

- Bộ lọc mạnh hơn, hiển thị log dễ đọc hơn, hỗ trợ điều tra nhanh.

**File chính**

- `src/app/dashboard/admin/audit-logs/page.tsx`
- `src/components/admin/AdminAuditFilterBar.tsx`
- `src/components/admin/AuditMetadataPreview.tsx` (chỉ dùng lại, không đổi lớn)
- `src/app/api/admin/audit-logs/route.ts`
- `src/lib/repositories/audit-repo.ts`

**Checklist – Filter**

- [x] Trên `/dashboard/admin/audit-logs`, filter có thêm dropdown `Entity` với giá trị: `Tất cả`, `USER`, `CLASSROOM`, `ASSIGNMENT`, `ORGANIZATION`.
- [x] Chọn `Entity = USER` + `Lọc` → chỉ thấy log có `entityType = USER`.
- [x] Ô `Action` có datalist gợi ý (USER_BAN, CLASSROOM_ARCHIVE, ...), vẫn cho phép nhập tự do.
- [x] Hàng preset `Nhanh:` có các nút `Hôm nay / 7 ngày / 30 ngày / Tất cả`; bấm từng nút set `Từ ngày`/`Đến ngày` đúng logic.
- [x] Nút `Đặt lại bộ lọc` xoá actor/action/entity/from/to và reload danh sách log.

**Checklist – Bảng & hiển thị**

- [x] Header bảng (Thời gian/Action/Entity/Actor/Org/IP/Metadata) dính trên cùng khi scroll.
- [x] Logs được nhóm theo ngày với header: `Hôm nay`, `Hôm qua` hoặc `dd/mm/yyyy`.
- [x] Hàng log có hover `bg-muted/40`.
- [x] Cột `Action` hiển thị bằng `Badge`; với action bắt đầu bằng `USER_` hoặc `CLASSROOM_` có màu cảnh báo (`warning`).
- [x] Cột `Actor` hiển thị `actorId` + badge nhỏ role ngay bên dưới.
- [x] Cột `Entity`:
  - [x] Dòng trên: `entityType`.
  - [x] Dòng dưới: `ID: ...` là **link** sang detail nếu `USER`, `CLASSROOM` hoặc `ORGANIZATION`.
- [x] `AuditMetadataPreview` vẫn gọn, không làm vỡ layout.
- [x] Nút `Tải thêm` tiếp tục load thêm log và giữ grouping theo ngày.

---

## 10. Chuẩn hóa nút Quay lại & history cho Lớp/Bài tập/Chấm bài

**Mục tiêu**

- Nút `Quay lại` trên các trang chi tiết (bài tập, chấm bài, lớp, tham gia lớp) đi theo đúng browser history.
- Không hard-code đường dẫn về danh sách, đảm bảo nếu đi từ lớp thì quay lại lớp; nếu đi từ danh sách thì quay lại danh sách.

**File chính**

- `src/components/ui/back-button.tsx` (chỉ tham chiếu, không đổi API)
- `src/app/dashboard/teacher/assignments/[id]/page.tsx`
- `src/app/dashboard/teacher/assignments/[id]/submissions/page.tsx`
- `src/app/dashboard/student/assignments/[id]/page.tsx`
- `src/app/dashboard/student/classes/[classId]/layout.tsx`
- `src/app/dashboard/student/classes/join/page.tsx`

**Checklist**

- [x] Ở `/dashboard/teacher/assignments/[id]`, nút `Quay lại` dùng history:
  - [x] Nếu đi từ `/dashboard/teacher/classrooms/[classroomId]/assignments` → Back trả về đúng tab Bài tập của lớp.
  - [x] Nếu đi từ `/dashboard/teacher/assignments` → Back trả về danh sách Bài tập chung.
- [x] Ở `/dashboard/teacher/assignments/[id]/submissions`, Back đưa về đúng trang chi tiết bài tập vừa vào.
- [x] Ở `/dashboard/student/assignments/[id]`, Back:
  - [x] Nếu đi từ `/dashboard/student/classes/[classId]/assignments` → quay về Bài tập của lớp.
  - [x] Nếu đi từ `/dashboard/student/assignments` → quay về danh sách Bài tập chung.
- [x] Ở layout lớp học học sinh (`/dashboard/student/classes/[classId]`) và trang tham gia lớp, Back luôn dùng browser history (không ép cứng về `/dashboard/student/classes`).

---
