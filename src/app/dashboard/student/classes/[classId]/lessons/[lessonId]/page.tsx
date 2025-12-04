import LessonDetailView from "@/components/student/lesson/LessonDetailView";

export default function StudentLessonDetailPage({ params }: { params: { classId: string; lessonId: string } }) {
  const { classId, lessonId } = params;
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <LessonDetailView classId={classId} lessonId={lessonId} />
    </div>
  );
}
