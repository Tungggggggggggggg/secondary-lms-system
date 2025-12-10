"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClassroom } from "@/hooks/use-classroom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import Link from "next/link";

interface JoinByCodePageProps {
  params: {
    code: string;
  };
}

export default function JoinByCodePage({ params }: JoinByCodePageProps) {
  const router = useRouter();
  const { joinClassroom, isLoading } = useClassroom();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const rawCode = params.code || "";
      const code = rawCode.trim().toUpperCase();

      if (!code) {
        setError("Mã lớp trong đường dẫn không hợp lệ.");
        return;
      }

      const classroom = await joinClassroom(code);

      if (classroom) {
        toast({
          title: "Thành công",
          description: "Đã tham gia lớp học thành công!",
          variant: "success",
        });
        router.replace(`/dashboard/student/classes/${classroom.id}`);
      } else {
        setError("Không thể tham gia lớp học. Vui lòng kiểm tra lại mã hoặc đăng nhập bằng tài khoản học sinh.");
      }
    };

    run();
  }, [params.code, joinClassroom, router, toast]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
      {!error ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm text-gray-700">Đang xử lý yêu cầu tham gia lớp học...</p>
          <p className="text-xs text-gray-500">Nếu trình duyệt không tự chuyển trang sau vài giây, hãy thử làm mới lại.</p>
        </div>
      ) : (
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center space-y-4">
          <h1 className="text-lg font-semibold text-gray-900">Không thể tham gia lớp học</h1>
          <p className="text-sm text-gray-700">{error}</p>
          <p className="text-xs text-gray-500">
            Hãy đảm bảo bạn đã đăng nhập bằng tài khoản học sinh, sau đó truy cập trang
            <span className="font-mono mx-1">Lớp học &gt; Tham gia lớp</span> và nhập lại mã lớp.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-2">
            <Link
              href="/auth/login"
              className="inline-flex justify-center items-center px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Đăng nhập
            </Link>
            <Link
              href="/dashboard/student/classes/join"
              className="inline-flex justify-center items-center px-4 py-2 rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Về trang tham gia lớp
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
