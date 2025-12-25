import { useCallback, useState } from "react";

export function useCreatePost() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPost = useCallback(async (classroomId: string, content: string, files: File[] = []) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await fetch(`/api/classrooms/${classroomId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Không thể đăng thông báo");
      const created = json.data as { id: string };
      if (created?.id && files.length > 0) {
        for (const f of files) {
          const form = new FormData();
          form.append("file", f);
          const up = await fetch(`/api/announcements/${created.id}/attachments`, { method: "POST", body: form });
          if (!up.ok) {
            // continue best-effort for remaining files
          }
        }
      }
      return created;
    } catch (e: any) {
      setError(e?.message || "Có lỗi xảy ra");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { isSubmitting, error, createPost };
}


