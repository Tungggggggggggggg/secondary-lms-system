# Báo cáo việc còn lại cần hoàn thành — UI Refactor (Teacher / Student / Parent / Admin)

**Ngày:** 2025-12-19  
**Mục tiêu:** Hoàn tất refactor UI theo role (token hoá neutral colors + chuẩn focus ring), chuẩn hoá layout/pattern trang, đảm bảo `npm run lint` và `npm run build` PASS, sau đó cập nhật checklist gốc.

---

## 1) P0 — Bắt buộc (blocker trước khi chốt)

### 1.1 Container wrapper chuẩn cho dashboard
**Trạng thái:** Đang làm (còn sót vài trang).  
**Yêu cầu:**
- Tất cả page trong dashboard không tự bọc `p-8`, `max-w-* mx-auto` rải rác.
- Dùng wrapper chung từ `DashboardLayout` (`wrapContent` + `contentClassName`).
- Những trang cần scroll lock (messages) mới `wrapContent={false}`.

**Cần rà soát còn lại (ưu tiên):**
- **Student**
  - `src/app/dashboard/student/assignments/page.tsx` (còn `max-w-6xl mx-auto` + skeleton `bg-white/border-slate`)
  - `src/app/dashboard/student/classes/[classId]/lessons/[lessonId]/page.tsx` (wrapper `max-w-6xl mx-auto px-* py-*` dễ double padding)
- **Parent**
  - `src/app/dashboard/parent/progress/page.tsx` (nhiều block layout tự padding)
  - `src/app/dashboard/parent/children/page.tsx`
- **Teacher**
  - `src/app/dashboard/teacher/courses/[courseId]/page.tsx` (đã dọn phần chính, cần QA dialog/inputs còn hardcode không)
  - `src/app/dashboard/teacher/assignments/[id]/page.tsx` (đã dọn phần lớn, cần QA các block còn hardcode)

### 1.2 Mapping `RoleThemeProvider` đủ 4 role
**Trạng thái:** Hoàn thành.  
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
**Trạng thái:** Đang làm.

#### 2.2.1 `grades/page.tsx`
- `src/app/dashboard/student/grades/page.tsx`
  - Token hoá đã làm phần lớn.
  - **Còn lại:** tách badge/status thành component tái dùng (giảm class string), QA lại table head/text token.

#### 2.2.2 `assignments/[id]/page.tsx`
- `src/app/dashboard/student/assignments/[id]/page.tsx`
  - Token hoá neutral colors + bỏ nhiều cast `any` đã làm phần lớn.
  - **Còn lại:**
    - Loại nốt `any` còn sót (nếu có) trong parse submission/files.
    - Chuẩn hoá các block còn `bg-blue-50`/`bg-yellow-50` (giữ accent hợp lý nhưng cần thống nhất border/text).
    - Chuẩn hoá button download (nên dùng `Button` nếu muốn thống nhất, hoặc giữ `<button>` nhưng phải có focus ring token).

#### 2.2.3 Classroom subpages
- `src/app/dashboard/student/classes/[classId]/lessons/page.tsx` ✅ (đã token hoá + focus ring token)
- `src/app/dashboard/student/classes/[classId]/assignments/page.tsx` ✅ (đã token hoá skeleton)
- **Còn lại cần dọn:**
  - `src/app/dashboard/student/classes/[classId]/lessons/[lessonId]/page.tsx` (bỏ wrapper để tránh double padding)
  - `src/app/dashboard/student/classes/[classId]/courses/page.tsx` (placeholder đang `text-gray/border-gray`)
  - `src/app/dashboard/student/classes/join/page.tsx` (form còn `bg-white/border-gray`)

#### 2.2.4 Student assignments list
- `src/app/dashboard/student/assignments/page.tsx`
  - **Cần làm:**
    - Bỏ `max-w-6xl mx-auto` (dùng DashboardLayout wrapper)
    - Token hoá `text-slate-*`, skeleton `bg-white/border-slate`, và nút retry (đang là `<button>`)
    - Loại `(a as any).lockAt` trong sort: dùng type `AssignmentT` đã có `lockAt`.

### 2.3 Parent
**Trạng thái:** Chưa làm.

#### 2.3.1 Progress
- `src/app/dashboard/parent/progress/page.tsx`
  - **Cần làm:** thay `text-gray-*` → token (`text-foreground/text-muted-foreground`) và chuẩn hoá empty state/table.

#### 2.3.2 Children
- `src/app/dashboard/parent/children/page.tsx`
  - **Cần làm:** chuẩn loading/error state thống nhất (`Skeleton`/`EmptyState`), token hoá neutral.

### 2.4 Teacher
**Trạng thái:** Chưa chốt.

- `src/app/dashboard/teacher/classrooms/page.tsx`
  - Bỏ `ProtectedRoute` thừa (đã có ở layout)
  - Chuẩn container/padding
- `src/app/dashboard/teacher/students/page.tsx`
  - Thay các `<button>` hardcode sang `Button` (hoặc ít nhất chuẩn focus ring token)
  - Chuẩn hoá view toggle a11y + colors

### 2.5 Teacher Exam Monitoring
**Trạng thái:** Chưa làm.

- `src/app/dashboard/teacher/exams/monitor/page.tsx` (hoặc `src/components/teacher/exam/ExamMonitoringDashboard.tsx`)
  - Hiện có nhiều hardcode `bg-gray/text-gray/bg-white`.
  - Cần quyết định hướng:
    - Nếu là sản phẩm thật: refactor theo primitives/tokens, bỏ mocks/console.log.
    - Nếu là demo: tối thiểu token hoá + đảm bảo a11y/focus ring.

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
- `onClick={(...) => ...}` trên `div/article` trong dashboard components.

### 3.2 Dialog/Focus trap
- QA `Dialog` đóng bằng `Esc`, tab order, focus trap.

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
