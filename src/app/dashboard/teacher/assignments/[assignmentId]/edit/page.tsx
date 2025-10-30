"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface Option {
    id: string;
    label: string;
    content: string;
    isCorrect: boolean;
    order?: number;
}
interface Question {
    id: string;
    content: string;
    type: "ESSAY" | "SINGLE" | "MULTIPLE";
    order: number;
    options?: Option[];
}
interface AssignmentDetail {
    id: string;
    title: string;
    description?: string;
    dueDate?: string;
    type: "ESSAY" | "QUIZ";
    createdAt: string;
    updatedAt: string;
    questions?: Question[];
}

/**
 * Trang chỉnh sửa bài tập - Cho phép sửaMetadata, sửa danh sách câu hỏi (quiz/essay), validate mạnh
 */
export default function AssignmentEditPage() {
    const { toast } = useToast(); // Đặt trong thân hàm function!
    const params = useParams() as { assignmentId: string };
    const { assignmentId } = params;
    const router = useRouter();

    const [detail, setDetail] = useState<AssignmentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Thêm state cho quản lý câu hỏi (phục vụ editable quiz/essay)
    // đồng bộ với dữ liệu detail nếu dạng QUIZ
    const [questions, setQuestions] = useState<Question[]>([]);

    // Đồng bộ questions khi có detail mới
    useEffect(() => {
        if (detail && detail.questions)
            setQuestions(detail.questions as Question[]);
    }, [detail]);

    // Handler thêm/sửa/xóa câu hỏi
    const handleAddQuestion = () => {
        setQuestions((prev) => [
            ...prev,
            {
                id: "temp-" + Math.random().toString(36).substring(2),
                content: "",
                type: detail?.type === "ESSAY" ? "ESSAY" : "SINGLE",
                options:
                    detail?.type === "QUIZ"
                        ? [
                              {
                                  label: "A",
                                  content: "",
                                  isCorrect: false,
                                  id: "opt-" + Math.random(),
                              },
                              {
                                  label: "B",
                                  content: "",
                                  isCorrect: false,
                                  id: "opt-" + Math.random(),
                              },
                          ]
                        : undefined,
                order: questions.length + 1,
            } as Question,
        ]);
    };
    const handleRemoveQuestion = (qIdx: number) => {
        setQuestions((prev) => prev.filter((_, i) => i !== qIdx));
    };
    const handleUpdateQuestion = (qIdx: number, data: Partial<Question>) => {
        setQuestions((prev) =>
            prev.map((q, i) => (i === qIdx ? { ...q, ...data } : q))
        );
    };
    // Sửa option của quiz question
    const handleUpdateOption = (
        qIdx: number,
        oIdx: number,
        data: Partial<Option>
    ) => {
        setQuestions((prev) =>
            prev.map((q, i) => {
                if (i !== qIdx || !q.options) return q;
                return {
                    ...q,
                    options: q.options.map((o, j) =>
                        j === oIdx ? { ...o, ...data } : o
                    ),
                };
            })
        );
    };
    const handleAddOption = (qIdx: number) => {
        setQuestions((prev) =>
            prev.map((q, i) => {
                if (i !== qIdx || !q.options) return q;
                const nextLabel = String.fromCharCode(65 + q.options.length);
                return {
                    ...q,
                    options: [
                        ...q.options,
                        {
                            id: "opt-" + Math.random(),
                            label: nextLabel,
                            content: "",
                            isCorrect: false,
                        },
                    ],
                };
            })
        );
    };
    const handleRemoveOption = (qIdx: number, oIdx: number) => {
        setQuestions((prev) =>
            prev.map((q, i) => {
                if (i !== qIdx || !q.options) return q;
                const filtered = q.options.filter((_, j) => j !== oIdx);
                const relabeled = filtered.map((o, j) => ({
                    ...o,
                    label: String.fromCharCode(65 + j),
                }));
                return { ...q, options: relabeled };
            })
        );
    };
    const handleToggleCorrect = (qIdx: number, oIdx: number) => {
        setQuestions((prev) =>
            prev.map((q, i) => {
                if (i !== qIdx || !q.options) return q;
                if (q.type === "SINGLE") {
                    return {
                        ...q,
                        options: q.options.map((o, j) => ({
                            ...o,
                            isCorrect: j === oIdx,
                        })),
                    };
                }
                return {
                    ...q,
                    options: q.options.map((o, j) =>
                        j === oIdx ? { ...o, isCorrect: !o.isCorrect } : o
                    ),
                };
            })
        );
    };
    // Handler submit/lưu
    const handleSave = async () => {
        try {
            // Validate mạnh
            if (!detail?.title || !detail.type) {
                toast({
                    title: "Thiếu thông tin bài tập!",
                    variant: "destructive",
                });
                return;
            }
            if (detail.type === "QUIZ") {
                if (
                    !questions ||
                    !Array.isArray(questions) ||
                    questions.length === 0
                ) {
                    toast({
                        title: "Quiz cần ít nhất 1 câu hỏi!",
                        variant: "destructive",
                    });
                    return;
                }
                for (const [i, q] of questions.entries()) {
                    if (!q.content?.trim()) {
                        toast({
                            title: `Câu hỏi số ${i + 1} thiếu nội dung!`,
                            variant: "destructive",
                        });
                        return;
                    }
                    if (!q.options || q.options.length < 2) {
                        toast({
                            title: `Câu hỏi số ${i + 1} cần ít nhất 2 đáp án!`,
                            variant: "destructive",
                        });
                        return;
                    }
                    if (
                        q.type === "SINGLE" &&
                        !q.options.some((o: Option) => o.isCorrect)
                    ) {
                        toast({
                            title: `Câu hỏi số ${
                                i + 1
                            } (Single) phải có đáp án đúng!`,
                            variant: "destructive",
                        });
                        return;
                    }
                    if (
                        q.type === "MULTIPLE" &&
                        !q.options.some((o: Option) => o.isCorrect)
                    ) {
                        toast({
                            title: `Câu hỏi ${
                                i + 1
                            } (Multiple) cần ít nhất 1 đáp án đúng!`,
                            variant: "destructive",
                        });
                        return;
                    }
                }
            }
            setLoading(true);
            // Gọi API cập nhật (PUT hoặc POST có id)
            const res = await fetch(`/api/assignments/${detail.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...detail, questions }),
            });
            const result = await res.json();
            if (!res.ok || !result.success) {
                toast({
                    title: result.message || "Cập nhật thất bại!",
                    variant: "destructive",
                });
                console.error("[EditAssignment] Lỗi cập nhật:", result);
                return;
            }
            toast({
                title: "Đã lưu thay đổi!",
                description: "Bài tập đã được cập nhật thành công.",
                variant: "success",
            });
            router.push(`/dashboard/teacher/assignments/${detail.id}`);
        } catch (err) {
            toast({ title: "Có lỗi khi lưu!", variant: "destructive" });
            console.error("[EditAssignment] Lỗi lưu:", err);
        } finally {
            setLoading(false);
        }
    };

    // Lấy dữ liệu chi tiết assignment
    useEffect(() => {
        async function fetchDetail() {
            try {
                setLoading(true);
                setError(null);
                const res = await fetch(`/api/assignments/${assignmentId}`);
                const result = await res.json();
                if (!result.success) {
                    setError(
                        result.message || "Không lấy được dữ liệu bài tập"
                    );
                    setDetail(null);
                    console.error(
                        "[EditAssignment] API trả về lỗi:",
                        result.message
                    );
                    return;
                }
                setDetail(result.data as AssignmentDetail);
                console.log(
                    "[EditAssignment] Lấy chi tiết bài tập thành công:",
                    result.data
                );
            } catch (err: unknown) {
                let msg = "Lỗi không xác định";
                if (err instanceof Error) msg = err.message;
                setError(msg);
                setDetail(null);
                console.error("[EditAssignment] Lỗi khi fetch:", err);
            } finally {
                setLoading(false);
            }
        }
        if (assignmentId) fetchDetail();
    }, [assignmentId]);

    if (loading)
        return (
            <div className="py-12 text-center text-gray-500 animate-pulse">
                Đang tải dữ liệu...
            </div>
        );
    if (error)
        return (
            <div className="py-12 text-center text-red-500">Lỗi: {error}</div>
        );
    if (!detail)
        return (
            <div className="py-12 text-center text-gray-400">
                Không tìm thấy bài tập.
            </div>
        );

    return (
        <div className="max-w-3xl mx-auto py-10 px-4 md:px-0">
            {/* Nút Back/Huỷ */}
            <div className="flex items-center gap-3 mb-7">
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 rounded-xl text-base flex items-center gap-2 bg-gradient-to-r from-gray-100 to-red-100 hover:from-red-200 hover:to-gray-100 text-gray-700 font-semibold"
                >
                    <span>←</span> Huỷ / Quay về
                </button>
                <span className="text-lg font-bold">Chỉnh sửa bài tập</span>
            </div>
            <div className="bg-white p-7 rounded-2xl shadow flex flex-col gap-8">
                {/* Thông tin metadata bài tập */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                    <div className="flex-1">
                        <label className="text-sm font-semibold text-gray-700">
                            Tiêu đề
                        </label>
                        <input
                            type="text"
                            className="w-full border px-4 py-2 rounded-lg mt-2 bg-gray-50"
                            value={detail.title}
                            readOnly
                        />
                        <label className="text-sm font-semibold text-gray-700 mt-5">
                            Mô tả
                        </label>
                        <textarea
                            className="w-full border px-4 py-2 rounded-lg mt-2 bg-gray-50"
                            value={detail.description ?? ""}
                            readOnly
                        />
                    </div>
                    <div className="flex flex-col items-end gap-2 min-w-[180px] mt-3 md:mt-0">
                        <span
                            className={`inline-block px-4 py-1 rounded-full text-xs font-semibold border ${
                                detail.type === "ESSAY"
                                    ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                                    : "bg-pink-50 border-pink-300 text-pink-700"
                            } `}
                        >
                            {detail.type === "ESSAY"
                                ? "Tự luận"
                                : "Trắc nghiệm"}
                        </span>
                        <span className="text-xs text-gray-500">
                            Hạn nộp:{" "}
                            {detail.dueDate
                                ? new Date(detail.dueDate).toLocaleString()
                                : "Không rõ"}
                        </span>
                    </div>
                </div>
                {/* Form chỉnh sửa câu hỏi */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-lg font-bold text-indigo-700 flex items-center gap-1">
                            <span>📄</span> Danh sách câu hỏi
                        </h2>
                        <button
                            onClick={handleAddQuestion}
                            className="text-sm px-4 py-2 bg-gradient-to-br from-indigo-100 to-pink-100 rounded-full font-medium hover:brightness-110"
                        >
                            + Thêm câu hỏi
                        </button>
                    </div>
                    <ol className="space-y-6">
                        {questions.map((q, idx) => (
                            <li
                                key={q.id}
                                className={`border-l-4 rounded-xl shadow bg-white px-5 py-4 ${
                                    q.type === "ESSAY"
                                        ? "border-indigo-400"
                                        : "border-pink-400"
                                } space-y-2`}
                            >
                                <div className="flex items-center gap-3">
                                    <input
                                        value={q.content}
                                        onChange={(e) =>
                                            handleUpdateQuestion(idx, {
                                                content: e.target.value,
                                            })
                                        }
                                        placeholder={`Nội dung câu hỏi ${
                                            idx + 1
                                        }`}
                                        className="flex-1 px-4 py-2 border-b border-gray-200 focus:border-purple-400 outline-none text-base bg-gray-50"
                                    />
                                    <select
                                        value={q.type}
                                        onChange={(e) =>
                                            handleUpdateQuestion(idx, {
                                                type: e.target
                                                    .value as Question["type"],
                                            })
                                        }
                                        className="px-3 py-2 border rounded-lg bg-white"
                                    >
                                        <option value="ESSAY">Tự luận</option>
                                        <option value="SINGLE">
                                            Trắc nghiệm 1 đáp án
                                        </option>
                                        <option value="MULTIPLE">
                                            Trắc nghiệm nhiều đáp án
                                        </option>
                                    </select>
                                    <button
                                        onClick={() =>
                                            handleRemoveQuestion(idx)
                                        }
                                        className="ml-3 px-3 py-2 text-xs rounded-lg bg-red-50 hover:bg-red-200 text-red-700 font-semibold"
                                    >
                                        Xoá
                                    </button>
                                </div>
                                {q.type !== "ESSAY" && (
                                    <div className="pl-7 pt-2 space-y-2">
                                        {q.options?.map(
                                            (opt: Option, oIdx: number) => (
                                                <div
                                                    key={opt.id || oIdx}
                                                    className="flex items-center gap-3"
                                                >
                                                    <span className="w-7 h-7 flex items-center justify-center rounded-lg shadow bg-gray-100 font-semibold">
                                                        {opt.label}
                                                    </span>
                                                    <input
                                                        value={opt.content}
                                                        onChange={(e) =>
                                                            handleUpdateOption(
                                                                idx,
                                                                oIdx,
                                                                {
                                                                    content:
                                                                        e.target
                                                                            .value,
                                                                }
                                                            )
                                                        }
                                                        placeholder="Nội dung đáp án"
                                                        className="flex-1 px-3 py-2 border-b border-gray-200 bg-gray-50"
                                                    />
                                                    <label className="flex items-center gap-2 text-xs">
                                                        <input
                                                            type={
                                                                q.type ===
                                                                "SINGLE"
                                                                    ? "radio"
                                                                    : "checkbox"
                                                            }
                                                            name={`q-${idx}`}
                                                            checked={
                                                                !!opt.isCorrect
                                                            }
                                                            onChange={() =>
                                                                handleToggleCorrect(
                                                                    idx,
                                                                    oIdx
                                                                )
                                                            }
                                                        />
                                                        <span>Đúng</span>
                                                    </label>
                                                    <button
                                                        onClick={() =>
                                                            handleRemoveOption(
                                                                idx,
                                                                oIdx
                                                            )
                                                        }
                                                        className="text-xs px-2 py-1 bg-gray-50 rounded-lg hover:bg-gray-200"
                                                    >
                                                        Xoá
                                                    </button>
                                                </div>
                                            )
                                        )}
                                        <button
                                            onClick={() => handleAddOption(idx)}
                                            className="mt-1 px-3 py-1 bg-gradient-to-r from-indigo-50 to-purple-50 rounded text-xs"
                                        >
                                            + Thêm đáp án
                                        </button>
                                    </div>
                                )}
                                {q.type === "ESSAY" && (
                                    <div className="ml-8 px-4 py-1 text-indigo-500 text-xs italic">
                                        Câu hỏi tự luận, học sinh tự viết đáp
                                        án.
                                    </div>
                                )}
                            </li>
                        ))}
                    </ol>
                </div>
                {/* Hành động lưu */}
                <div className="flex justify-end gap-4 mt-8">
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-3 border rounded-xl hover:bg-gray-100"
                    >
                        Huỷ thay đổi
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow font-bold hover:brightness-110"
                    >
                        Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    );
}
