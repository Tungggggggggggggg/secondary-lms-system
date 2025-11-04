"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import NewsFeedList from "@/components/newsfeed/NewsFeedList";

export default function StudentClassroomOverview() {
  const params = useParams();
  const classId = params.classId as string;

  useEffect(() => {}, [classId]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Bảng tin lớp</h2>
      {classId && <NewsFeedList classroomId={classId} />}
    </div>
  );
}

