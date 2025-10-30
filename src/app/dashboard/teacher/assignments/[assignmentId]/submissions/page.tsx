"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Submission {
  id: string;
  content: string;
  grade?: number;
  feedback?: string;
  submittedAt: string;
  student?: {
    id: string;
    fullname: string;
    email: string;
  };
}

/**
 * Trang chấm bài assignment submissions
 */
export default function AssignmentSubmissionsPage() {
  const params = useParams() as { assignmentId: string };
  const { assignmentId } = params;

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        setLoading(true);
        setError(null);
        // Gọi API submissions (cần backend support: /api/assignments/[id]/submissions)
        const res = await fetch(`/api/assignments/${assignmentId}/submissions`);
        const result = await res.json();
        if (!result.success) {
          setError(result.message || "Không lấy được submissions");
          setSubmissions([]);
          console.error('[SubmissionsPage] API trả về lỗi:', result.message);
          return;
        }
        setSubmissions(result.data as Submission[]);
        console.log('[SubmissionsPage] Lấy submissions thành công:', result.data);
      } catch (err: unknown) {
        let msg = 'Lỗi không xác định';
        if (err instanceof Error) msg = err.message;
        setError(msg);
        setSubmissions([]);
        console.error('[SubmissionsPage] Lỗi khi fetch:', err);
      } finally {
        setLoading(false);
      }
    }
    if (assignmentId) fetchSubmissions();
  }, [assignmentId]);

  if (loading) return <div className="py-10 text-center text-gray-500">Đang tải danh sách submissions...</div>;
  if (error) return <div className="py-10 text-center text-red-500">Lỗi: {error}</div>;
  if (!submissions.length) return <div className="py-10 text-center text-gray-400">Chưa có học sinh nào nộp bài cho assignment này.</div>;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">📝 Danh sách bài nộp</h1>
      <div className="space-y-6">
        {submissions.map((s) => (
          <div key={s.id} className="bg-white p-6 rounded-2xl shadow flex justify-between items-center">
            <div>
              <div className="font-semibold">{s.student?.fullname || 'Không rõ tên'} ({s.student?.email})</div>
              <div className="text-sm text-gray-500">Nộp lúc: {new Date(s.submittedAt).toLocaleString()}</div>
              <div className="mt-2 text-gray-800 whitespace-pre-wrap">{s.content}</div>
            </div>
            <div className="text-right">
              <div>
                <span className="font-bold">{s.grade ?? '-'} điểm</span>
              </div>
              <div className="text-xs text-gray-400 mt-2">Feedback: {s.feedback || '(chưa có)'}</div>
              {/* TODO: Nút chấm, cập nhật điểm, feedback... */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
