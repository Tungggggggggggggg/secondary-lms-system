
# Báo cáo kế hoạch đánh giá hiệu suất hệ thống EduVerse (3 endpoint trọng tâm)

## 1) Mục tiêu & phạm vi

### 1.1 Mục tiêu
- **Chứng minh hiệu suất hệ thống bằng số liệu đo thật** thay cho “giả lập”.
- Đưa ra **bằng chứng định lượng** về:
  - Độ trễ phản hồi (latency) của các luồng cốt lõi.
  - Tỉ lệ lỗi (error rate) và các lỗi do rate-limit/điều kiện mạng.
  - Độ tin cậy ghi nhận sự kiện thi (reliability) đối với `ExamEvent`.

### 1.2 Phạm vi đo (giữ đúng 3 endpoint)
Đánh giá tập trung vào các endpoint đại diện cho 3 luồng có tải và giá trị cao nhất của hệ thống:

- **(E1)** `POST /api/ai/tutor/chat`  
  Luồng RAG Tutor (embedding + truy vấn pgvector + sinh nội dung).
- **(E2)** `POST /api/exam-events`  
  Luồng ghi log chống gian lận theo sự kiện (tần suất cao, gần real-time).
- **(E3)** `POST /api/ai/anti-cheat/summary`  
  Luồng AI tóm tắt phục vụ giảm tải giáo viên (lấy event + scoring + gọi Gemini).

> Lưu ý: Các chức năng khác của hệ thống được chứng minh bằng **kiểm thử chức năng (testcase/luồng nghiệp vụ)**. Phần này chỉ tập trung vào **hiệu suất** và **độ tin cậy** của các luồng trọng tâm.

---

## 2) Môi trường thực nghiệm (bắt buộc ghi rõ trong luận văn)

### 2.1 Môi trường triển khai
- **Máy chạy ứng dụng**: local Windows (mô tả CPU/RAM/OS version của bạn).
- **Runtime**: Next.js chạy `runtime = nodejs` (các API route server-side).
- **CSDL**: PostgreSQL trên **Supabase (remote)**.
- **Dịch vụ AI**: Gemini API (phụ thuộc mạng và hạn mức).

### 2.2 Lý do môi trường này hợp lệ
- Mô hình chạy local + DB remote phản ánh thực tế triển khai phổ biến (client/server qua Internet).
- Độ trễ đo được đã bao gồm các thành phần ảnh hưởng thật:
  - Network latency tới Supabase và Gemini.
  - Thời gian xử lý phía server ứng dụng.

---

## 3) Chỉ số đánh giá (Metrics) & tiêu chí báo cáo

### 3.1 Nhóm chỉ số hiệu suất API
Áp dụng cho E1/E2/E3:

- **Latency**:
  - `Average` (trung bình)
  - `P95` (95th percentile – phản ánh trải nghiệm đa số người dùng, tránh bị “đẹp giả”)
  - `Max` (xấu nhất)
- **Tỉ lệ lỗi**:
  - `ErrorRate = failedRequests / totalRequests`
  - Tách riêng nhóm lỗi:
    - `429 Too Many Requests` (do rate-limit)
    - `5xx` (lỗi hệ thống)
    - `4xx` (dữ liệu không hợp lệ / phân quyền)

### 3.2 Nhóm chỉ số độ tin cậy (Reliability) cho ExamEvent
Áp dụng cho E2:

- **Event Delivery Success Rate**:
  - `successRate = recordedEvents / sentEvents`
- Ghi rõ điều kiện:
  - Số event gửi, khoảng thời gian gửi, loại event, attempt.

---

## 4) Ràng buộc hệ thống (đặc biệt quan trọng để tránh đo sai)

### 4.1 Rate-limit hiện có (theo code)
- `POST /api/ai/tutor/chat`:
  - Theo IP: 20 request / 10 phút
  - Theo student: 20 request / 10 phút
- `POST /api/ai/anti-cheat/summary`:
  - Theo IP: 10 request / 10 phút
  - Theo teacher: 10 request / 10 phút
- `POST /api/exam-events`:
  - Hiện không thấy rate-limit trong file route (vẫn cần kiểm soát để tránh spam DB).

**Ý nghĩa khi thực nghiệm**:
- Thực nghiệm phải **tuân thủ rate-limit** để phản ánh vận hành thực tế.
- Không chạy stress test AI kiểu “100 users/1 phút” vì:
  - Sẽ bị 429 hàng loạt → không còn là đánh giá hiệu năng, mà là test chạm trần chính sách.

---

## 5) Thiết kế kịch bản đo (Test Scenarios)

### 5.1 Nguyên tắc thiết kế
- **Tái lập**: có thông số rõ (số request, dữ liệu đầu vào, khoảng nghỉ).
- **Thực tế**: mô phỏng hành vi thật của người dùng.
- **Không phá hệ thống**: tránh vượt rate-limit/đốt chi phí Gemini.

### 5.2 Kịch bản cho từng endpoint

#### (S1) Tutor Chat – E1: `POST /api/ai/tutor/chat`
- **Mục tiêu**: đo độ trễ end-to-end của pipeline RAG.
- **Tiền điều kiện dữ liệu**:
  - Student thuộc một lớp `classId`.
  - Có lesson đã được index embeddings (để không bị `noEmbeddings: true`).
- **Khối lượng đo đề xuất (kịp 3 ngày)**:
  - Tổng 15–20 request trong 10 phút (không vượt rate-limit).
  - Đầu vào ổn định:
    - `message` dài vừa phải (100–300 ký tự), 3–5 biến thể câu hỏi.
    - `topK` cố định (ví dụ 5).
    - `history` có/không có, nhưng nên cố định để so sánh.
- **Ghi nhận**:
  - avg/P95/max latency
  - số lần bị 429 (nếu có) và `Retry-After`

#### (S2) Exam Events – E2: `POST /api/exam-events`
- **Mục tiêu**:
  - Đo latency ghi sự kiện.
  - Đo reliability: ghi nhận đủ sự kiện không.
- **Tiền điều kiện dữ liệu**:
  - Student có quyền gửi event cho `assignmentId` (đúng classroom).
  - Có attempt number (hoặc null theo thiết kế).
- **Khối lượng đo đề xuất**:
  - Gửi **N = 200–500 events** (tuỳ thời gian).
  - Chọn 2–3 loại event phổ biến: `TAB_SWITCH`, `WINDOW_BLUR`, `FULLSCREEN_EXIT`.
  - Metadata nhỏ (tránh vượt `10_000` ký tự).
- **Đo reliability**:
  - `sentEvents = N`
  - `recordedEvents`: đếm số record tạo ra:
    - Cách 1: dùng teacher gọi `GET /api/exam-events` lọc theo `assignmentId + studentId + attempt` theo khoảng thời gian.
    - Cách 2 (nếu tiện): đếm trong Supabase dashboard.
  - Tính `successRate`.

#### (S3) Anti-cheat Summary – E3: `POST /api/ai/anti-cheat/summary`
- **Mục tiêu**:
  - Đo latency tạo tóm tắt AI cho giáo viên.
  - Ghi nhận ổn định khi lấy events + compute score + gọi Gemini.
- **Tiền điều kiện dữ liệu**:
  - Quiz assignment có đủ exam events (tối thiểu vài chục).
  - Teacher là owner assignment.
- **Khối lượng đo đề xuất**:
  - 8–10 request trong 10 phút (không vượt rate-limit).
  - Nếu muốn so sánh: chọn 2 mức dữ liệu
    - Attempt ít events (ví dụ 20–50)
    - Attempt nhiều events (gần 250 – là `take: 250`)
- **Ghi nhận**:
  - avg/P95/max latency
  - tỉ lệ lỗi JSON parse/model lỗi (502) nếu có

---

## 6) Thu thập số liệu (Data Collection) — “Số liệu ở đâu?”

### 6.1 Nguồn số liệu trong hệ thống
Hướng chuẩn là **instrument API** để ghi lại:
- Endpoint, method
- Thời gian xử lý (duration)
- Trạng thái thành công/thất bại
- Timestamp

Trong repo bạn đã có sẵn module:
- [src/lib/performance-monitor.ts](cci:7://file:///d:/Daihoc/Nam4/luanvan/secondary-lms-system/src/lib/performance-monitor.ts:0:0-0:0):
  - `withPerformanceTracking()`
  - `getPerformanceStats()`
  - `exportMetrics()`

### 6.2 Khoảng trống hiện tại (cần bổ sung để “lấy số liệu ra được”)
- [x] Metrics đang **in-memory** nhưng đã có “cổng xuất số liệu” tiện dùng.
- [x] Đã có endpoint admin-only để **xem/xuất metrics**:
  - `GET /api/performance?timeRangeMinutes=60`
- [x] Đã có cơ chế reset/clear metrics trước mỗi kịch bản:
  - `DELETE /api/performance`
- [x] Đã xuất và lưu metrics JSON theo kịch bản:
  - `docs/metrics/S1_metrics.json`
  - `docs/metrics/S2_metrics.json`
  - `docs/metrics/S3_metrics.json`

> Khi thầy hỏi “số liệu đâu?”, bạn trả lời:  
> **Số liệu được lấy từ metrics/log do hệ thống ghi nhận trong quá trình chạy thực nghiệm, sau đó tổng hợp vào bảng ở Chương 5.**

---

## 7) Cách tính toán & xử lý thống kê (để ra được P95)

### 7.1 Dữ liệu thô
Mỗi request sẽ có `duration` (ms) và `success`.

### 7.2 Công thức
- `Average` = trung bình duration
- `Max` = max duration
- `P95`:
  - Cách nhanh: export ra CSV/Excel → dùng `PERCENTILE.INC(range, 0.95)`
- `Error rate (%)` = `failed / total * 100`

### 7.3 Quy tắc trình bày
- Report theo từng endpoint, tách bảng.
- Nếu có 429, báo cáo riêng:
  - `%429` và giải thích do rate-limit (hành vi đúng thiết kế, không phải bug).

---

## 8) Kế hoạch triển khai theo timeline 3 ngày (rõ việc – rõ output)

### Ngày 1: Chuẩn bị & instrument
- **Output cần đạt**:
  - [x] 3 endpoint được gắn tracking (E1/E2/E3).
  - [x] Có cơ chế xuất metrics (API admin-only).
  - [x] Dataset test đủ (lesson có embeddings, quiz có events).
- **Checklist**:
  - Xác định `classId`, `lessonId`, `assignmentId`, `studentId`, `attempt`.
  - Đảm bảo `.env` có `GEMINI_API_KEY` và Supabase DB connection hoạt động.

### Ngày 2: Chạy thực nghiệm & thu thập
- **Output cần đạt**:
  - [x] Bộ metrics thô cho từng kịch bản S1/S2/S3.
  - [~] Reliability: có `sentEvents` và `recordedEvents` (khuyến nghị bổ sung bước đếm bản ghi thực tế để đưa vào bảng reliability riêng).
- **Checklist**:
  - Chạy đúng số request và có khoảng nghỉ để không vượt rate-limit AI.
  - Xuất metrics theo `timeRangeMinutes` đủ rộng (ví dụ 30–60 phút).
  - Lưu lại:
    - JSON metrics (hoặc log)
    - Bảng Excel tính avg/P95/max

### Ngày 3: Viết vào luận văn (Chương 5)
- **Output cần đạt**:
  - [x] Bảng “Kết quả thực nghiệm” đổi từ “giả lập” → “đo thật”.
  - [x] Có mô tả môi trường + phương pháp + hạn chế.
- **Checklist nội dung viết**:
  - Môi trường (local Windows + Supabase + Gemini)
  - Kịch bản S1/S2/S3
  - Bảng kết quả (avg/P95/max/error rate)
  - Thảo luận (vì sao AI dao động, ảnh hưởng mạng, rate-limit)
  - Hạn chế (chưa có vận hành dài hạn, dữ liệu benchmark hạn chế)

---

## 9) Mẫu bảng biểu (bạn có thể đưa vào Chương 5)

### 9.1 Bảng hiệu suất API (mẫu)
- **Cột**:
  - Endpoint
  - Số request
  - Avg latency
  - P95 latency
  - Max latency
  - Error rate
  - Ghi chú (429/rate-limit, lỗi Gemini…)

Ví dụ cấu trúc:
- `POST /api/ai/tutor/chat` | N=20 | avg=… | P95=… | max=… | error=… | phụ thuộc Gemini
- `POST /api/exam-events` | N=300 | avg=… | P95=… | max=… | error=… | ghi DB Supabase
- `POST /api/ai/anti-cheat/summary` | N=10 | avg=… | P95=… | max=… | error=… | take max 250 events

### 9.2 Bảng reliability ExamEvent (mẫu)
- AssignmentId / StudentId / Attempt
- Sent events (N)
- Recorded events (M)
- Success rate (%)
- Ghi chú (mất do mạng? timeout? lỗi payload?)

---

## 10) Rủi ro & cách xử lý (để không “toang” khi làm)

- **[R1: Tutor trả `noEmbeddings`]**
  - Xử lý: đảm bảo lesson đã index embeddings trước khi test.
- **[R2: Dính 429 rate-limit AI]**
  - Xử lý: giảm request/phút, thêm nghỉ 30–60s; báo cáo %429 như hành vi đúng thiết kế.
- **[R3: Độ trễ dao động lớn do mạng]**
  - Xử lý: báo cáo P95, ghi rõ thởi điểm đo, và thảo luận “phụ thuộc dịch vụ ngoài”.
- **[R4: Metrics bị mất do restart server]**
  - Xử lý: xuất metrics ngay sau khi chạy xong mỗi kịch bản; hoặc bổ sung endpoint export.
- **[R5: Chi phí Gemini tăng]**
  - Xử lý: giới hạn số request AI đúng mức tối thiểu (20 tutor + 10 summary).

---

## 11) Cách bạn trình bày với thầy (mẫu nói ngắn gọn)
- **“Em đánh giá hiệu suất theo 3 luồng trọng tâm của hệ thống: Tutor RAG, ghi ExamEvent, và AI Anti-cheat Summary. Em đo trực tiếp trên hệ thống chạy thật (local Windows, DB Supabase) bằng cách ghi nhận thởi gian xử lý mỗi request (avg/P95/max) và tỉ lệ lỗi. Dữ liệu đo được xuất từ hệ thống và tổng hợp thành bảng trong Chương 5, kèm mô tả môi trường đo và hạn chế do phụ thuộc Gemini và network.”**

---

# Trạng thái triển khai (cập nhật theo tiến độ hiện tại)
- [x] Tracking E1/E2/E3 đã có.
- [x] Export/clear metrics đã có qua `/api/performance`.
- [x] Đã chạy đủ 3 kịch bản S1/S2/S3 và lưu JSON metrics.
- [x] Đã cập nhật số liệu thật vào bảng Chương 5 trong `docs/luanvan/luanvan.tex`.
 - [x] Đã ước lượng reliability cho S2: 200/200 request POST `/api/exam-events` trả về 200 trong lần đo (successRate ≈ 100\%).



## 12) Quy trình chạy lại đánh giá (khi cần đo lại từ đầu)

1. **Chuẩn bị môi trường**
   - Đảm bảo server đang chạy (`npm run dev`), kết nối Supabase và `GEMINI_API_KEY` hoạt động.
   - Chuẩn bị sẵn dữ liệu test cho 3 kịch bản S1/S2/S3 như mô tả tại mục 5.2.
2. **Xử lý số liệu cũ (tuỳ chọn)**
   - Backup hoặc xoá các file metrics cũ trong `docs/metrics/`:
     - `S1_metrics.json`, `S2_metrics.json`, `S3_metrics.json`.
3. **Reset metrics trước mỗi kịch bản**
   - Trước khi bắt đầu S1, S2 hoặc S3, gọi:
     - `DELETE /api/performance` để xoá toàn bộ metrics đang lưu trong bộ nhớ.
4. **Chạy lại các kịch bản đo**
   - S1 – Tutor Chat: chạy lại số request và tempo như mục **(S1)**.
   - S2 – Exam Events: gửi lại N≈300 event như mục **(S2)** và ghi nhận `sentEvents`.
   - S3 – Anti‑cheat Summary: chạy lại 8–10 request như mục **(S3)**.
5. **Export metrics sau mỗi kịch bản**
   - Sau khi hoàn thành S1/S2/S3, lần lượt gọi:
     - `GET /api/performance?timeRangeMinutes=60` để lấy JSON metrics tương ứng.
   - Lưu nội dung response vào các file:
     - `docs/metrics/S1_metrics.json`
     - `docs/metrics/S2_metrics.json`
     - `docs/metrics/S3_metrics.json`
6. **Tính toán lại và cập nhật báo cáo**
   - Đưa `duration` và `success` từ các file JSON vào Excel.
   - Tính `Average`, `Max`, `P95`, `Error rate` theo công thức ở mục 7.
   - Cập nhật lại bảng kết quả trong Chương 5 của `docs/luanvan/luanvan.tex` theo số liệu mới.


   # Trạng thái triển khai (cập nhật theo tiến độ hiện tại)
- [x] Tracking E1/E2/E3 đã có.
- [x] Export/clear metrics đã có qua `/api/performance`.
- [x] Đã chạy đủ 3 kịch bản S1/S2/S3 và lưu JSON metrics.
- [x] Đã cập nhật số liệu thật vào bảng Chương 5 trong `docs/luanvan/luanvan.tex`.
 - [x] Đã ước lượng reliability cho S2: 200/200 request POST `/api/exam-events` trả về 200 trong lần đo (successRate ≈ 100\%).
