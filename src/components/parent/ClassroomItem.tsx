"use client";

import StudentItem from "./StudentItem";

interface Classroom {
  id: string;
  name: string;
  icon: string;
  students: Array<{
    id: string;
    fullname: string;
  }>;
}

interface ClassroomItemProps {
  classroom: Classroom;
  teacherId: string;
  onMessageTeacher: (teacherId: string, classroomId?: string) => void;
  sendingKey: string | null;
}

export default function ClassroomItem({
  classroom,
  teacherId,
  onMessageTeacher,
  sendingKey,
}: ClassroomItemProps) {
  return (
    <div className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/70 to-orange-50/50 rounded-lg p-5 space-y-4 hover:from-amber-100/70 hover:to-orange-100/50 transition-all duration-300 hover:shadow-md group">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center text-xl transition-transform duration-300 group-hover:scale-110 flex-shrink-0">
          {classroom.icon || "📘"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-foreground group-hover:text-amber-800 transition-colors duration-300 text-base">
            {classroom.name}
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-3 border-t border-amber-300/60">
        {classroom.students.map((student) => (
          <StudentItem
            key={student.id}
            student={student}
            teacherId={teacherId}
            classroomId={classroom.id}
            onMessageTeacher={onMessageTeacher}
            sendingKey={sendingKey}
          />
        ))}
      </div>
    </div>
  );
}
