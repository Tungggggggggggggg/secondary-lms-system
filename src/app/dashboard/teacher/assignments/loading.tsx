import CardGridSkeleton from "@/components/shared/loading/CardGridSkeleton";
import PageHeaderRowSkeleton from "@/components/shared/loading/PageHeaderRowSkeleton";
import AssignmentListSkeleton from "@/components/teacher/assignments/AssignmentListSkeleton";

export default function LoadingTeacherAssignmentsPage() {
  return (
    <div className="space-y-6">
      <PageHeaderRowSkeleton titleClassName="h-10 w-64" actionClassName="h-10 w-44" actionsCount={1} />
      <CardGridSkeleton items={4} gridClassName="md:grid-cols-4 gap-6" itemClassName="h-[140px] rounded-2xl" />
      <AssignmentListSkeleton />
    </div>
  );
}
