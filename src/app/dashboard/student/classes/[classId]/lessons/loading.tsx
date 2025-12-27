import CardListSkeleton from "@/components/shared/loading/CardListSkeleton";
import PageHeaderRowSkeleton from "@/components/shared/loading/PageHeaderRowSkeleton";

export default function LoadingStudentLessonsListPage() {
  return (
    <div className="space-y-6">
      <PageHeaderRowSkeleton titleClassName="h-10 w-40" actionClassName="h-10 w-56" actionsCount={1} />
      <CardListSkeleton items={3} showChips={false} />
    </div>
  );
}
