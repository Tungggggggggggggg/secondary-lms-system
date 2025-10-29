import CreateClassroom from '@/components/teacher/classrooms/CreateClassroom';

export const metadata = {
  title: 'Tạo lớp học mới',
};

export default function NewClassroomPage() {
  return (
    <main>
      <CreateClassroom />
    </main>
  );
}
