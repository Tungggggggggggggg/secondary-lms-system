import CreateClassroom from "@/components/teacher/classroom/CreateClassroom";

export const metadata = {
  title: "Tạo lớp học mới | EduVerse",
  description: "Tạo một lớp học mới trên nền tảng EduVerse",
};

export default function NewClassroomPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold">🏫 Tạo lớp học mới</h1>
        <p className="text-gray-600 mt-2">
          Điền thông tin cơ bản để tạo một lớp học mới
        </p>
      </div>
      <CreateClassroom />
    </div>
  );
}