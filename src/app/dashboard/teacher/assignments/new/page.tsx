"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type QuizOption = { label: string; content: string; isCorrect: boolean };
type QuizQuestion = {
    content: string;
    type: "SINGLE" | "MULTIPLE";
    options: QuizOption[];
};

export default function NewAssignmentPage() {
    const router = useRouter();
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
                toast.error("Vui lòng nhập tiêu đề bài tập");
                return;
            }
            const payload: any = {
                title,
                description: description || null,
                dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                type: tab,
            };
            if (tab === "QUIZ") {
                if (questions.length === 0) {
                    toast.error("Quiz cần ít nhất 1 câu hỏi");
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
                toast.error(data?.message || "Tạo bài tập thất bại");
                return;
            }
            toast.success("Đã tạo bài tập thành công");
            router.push("/dashboard/teacher/assignments");
        } catch (e) {
            console.error("[CREATE ASSIGNMENT] unexpected:", e);
            toast.error("Có lỗi xảy ra, vui lòng thử lại");
        }
    };

    return (
        <div className="p-8">
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
                        }`}
                    >
                        Tự luận
                    </button>
                    <button
                        onClick={() => setTab("QUIZ")}
                        className={`px-4 py-2 rounded-xl ${
                            tab === "QUIZ"
                                ? "bg-purple-600 text-white"
                                : "bg-white border text-gray-700"
                        }`}
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
                        placeholder="Mô tả ngắn về yêu cầu bài tập"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Hạn nộp
                    </label>
                    <input
                        type="datetime-local"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none"
                    />
                </div>

                {tab === "ESSAY" && (
                    <div className="p-4 bg-purple-50 rounded-xl text-purple-800 text-sm">
                        Bài tập tự luận: học sinh sẽ nộp văn bản/tệp. Bạn có thể
                        thêm hướng dẫn chi tiết trong mô tả.
                    </div>
                )}

                {tab === "QUIZ" && (
                    <div className="space-y-6">
                        {questions.map((q, idx) => (
                            <div
                                key={idx}
                                className="border border-gray-200 rounded-xl p-4"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-gray-800">
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
                                                                      .value as any,
                                                                  options:
                                                                      qq.options.map(
                                                                          (
                                                                              o
                                                                          ) => ({
                                                                              ...o,
                                                                              isCorrect:
                                                                                  false,
                                                                          })
                                                                      ),
                                                              }
                                                            : qq
                                                    )
                                                )
                                            }
                                            className="px-3 py-2 border rounded-lg"
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
                                            className="px-3 py-2 border rounded-lg text-red-600"
                                        >
                                            Xóa câu
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
                                                className="px-3 py-2 border rounded-lg"
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3">
                                    <button
                                        onClick={() => addOption(idx)}
                                        className="px-3 py-2 bg-gray-100 rounded-lg"
                                    >
                                        + Thêm đáp án
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={addQuestion}
                            className="px-4 py-2 bg-gray-100 rounded-xl"
                        >
                            + Thêm câu hỏi
                        </button>
                    </div>
                )}

                <div className="pt-4 flex justify-end gap-3">
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-3 border rounded-xl"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={submit}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl"
                    >
                        Tạo bài tập
                    </button>
                </div>
            </div>
        </div>
    );
}
