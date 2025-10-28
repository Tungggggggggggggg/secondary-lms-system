// src/app/student/classes/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ClassesPage() {
  // TODO: fetch từ API
  const classes = [
    {
      id: "cls_1",
      name: "Lịch sử 8A",
      teacher: "Thầy Nguyễn Văn An",
      subject: "history",
      progress: { completed: 8, total: 12 },
      pendingAssignments: 3,
    },
    // thêm dữ liệu mẫu...
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Lớp học của tôi</h1>
        <Link href="/dashboard/student/classes/join">
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Tham gia lớp mới
          </Button>
        </Link>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Bạn chưa tham gia lớp học nào.</p>
          <Link href="/dashboard/student/classes/join">
            <Button>Tham gia lớp học đầu tiên</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <Link key={cls.id} href={`/dashboard/student/classes/${cls.id}`}>
              <div className="border rounded-lg p-5 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-lg">{cls.name}</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {cls.subject === "history" ? "Lịch sử" : cls.subject === "geography" ? "Địa lý" : "Tiếng Anh"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">GV: {cls.teacher}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{cls.progress.completed}/{cls.progress.total} bài học</span>
                    <span className="text-orange-600">
                      {cls.pendingAssignments} bài tập chưa làm
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(cls.progress.completed / cls.progress.total) * 100}%` }}
                    />
                  </div>
                </div>

                <p className="text-sm text-blue-600 mt-3 font-medium">Xem chi tiết →</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}