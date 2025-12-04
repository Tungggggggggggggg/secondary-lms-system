"use client";

import { ClassroomResponse } from "@/types/classroom";
import ClassCard from "@/components/student/ClassCard";

type ViewMode = "grid" | "list";

interface ClassListProps {
  items: ClassroomResponse[];
  variant?: ViewMode;
}

export default function ClassList({ items, variant = "grid" }: ClassListProps) {
  if (variant === "list") {
    return (
      <div className="space-y-3">
        {items.map((classroom) => (
          <ClassCard
            key={classroom.id}
            id={classroom.id}
            name={classroom.name}
            icon={classroom.icon}
            code={classroom.code}
            teacherName={classroom.teacher?.fullname || "Giáo viên"}
            studentCount={classroom._count?.students || 0}
            joinedAt={classroom.joinedAt}
            compact
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {items.map((classroom) => (
        <ClassCard
          key={classroom.id}
          id={classroom.id}
          name={classroom.name}
          icon={classroom.icon}
          code={classroom.code}
          teacherName={classroom.teacher?.fullname || "Giáo viên"}
          studentCount={classroom._count?.students || 0}
          joinedAt={classroom.joinedAt}
        />
      ))}
    </div>
  );
}
