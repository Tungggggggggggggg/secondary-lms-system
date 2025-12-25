import CreateClassroomWizard from '@/components/teacher/classrooms/CreateClassroomWizard';
import Breadcrumb, { BreadcrumbItem } from '@/components/ui/breadcrumb';
import { PageHeader } from "@/components/shared";

export const metadata = {
  title: 'Tạo lớp học mới',
};

export default function NewClassroomPage() {
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard/teacher/dashboard' },
    { label: 'Lớp học', href: '/dashboard/teacher/classrooms' },
    { label: 'Tạo lớp học mới' },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl overflow-x-hidden">
      <Breadcrumb items={breadcrumbItems} color="blue" className="mb-2" />
      <PageHeader
        title="Tạo lớp học mới"
        subtitle="Hoàn thành 3 bước đơn giản để bắt đầu lớp học của bạn"
        role="teacher"
        size="sm"
      />

      <CreateClassroomWizard />
    </main>
  );
}
