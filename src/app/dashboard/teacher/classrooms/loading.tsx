import PageHeaderRowSkeleton from "@/components/shared/loading/PageHeaderRowSkeleton";
import ClassroomListSkeleton from "@/components/teacher/classrooms/ClassroomListSkeleton";

export default function LoadingTeacherClassroomsPage() {
  return (
    <div className="space-y-6">
      <PageHeaderRowSkeleton titleClassName="h-10 w-56" actionClassName="h-10 w-40" actionsCount={1} />
      <ClassroomListSkeleton items={6} />
    </div>
  );
}
