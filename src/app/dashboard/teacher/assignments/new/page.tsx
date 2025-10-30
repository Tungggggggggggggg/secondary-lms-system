"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

type QuizOption = { label: string; content: string; isCorrect: boolean };
type QuizQuestion = {
    content: string;
    type: "SINGLE" | "MULTIPLE";
    options: QuizOption[];
};

export default function NewAssignmentPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [tab, setTab] = useState<"ESSAY" | "QUIZ">("ESSAY");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState<string>("");

    // Quiz state
    const [questions, setQuestions] = useState<QuizQuestion[]>([
        {
            content: "",
            type: "SINGLE",
            options: [
                { label: "A", content: "", isCorrect: false },
                { label: "B", content: "", isCorrect: false },
            ],
        },
    ]);

    // Thêm state cho câu hỏi tự luận
    const [essayQuestion, setEssayQuestion] = useState<string>("");

    const isPastDate = (input: string) => {
        if (!input) return false;
        return new Date(input) < new Date();
    };

    const addQuestion = () => {
        setQuestions((prev) => [
            ...prev,
            {
                content: "",
                type: "SINGLE",
                options: [
                    { label: "A", content: "", isCorrect: false },
                    { label: "B", content: "", isCorrect: false },
                ],
            },
        ]);
    };

    const removeQuestion = (idx: number) => {
        setQuestions((prev) => prev.filter((_, i) => i !== idx));
    };

    const addOption = (qIdx: number) => {
        setQuestions((prev) =>
            prev.map((q, i) => {
                if (i !== qIdx) return q;
                const nextLabel = String.fromCharCode(65 + q.options.length);
                return {
                    ...q,
                    options: [
                        ...q.options,
                        { label: nextLabel, content: "", isCorrect: false },
                    ],
                };
            })
        );
    };

    const removeOption = (qIdx: number, oIdx: number) => {
        setQuestions((prev) =>
            prev.map((q, i) => {
                if (i !== qIdx) return q;
                const filtered = q.options.filter((_, j) => j !== oIdx);
                // Re-label
                const relabeled = filtered.map((opt, j) => ({
                    ...opt,
                    label: String.fromCharCode(65 + j),
                }));
                return { ...q, options: relabeled };
            })
        );
    };

    const toggleCorrect = (qIdx: number, oIdx: number) => {
        setQuestions((prev) =>
            prev.map((q, i) => {
                if (i !== qIdx) return q;
                if (q.type === "SINGLE") {
                    return {
                        ...q,
                        options: q.options.map((opt, j) => ({
                            ...opt,
                            isCorrect: j === oIdx,
                        })),
                    };
                }
                return {
                    ...q,
                    options: q.options.map((opt, j) =>
                        j === oIdx ? { ...opt, isCorrect: !opt.isCorrect } : opt
                    ),
                };
            })
        );
    };

    const submit = async () => {
        try {
            if (!title.trim()) {
                toast({ title: "Vui lòng nhập tiêu đề bài tập", variant: "destructive" });
                return;
            }
            if (isPastDate(dueDate)) {
                toast({ title: "Hạn nộp phải là ngày trong tương lai", variant: "destructive" });
                return;
            }
            if (tab === "ESSAY" && !essayQuestion.trim()) {
                toast({ title: "Vui lòng nhập nội dung câu hỏi tự luận!", variant: "destructive" });
                return;
            }
            const payload: Record<string, unknown> = {
                title,
                description: description || null,
                dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                type: tab,
            };
            if (tab === "ESSAY") {
                payload.questions = [
                    { content: essayQuestion.trim(), type: "ESSAY", order: 1 },
                ];
            }
            if (tab === "QUIZ") {
                if (questions.length === 0) {
                    toast({ title: "Quiz cần ít nhất 1 câu hỏi", variant: "destructive" });
                    return;
                }
                payload.questions = questions.map((q, idx) => ({
                    content: q.content,
                    type: q.type,
                    order: idx + 1,
                    options: q.options.map((o) => ({
                        label: o.label,
                        content: o.content,
                        isCorrect: o.isCorrect,
                    })),
                }));
            }

            const res = await fetch("/api/assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                console.error("[CREATE ASSIGNMENT] error:", data);
                toast({ title: "Tạo bài tập thất bại", description: data?.message, variant: "destructive" });
                return;
            }
            toast({ title: "Đã tạo bài tập thành công", variant: "success" });
            router.push("/dashboard/teacher/assignments");
        } catch (e) {
            console.error("[CREATE ASSIGNMENT] unexpected:", e);
            toast({ title: "Có lỗi xảy ra, vui lòng thử lại", variant: "destructive" });
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-10 px-4 md:px-0">
            {/* Nút quay về */}
            <button
                className="mb-6 px-5 py-2 flex items-center gap-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm"
                onClick={() => router.back()}
            >
                <span className="text-lg">←</span> Quay về danh sách bài tập
            </button>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-3xl font-extrabold text-gray-800">
                    Tạo bài tập mới
                </h1>
                <div className="flex gap-3">
                    <button
                        onClick={() => setTab("ESSAY")}
                        className={`px-4 py-2 rounded-xl ${
                            tab === "ESSAY"
                                ? "bg-purple-600 text-white"
                                : "bg-white border text-gray-700"
                        }
                        `}
                    >
                        Tự luận
                    </button>
                    <button
                        onClick={() => setTab("QUIZ")}
                        className={`px-4 py-2 rounded-xl ${
                            tab === "QUIZ"
                                ? "bg-purple-600 text-white"
                                : "bg-white border text-gray-700"
                        }
                        `}
                    >
                        Trắc nghiệm
                    </button>
                </div>
            </div>
            <div className="bg-white rounded-2xl shadow p-6 space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Tiêu đề *
                    </label>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none"
                        placeholder="VD: Kiểm tra 15 phút - Lịch sử tuần 3"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Mô tả
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none"
                        placeholder="Mô tả ngắn về yêu cầu bài tập (tuỳ chọn)"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Hạn nộp *
                    </label>
                    <input
                        type="datetime-local"
                        value={dueDate}
                        min={new Date().toISOString().slice(0, 16)}
                        onChange={(e) => setDueDate(e.target.value)}
                        className={`w-full px-4 py-3 border-2 ${
                            isPastDate(dueDate)
                                ? "border-red-500"
                                : "border-gray-200"
                        } rounded-xl focus:border-purple-500 outline-none`}
                    />
                    {isPastDate(dueDate) && (
                        <div className="text-red-500 mt-1 text-sm">
                            Ngày hạn nộp phải là ở tương lai!
                        </div>
                    )}
                </div>
                {tab === "ESSAY" && (
                    <div className="bg-purple-50 rounded-xl border-l-4 border-purple-500 p-6 mt-2 flex flex-col gap-3">
                        {/* Thêm input nhập câu hỏi tự luận */}
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Câu hỏi/Đề bài tự luận *
                        </label>
                        <textarea
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none bg-white"
                            rows={2}
                            placeholder="Nhập nội dung câu hỏi/đề bài tự luận..."
                            value={essayQuestion}
                            onChange={(e) => setEssayQuestion(e.target.value)}
                        />
                        <div className="text-xs text-gray-500 mb-1 mt-1">
                            Học sinh sẽ nộp văn bản hoặc file. Giáo viên có thể
                            chỉ định rõ định dạng (ví dụ PDF, Word...) hoặc gợi
                            ý cách trình bày.
                        </div>
                        <div className="py-2 pl-3 mt-2 bg-white shadow-inner rounded-xl border border-indigo-100 max-w-[350px] mx-auto">
                            <div className="flex items-center gap-1 mb-2 text-xs text-gray-400">
                                <span>👤</span>Mẫu KQ học sinh nộp:
                            </div>
                            <div className="text-sm text-gray-800 whitespace-pre-line">
                                {
                                    "File: Bai_tap_lich_su.pdf\n   Hoặc nội dung văn bản ở đây..."
                                }
                            </div>
                        </div>
                        <ul className="list-disc pl-6 text-purple-800 mt-1 text-xs">
                            <li>
                                Bạn có thể mô tả chi tiết ở phần trên cho rõ yêu
                                cầu
                            </li>
                            <li>
                                Học sinh tự viết dài hoặc upload file đáp án
                            </li>
                            <li>Kết quả sẽ hiển thị tại trang chấm bài tập</li>
                        </ul>
                    </div>
                )}
                {tab === "QUIZ" && (
                    <div className="space-y-6">
                        {questions.map((q, idx) => (
                            <div
                                key={idx}
                                className="border border-gray-200 rounded-xl p-4 bg-gray-50"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-indigo-700">
                                        Câu {idx + 1}
                                    </h3>
                                    <div className="flex gap-2">
                                        <select
                                            value={q.type}
                                            onChange={(e) =>
                                                setQuestions((prev) =>
                                                    prev.map((qq, i) =>
                                                        i === idx
                                                            ? {
                                                                  ...qq,
                                                                  type: e.target
                                                                      .value as
                                                                      | "SINGLE"
                                                                      | "MULTIPLE",
                                                                  options:
                                                                      qq.options.map(
                                                                          (
                                                                              opt
                                                                          ) => ({
                                                                              ...opt,
                                                                              isCorrect:
                                                                                  false,
                                                                          })
                                                                      ),
                                                              }
                                                            : qq
                                                    )
                                                )
                                            }
                                            className="px-3 py-2 border rounded-lg bg-white"
                                        >
                                            <option value="SINGLE">
                                                Chọn 1 đáp án
                                            </option>
                                            <option value="MULTIPLE">
                                                Chọn nhiều đáp án
                                            </option>
                                        </select>
                                        <button
                                            onClick={() => removeQuestion(idx)}
                                            className="px-3 py-2 border rounded-lg text-red-600 text-xs"
                                        >
                                            Xoá câu
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    value={q.content}
                                    onChange={(e) =>
                                        setQuestions((prev) =>
                                            prev.map((qq, i) =>
                                                i === idx
                                                    ? {
                                                          ...qq,
                                                          content:
                                                              e.target.value,
                                                      }
                                                    : qq
                                            )
                                        )
                                    }
                                    rows={3}
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none mb-3"
                                    placeholder="Nhập nội dung câu hỏi"
                                />
                                <div className="space-y-2">
                                    {q.options.map((opt, j) => (
                                        <div
                                            key={j}
                                            className="flex items-center gap-3"
                                        >
                                            <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-semibold">
                                                {opt.label}
                                            </span>
                                            <input
                                                value={opt.content}
                                                onChange={(e) =>
                                                    setQuestions((prev) =>
                                                        prev.map((qq, i) =>
                                                            i === idx
                                                                ? {
                                                                      ...qq,
                                                                      options:
                                                                          qq.options.map(
                                                                              (
                                                                                  oo,
                                                                                  k
                                                                              ) =>
                                                                                  k ===
                                                                                  j
                                                                                      ? {
                                                                                            ...oo,
                                                                                            content:
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                        }
                                                                                      : oo
                                                                          ),
                                                                  }
                                                                : qq
                                                        )
                                                    )
                                                }
                                                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none"
                                                placeholder="Nội dung đáp án"
                                            />
                                            <label className="flex items-center gap-2 text-sm">
                                                <input
                                                    type={
                                                        q.type === "SINGLE"
                                                            ? "radio"
                                                            : "checkbox"
                                                    }
                                                    name={`q-${idx}`}
                                                    checked={!!opt.isCorrect}
                                                    onChange={() =>
                                                        toggleCorrect(idx, j)
                                                    }
                                                />
                                                <span>Đúng</span>
                                            </label>
                                            <button
                                                onClick={() =>
                                                    removeOption(idx, j)
                                                }
                                                className="px-3 py-2 border rounded-lg text-xs"
                                            >
                                                Xoá
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3">
                                    <button
                                        onClick={() => addOption(idx)}
                                        className="px-3 py-2 bg-gray-100 rounded-lg text-xs"
                                    >
                                        + Thêm đáp án
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={addQuestion}
                            className="px-4 py-2 bg-gradient-to-l from-indigo-100 to-purple-100 rounded-xl"
                        >
                            + Thêm câu hỏi
                        </button>
                    </div>
                )}
                <div className="pt-4 flex justify-end gap-3">
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-3 border border-red-400 text-red-600 rounded-xl font-semibold hover:bg-red-50"
                    >
                        Huỷ tạo bài
                    </button>
                    <button
                        onClick={submit}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow hover:brightness-110 font-bold"
                    >
                        Tạo bài tập
                    </button>
                </div>
            </div>
        </div>
    );
}
