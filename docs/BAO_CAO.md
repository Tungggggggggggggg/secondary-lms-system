# Báo cáo việc còn lại cần hoàn thành — UI Refactor (Teacher / Student / Parent / Admin)

**Ngày:** 2025-12-19  
**Mục tiêu:** Hoàn tất refactor UI theo role (token hoá neutral colors + chuẩn focus ring), chuẩn hoá layout/pattern trang, đảm bảo `npm run lint` và `npm run build` PASS, sau đó cập nhật checklist gốc.

---

## 1) P0 — Bắt buộc (blocker trước khi chốt)

### 1.1 Container wrapper chuẩn cho dashboard
**Trạng thái:** ✅ Hoàn thành (đã chuẩn hoá container theo DashboardLayout).  
**Yêu cầu:**
- Tất cả page trong dashboard không tự bọc `p-8`, `max-w-* mx-auto` rải rác.
- Dùng wrapper chung từ `DashboardLayout` (`wrapContent` + `contentClassName`).
- Những trang cần scroll lock (messages) mới `wrapContent={false}`.

**Ghi chú rà soát (theo file):**
- **Student**
  - ✅ `src/app/dashboard/student/assignments/page.tsx` — ĐÃ bỏ `max-w-6xl mx-auto` (dùng DashboardLayout wrapper). Phần skeleton `bg-white/border-slate`, token hoá neutral và nút retry sẽ xử lý ở mục **2.2.4 Student assignments list**.
  - ✅ `src/app/dashboard/student/classes/[classId]/lessons/[lessonId]/page.tsx` — ĐÃ bỏ wrapper `max-w-6xl mx-auto px-* py-*` để tránh double padding (liên quan mục **2.2.3 Classroom subpages**).
- **Parent**
  - ✅ `src/app/dashboard/parent/progress/page.tsx` — Container page đã rely trên `ParentLayout` (không tự bọc max-width/padding riêng). Phần padding/token cho card/table nằm ở mục **2.3.1 Progress**.
  - ✅ `src/app/dashboard/parent/children/page.tsx` — Container OK (sử dụng `ParentLayout`). Loading/error state thống nhất và token hoá neutral được theo dõi ở mục **2.3.2 Children**.
- **Teacher**
  - ✅ `src/app/dashboard/teacher/courses/[courseId]/page.tsx` — Container/padding page-level đã dùng `TeacherLayout`. QA dialog/inputs còn hardcode được giữ ở mục **2.4 Teacher**.
  - ✅ `src/app/dashboard/teacher/assignments/[id]/page.tsx` — Container page-level đã chuẩn. Các block UI còn hardcode màu/token sẽ QA và dọn ở mục **2.4 Teacher**.

### 1.2 Mapping `RoleThemeProvider` đủ 4 role
**Trạng thái:** ✅ Hoàn thành.  
**Kết quả mong muốn:**
- `teacher` → `blue`
- `student` → `green`
- `parent` → `amber`
- `admin` → `violet`

---

## 2) P2 — Refactor pages theo role (Impact cao)

### 2.1 Cross-role patterns (áp dụng đồng thời)
**Trạng thái:** Chưa hoàn tất.  
**Cần thống nhất:**
- **Dashboard overview:** dùng pattern `Breadcrumb + PageHeader + StatsGrid + SectionCard`.
- **List pages:** header + filter bar + list/table + `EmptyState`/`Skeleton`/error block thống nhất.
- **Detail pages:** hero header + info cards + action bar + related lists.
- **Bulk actions:** selection bar + confirm dialog thống nhất UX.

### 2.2 Student
**Trạng thái:** ✅ Hoàn thành cho Student (đã dọn grades, assignment detail, classroom subpages, assignments list).

#### 2.2.1 `grades/page.tsx`
- ✅ `src/app/dashboard/student/grades/page.tsx`
  - Token hoá đã làm phần lớn.
  - ĐÃ tách badge/status thành helper tái dùng (giảm class string), table head/text đã dùng token.

#### 2.2.2 `assignments/[id]/page.tsx`
- ✅ `src/app/dashboard/student/assignments/[id]/page.tsx`
  - Token hoá neutral colors + bỏ nhiều cast `any` đã làm phần lớn (trước đó).
  - ĐÃ chuẩn hoá các block accent còn lại từ `bg-blue-50`/`bg-yellow-50` sang token phù hợp (amber/emerald) cho student.
  - Nút download dùng `<button>` với class token + focus ring đầy đủ, đáp ứng yêu cầu a11y.

#### 2.2.3 Classroom subpages
- ✅ `src/app/dashboard/student/classes/[classId]/lessons/page.tsx` (đã token hoá + focus ring token)
- ✅ `src/app/dashboard/student/classes/[classId]/assignments/page.tsx` (đã token hoá skeleton)
- ✅ `src/app/dashboard/student/classes/[classId]/lessons/[lessonId]/page.tsx` (đã bỏ wrapper để tránh double padding, rely DashboardLayout)
- ✅ `src/app/dashboard/student/classes/[classId]/courses/page.tsx` (placeholder đã token hoá neutral: border-border, bg-card, text-foreground/text-muted-foreground)
- ✅ `src/app/dashboard/student/classes/join/page.tsx` (form đã token hoá neutral: bg-card/border-border/text-muted-foreground)

#### 2.2.4 Student assignments list
- ✅ `src/app/dashboard/student/assignments/page.tsx`
  - ĐÃ bỏ `max-w-6xl mx-auto` (dùng DashboardLayout wrapper) và rely DashboardLayout cho container.
  - ĐÃ token hoá heading/description sang `text-foreground/text-muted-foreground`, skeleton sang `bg-card/bg-muted/border-border`, và đổi nút retry sang `Button` với token/focus ring chuẩn.
  - ĐÃ loại `(a as any).lockAt` trong sort: dùng trực tiếp `lockAt ?? dueDate` từ type `AssignmentT/StudentAssignment`.

### 2.3 Parent
**Trạng thái:** ✅ Hoàn thành.

#### 2.3.1 Progress
- ✅ `src/app/dashboard/parent/progress/page.tsx`
  - ĐÃ thay `text-gray-*` sang token (`text-foreground/text-muted-foreground`) trong danh sách học sinh và bảng điểm, giữ lại accent amber/orange cho vai trò parent.
  - Empty state/bảng dùng `EmptyState` + table với token neutral, không còn gray hardcode.

#### 2.3.2 Children
- ✅ `src/app/dashboard/parent/children/page.tsx`
  - Loading state dùng `HeaderParent` + card `Skeleton` thay vì text thuần "Đang tải...".
  - Error/empty state đã dùng `EmptyState` (variant parent) + `Button` amber, neutral trong form/card được token hoá.

### 2.4 Teacher
**Trạng thái:** ✅ Hoàn thành.

- ✅ `src/app/dashboard/teacher/classrooms/page.tsx`
  - Trang lớp học rely `TeacherLayout` + `DashboardLayout` cho bảo vệ quyền + container, không còn `ProtectedRoute` thừa ở cấp page.
  - Container/padding dùng `space-y-*`, không tự bọc max-width/p-*, phù hợp chuẩn dashboard.
- ✅ `src/app/dashboard/teacher/students/page.tsx`
  - ĐÃ thay các `<button>` hardcode (export, retry, refresh) sang `Button` với token/focus ring chuẩn.
  - View toggle "Danh sách/Bảng" được gắn `role="group"` + `aria-label`, giữ màu xanh teacher, focus-visible đầy đủ.

### 2.5 Teacher Exam Monitoring
**Trạng thái:** ✅ Hoàn thành (mức demo: token hoá + a11y, không đụng logic).

- ✅ `src/app/dashboard/teacher/exams/monitor/page.tsx`
  - ĐÃ thay `bg-gray-50`, `bg-white`, `bg-slate-50` sang `bg-muted/bg-card` và `border-border` cho các card/khung phân tích.
  - ĐÃ thay `text-gray-*` sang `text-foreground/text-muted-foreground` cho placeholder, bảng breakdown, mô tả analytics và stats.
  - Các nút hành động đã dùng `Button` với focus ring trước đó, giữ nguyên (đạt yêu cầu a11y). Không thay đổi mock data hay logic phức tạp.

---

## 3) P3 — A11y & QA

### 3.1 Card click / element click
**Trạng thái:** Chưa rà soát toàn bộ.

**Checklist bắt buộc:**
- Element có `onClick` nhưng không phải `<button>`:
  - Có `role="button"`, `tabIndex={0}`
  - `onKeyDown` hỗ trợ Enter/Space
  - Focus-visible rõ (`ring-ring` + `ring-offset-background`)
  - Tránh double-trigger khi nested interactive

**Cần grep/QA:**
-  ✅ `onClick={(...) => ...}` trên `div/article` trong dashboard components.

### 3.2 Dialog/Focus trap
-  ✅ QA `Dialog` đóng bằng `Esc`, tab order, focus trap.

---

## 4) Chạy kiểm tra cuối

**Bắt buộc PASS:**
- `npm run lint`
- `npm run build`

---

## 5) Cập nhật checklist gốc

Sau khi hoàn tất tất cả mục ở file này:
- Cập nhật `docs/BAO_CAO_RA_SOAT_UI_TEACHER_STUDENT_PARENT_ADMIN.md`:
  - tick ✅ các mục còn lại
  - ghi rõ các file đã refactor và kết quả `lint/build`.
