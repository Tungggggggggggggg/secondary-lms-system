# HƯỚNG DẪN CÀI ĐẶT & BIÊN DỊCH LaTeX (Windows) – Luận văn `luanvan.tex`

Tài liệu này hướng dẫn đầy đủ cách cài đặt LaTeX và biên dịch luận văn cho repo `secondary-lms-system` trên **Windows**, theo đúng cấu hình đã setup trong dự án.

---

## 1) Tổng quan nhanh

- **File chính**: `docs/luanvan/luanvan.tex`
- **Engine bắt buộc**: **LuaLaTeX** hoặc **XeLaTeX**
  - Lý do: file dùng `fontspec` và cấu hình tiếng Việt qua `babel`.
  - **Không dùng `pdflatex`** (sẽ lỗi với `fontspec`).
- **Công cụ build khuyến nghị**: `latexmk`
  - `latexmk` giúp tự chạy đủ lượt để cập nhật `toc/lof/lot`, tự chạy bib nếu có, và hỗ trợ chế độ watch.
- Trên Windows, lựa chọn cài đặt nhanh và ổn định:
  - **MiKTeX** + **Strawberry Perl** (để `latexmk` hoạt động).

---

## 2) Chuẩn bị

### 2.1 Kiểm tra `winget`

Mở **PowerShell** và chạy:

```powershell
winget --version
```

Nếu ra version (ví dụ `v1.x`) là OK.

---

## 3) Cài đặt LaTeX (MiKTeX)

### 3.1 Cài MiKTeX bằng `winget`

```powershell
winget install --id MiKTeX.MiKTeX --source winget --accept-source-agreements --accept-package-agreements
```

Sau khi cài xong, **mở PowerShell mới** (để PATH cập nhật) rồi kiểm tra:

```powershell
where.exe lualatex
where.exe xelatex
where.exe miktex-console
```

Nếu ra đường dẫn dạng `...\MiKTeX\miktex\bin\x64\...` là OK.

### 3.2 Bật auto-install package của MiKTeX

MiKTeX có thể tự tải các package thiếu khi biên dịch. Bật chế độ này bằng:

```powershell
initexmf --set-config-value "[MPM]AutoInstall=1"
```

---

## 4) Cài `latexmk` (và vì sao cần Perl)

MiKTeX có `latexmk.exe`, nhưng để chạy được thì hệ thống cần **Perl**.

### 4.1 Cài Strawberry Perl bằng `winget`

```powershell
winget install --id StrawberryPerl.StrawberryPerl --source winget --accept-source-agreements --accept-package-agreements
```

Mở PowerShell mới và kiểm tra:

```powershell
where.exe perl
perl -v
latexmk -v
```

Nếu `latexmk -v` chạy được là OK.

---

## 5) Font tiếng Việt (khuyến nghị)

File `luanvan.tex` ưu tiên font **Noto Serif**. Nếu máy bạn chưa có, trước đây sẽ gặp lỗi kiểu:

- `Package fontspec Error: The font "NotoSerif" cannot be found.`

Trong dự án hiện tại, file đã có **fallback**:

- Nếu có `Noto Serif` → dùng `Noto Serif`
- Nếu không có → thử `Times New Roman`
- Nếu vẫn không có → dùng `Latin Modern Roman`

### 5.1 (Tuỳ chọn) Cài `Noto Serif`

Bạn có thể tải từ Google Fonts và cài vào Windows:

- Tải `Noto Serif` (Regular/Bold/Italic/BoldItalic)
- Chuột phải file `.ttf` → Install

---

## 6) Cấu trúc thư mục LaTeX trong repo

Khuyến nghị giữ tất cả file luận văn trong:

- `docs/luanvan/`

Trong đó:

- **Nên giữ**:
  - `luanvan.tex` (source)
  - `luanvan.pdf` (tuỳ bạn muốn commit hay không)

- **File sinh ra khi build (artifact) – không nên commit**:
  - `.aux`, `.toc`, `.lof`, `.lot`, `.out`, `.fls`, `.fdb_latexmk`, `.synctex.gz`, ...

Repo đã được thêm rule `.gitignore` để ignore các artifact trong `docs/luanvan/`.

---

## 7) Cách biên dịch (compile) luận văn

### 7.1 Cách 1 (khuyến nghị): dùng `latexmk` với LuaLaTeX

#### Cách chạy khi đang đứng ở **root repo**

```powershell
latexmk -lualatex -interaction=nonstopmode -file-line-error docs/luanvan/luanvan.tex
```

#### Cách chạy khi đang đứng trong thư mục `docs/luanvan/`

```powershell
latexmk -lualatex -interaction=nonstopmode -file-line-error luanvan.tex
```

### 7.2 Cách 2: dùng `latexmk` với XeLaTeX

```powershell
latexmk -xelatex -interaction=nonstopmode -file-line-error docs/luanvan/luanvan.tex
```

### 7.3 Cách 3 (không khuyến nghị bằng `latexmk`): chạy trực tiếp `lualatex`

```powershell
lualatex -interaction=nonstopmode -file-line-error docs/luanvan/luanvan.tex
```

Lưu ý: thường cần **chạy 2 lần** để mục lục/cross-reference cập nhật đầy đủ.

---

## 8) Chế độ tự build khi bạn vừa lưu file (watch)

Rất hữu ích khi bạn đang viết luận văn.

Chạy:

```powershell
latexmk -pvc -lualatex -interaction=nonstopmode -file-line-error docs/luanvan/luanvan.tex
```

- Mỗi lần bạn **Save** file `.tex` → nó tự biên dịch lại.
- Dừng: nhấn `Ctrl + C`.

---

## 9) Dọn rác build (khi gặp lỗi lạ hoặc muốn sạch thư mục)

### 9.1 Xoá artifact nhưng giữ PDF

```powershell
latexmk -c docs/luanvan/luanvan.tex
```

### 9.2 Xoá cả artifact và PDF

```powershell
latexmk -C docs/luanvan/luanvan.tex
```

---

## 10) Lỗi thường gặp & cách xử lý

### 10.1 Lỗi: `latexmk` báo thiếu Perl

**Triệu chứng**:
- `MiKTeX could not find the script engine 'perl' which is required to execute 'latexmk'.`

**Cách sửa**:
- Cài Strawberry Perl:

```powershell
winget install --id StrawberryPerl.StrawberryPerl --source winget --accept-source-agreements --accept-package-agreements
```

Rồi mở terminal mới và kiểm tra:

```powershell
perl -v
latexmk -v
```

### 10.2 Lỗi: `fontspec` không tìm thấy font

**Triệu chứng**:
- `Package fontspec Error: The font "NotoSerif" cannot be found.`

**Cách xử lý**:
- Cài `Noto Serif` vào Windows, hoặc
- Giữ cơ chế fallback trong `luanvan.tex` (đã có sẵn).

### 10.3 Lỗi: dùng sai engine (pdflatex)

**Triệu chứng**:
- Lỗi liên quan `fontspec`/Unicode.

**Cách sửa**:
- Luôn dùng:
  - `latexmk -lualatex ...` hoặc `latexmk -xelatex ...`

### 10.4 MiKTeX nhắc “chưa check updates”

**Triệu chứng**:
- `latexmk: major issue: So far, you have not checked for MiKTeX updates.`

**Cách xử lý**:
- Mở **MiKTeX Console** → tab Updates → Check for updates → Update.

### 10.5 Build ra PDF nhưng log có warning Overfull \hbox

**Triệu chứng**:
- `Overfull \hbox ...`

**Ý nghĩa**:
- Không phải lỗi; chỉ là một dòng bị tràn lề.

**Cách xử lý**:
- Có thể chỉnh lại câu, hoặc cho phép xuống dòng tốt hơn, hoặc giảm độ dài đường dẫn/code trong `\texttt{...}`.

---

## 11) Gợi ý setup VS Code (tuỳ chọn)

Nếu bạn dùng VS Code + LaTeX Workshop:

- Chọn recipe `latexmk (lualatex)` hoặc cấu hình tool `latexmk` với `-lualatex`.
- Đảm bảo VS Code dùng đúng `latexmk`/`lualatex` trong PATH.

---

## 12) Checklist nhanh (copy/paste)

- `winget --version`
- Cài MiKTeX ✅
- `where lualatex` ✅
- `initexmf --set-config-value "[MPM]AutoInstall=1"` ✅
- Cài Strawberry Perl ✅
- `perl -v` ✅
- `latexmk -v` ✅
- Build:

```powershell
latexmk -lualatex -interaction=nonstopmode -file-line-error docs/luanvan/luanvan.tex
```

---

**Kết quả mong đợi**: tạo file `docs/luanvan/luanvan.pdf` và build lại được sau mỗi lần bạn cập nhật nội dung.
