import PageHeaderRowSkeleton from "@/components/shared/loading/PageHeaderRowSkeleton";
import AdminTableSkeleton from "@/components/admin/AdminTableSkeleton";

export default function LoadingAdminUsersPage() {
  return (
    <div className="p-6 sm:p-8 space-y-6">
      <PageHeaderRowSkeleton titleClassName="h-10 w-56" actionsCount={0} />
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <tbody>
              <AdminTableSkeleton rows={8} cols={6} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
