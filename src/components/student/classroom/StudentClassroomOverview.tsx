"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentAnnouncements } from "@/hooks/use-student-announcements";
import { Button } from "@/components/ui/button";

export default function StudentClassroomOverview() {
  const params = useParams();
  const classId = params.classId as string;
  const { announcements, isLoading, error, fetchAnnouncements, getAttachmentDownloadUrl } = useStudentAnnouncements();

  useEffect(() => {
    if (classId) fetchAnnouncements(classId, 1, 10);
  }, [classId, fetchAnnouncements]);

  async function handleDownload(fileId: string, fallbackName: string) {
    const url = await getAttachmentDownloadUrl(fileId);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = fallbackName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Bảng tin lớp</h2>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-sm text-gray-500">Chưa có thông báo nào.</div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">{a.author?.fullname || "Giáo viên"}</span>
                <span className="ml-2">•</span>
                <span className="ml-2">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
              <div className="whitespace-pre-line text-gray-800 mb-3">{a.content}</div>
              {a.attachments && a.attachments.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                  <div className="font-medium mb-1">Đính kèm</div>
                  <ul className="space-y-1">
                    {a.attachments.map((f) => (
                      <li key={f.id} className="flex items-center justify-between gap-3">
                        <span className="truncate" title={f.name}>
                          {f.name} <span className="text-xs text-gray-400">({Math.round(f.size / 1024)} KB)</span>
                        </span>
                        <Button size="sm" variant="outline" onClick={() => handleDownload(f.id, f.name)}>Tải</Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

