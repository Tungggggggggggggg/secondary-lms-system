import Link from "next/link";

export default function ClassroomNotFound() {
    return (
        <div className="mx-auto max-w-md text-center py-16">
            <h2 className="text-2xl font-semibold mb-2">Không tìm thấy lớp học</h2>
            <p className="text-sm text-gray-500 mb-6">Lớp học bạn tìm không tồn tại hoặc bạn không có quyền truy cập.</p>
            <Link href="/dashboard/teacher/classrooms" className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                Quay lại danh sách lớp
            </Link>
        </div>
    );
}


