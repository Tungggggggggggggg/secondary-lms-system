import LessonDetailView from "@/components/student/lesson/LessonDetailView";

export default function StudentLessonDetailPage({ params }: { params: { classId: string; lessonId: string } }) {
  const { classId, lessonId } = params;
  return <LessonDetailView classId={classId} lessonId={lessonId} />;
}
