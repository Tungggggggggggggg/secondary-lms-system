"use client";

import Link from "next/link";
import { PriorityBadge, type PriorityLevel } from "@/components/shared";
import { TimeAgo } from "@/components/shared";

interface AssignmentCardProps {
  id: string;
  title: string;
  classroomName: string;
  dueDate: string;
  priority: PriorityLevel;
}

export default function AssignmentCard({
  id,
  title,
  classroomName,
  dueDate,
  priority,
}: AssignmentCardProps) {
  const priorityBorderMap = {
    urgent: "border-red-500",
    high: "border-yellow-500",
    normal: "border-blue-500",
  };

  const priorityBgMap = {
    urgent: "bg-red-50",
    high: "bg-yellow-50",
    normal: "bg-blue-50",
  };

  return (
    <Link
      href={`/dashboard/student/assignments/${id}`}
      className="block rounded-r-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div
        className={`border-l-4 ${priorityBorderMap[priority]} ${priorityBgMap[priority]} rounded-r-xl p-4 hover:shadow-md transition-all duration-200 group`}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <PriorityBadge priority={priority} size="sm" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            <TimeAgo date={dueDate} short />
          </span>
        </div>
        <h4 className="font-bold text-foreground mb-1 group-hover:text-indigo-700 transition-colors line-clamp-2">
          {title}
        </h4>
        <p className="text-sm text-muted-foreground">{classroomName}</p>
      </div>
    </Link>
  );
}
