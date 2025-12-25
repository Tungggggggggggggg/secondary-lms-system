export default function Page({ params }: { params: { childId: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Bài tập của học sinh {params.childId}</h1>
      <p className="text-gray-500 mt-2">Trang đang được phát triển.</p>
    </div>
  );
}



