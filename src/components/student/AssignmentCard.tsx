"use client";

import Link from "next/link";
import PriorityBadge, { type PriorityLevel } from "@/components/shared/PriorityBadge";
import TimeAgo from "@/components/shared/TimeAgo";

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
    <Link href={`/dashboard/student/assignments/${id}`} className="block">
      <div
        className={`border-l-4 ${priorityBorderMap[priority]} ${priorityBgMap[priority]} rounded-r-xl p-4 hover:shadow-md transition-all duration-200 cursor-pointer group`}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <PriorityBadge priority={priority} size="sm" />
          <span className="text-xs text-gray-500 whitespace-nowrap">
            <TimeAgo date={dueDate} short />
          </span>
        </div>
        <h4 className="font-bold text-gray-800 mb-1 group-hover:text-indigo-700 transition-colors line-clamp-2">
          {title}
        </h4>
        <p className="text-sm text-gray-600">{classroomName}</p>
      </div>
    </Link>
  );
}
