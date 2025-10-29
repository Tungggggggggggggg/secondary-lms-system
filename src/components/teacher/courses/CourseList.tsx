"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function CourseList() {
  const router = useRouter();
  const { toast } = useToast();

  const courses = [
    {
      id: 1,
      icon: "📜",
      color: "from-yellow-400 to-yellow-500",
      name: "Lịch sử - Lớp 8",
      students: 32,
      progress: 75,
      status: "Đang diễn ra",
      lastUpdated: "2 giờ trước"
    },
    {
      id: 2,
      icon: "🗺️",
      color: "from-emerald-400 to-emerald-500",
      name: "Địa lý - Lớp 9",
      students: 28,
      progress: 60,
      status: "Đang diễn ra",
      lastUpdated: "5 giờ trước"
    },
    {
      id: 3,
      icon: "🗣️",
      color: "from-blue-400 to-blue-500", 
      name: "Tiếng Anh - Lớp 7",
      students: 35,
      progress: 45,
      status: "Đang diễn ra",
      lastUpdated: "1 ngày trước"
    }
  ];

  const handleCourseClick = (courseId: number) => {
    router.push(`/dashboard/teacher/courses/${courseId}`);
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {courses.map((course) => (
        <div
          key={course.id}
          onClick={() => handleCourseClick(course.id)}
          className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-14 h-14 bg-gradient-to-r ${course.color} rounded-xl flex items-center justify-center text-2xl`}>
              {course.icon}
            </div>
            <div className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
              {course.status}
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-800 mb-2">{course.name}</h3>
          
          <div className="flex items-center gap-2 text-gray-600 mb-4">
            <span className="text-sm">👥 {course.students} học sinh</span>
            <span className="text-gray-300">•</span>
            <span className="text-sm">🕒 {course.lastUpdated}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Tiến độ khóa học</span>
              <span className="font-medium text-gray-800">{course.progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${course.color} rounded-full`}
                style={{ width: `${course.progress}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}