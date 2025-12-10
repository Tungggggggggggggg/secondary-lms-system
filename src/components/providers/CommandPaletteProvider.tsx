"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Input from "@/components/ui/input";

interface CommandItem {
  id: string;
  label: string;
  href: string;
  section: string;
}

export default function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const allCommands: CommandItem[] = useMemo(() => {
    const cmds: CommandItem[] = [];

    const add = (arr: { label: string; href: string }[], section: string) => {
      arr.forEach((x) => cmds.push({ id: `${section}:${x.href}`, label: x.label, href: x.href, section }));
    };

    add(
      [
        { label: "Dashboard", href: "/dashboard/teacher/dashboard" },
        { label: "Lớp học", href: "/dashboard/teacher/classrooms" },
        { label: "Tin nhắn", href: "/dashboard/teacher/messages" },
        { label: "Bài tập", href: "/dashboard/teacher/assignments" },
        { label: "Giám sát thi", href: "/dashboard/teacher/exams/monitor" },
        { label: "Học sinh", href: "/dashboard/teacher/students" },
        { label: "Hồ sơ", href: "/dashboard/teacher/profile" },
      ],
      "Giáo viên"
    );

    add(
      [
        { label: "Dashboard", href: "/dashboard/student/dashboard" },
        { label: "Lớp học", href: "/dashboard/student/classes" },
        { label: "Tin nhắn", href: "/dashboard/student/messages" },
        { label: "Bài tập", href: "/dashboard/student/assignments" },
        { label: "Điểm số", href: "/dashboard/student/grades" },
        { label: "Gia đình", href: "/dashboard/student/family" },
        { label: "Hồ sơ", href: "/dashboard/student/profile" },
      ],
      "Học sinh"
    );

    add(
      [
        { label: "Dashboard", href: "/dashboard/parent/dashboard" },
        { label: "Con của tôi", href: "/dashboard/parent/children" },
        { label: "Tiến độ học tập", href: "/dashboard/parent/progress" },
        { label: "Tin nhắn", href: "/dashboard/parent/messages" },
        { label: "Hồ sơ", href: "/dashboard/parent/profile" },
      ],
      "Phụ huynh"
    );

    return cmds;
  }, [role]);

  const commands = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filterByRole = (item: CommandItem) => {
      if (!role) return item.section !== "Admin";
      if (role === "TEACHER") return item.section === "Giáo viên";
      if (role === "STUDENT") return item.section === "Học sinh";
      if (role === "PARENT") return item.section === "Phụ huynh";
      return false;
    };
    return allCommands.filter(filterByRole).filter((c) => !q || c.label.toLowerCase().includes(q) || c.href.toLowerCase().includes(q));
  }, [allCommands, query, role]);

  const onSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl" onClose={() => setOpen(false)}>
          <div className="p-4 border-b">
            <Input placeholder="Tìm kiếm... (Ctrl+K)" value={query} onChange={(e: any) => setQuery(e.target.value)} />
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {commands.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">Không tìm thấy kết quả</div>
            ) : (
              <ul className="divide-y">
                {commands.map((c) => (
                  <li key={c.id}>
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
                      onClick={() => onSelect(c.href)}
                    >
                      <span className="text-sm font-medium text-gray-900">{c.label}</span>
                      <span className="text-xs text-gray-400">{c.section}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {children}
    </>
  );
}
