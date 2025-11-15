export default function Page({ params }: { params: { courseId: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Chi tiết khóa học {params.courseId}</h1>
      <p className="text-gray-500 mt-2">Trang đang được phát triển.</p>
    </div>
  );
}

