import { BarChart3, CheckCircle, ClipboardList, Users } from "lucide-react";
import { StatsGrid, type StatItem } from "@/components/shared";

const statsItems: StatItem[] = [
  {
    color: "from-coolors-primary to-coolors-primary/80",
    icon: <Users className="h-5 w-5" aria-hidden />,
    label: "Lớp học đang hoạt động",
    value: "32+",
    subtitle: "Sẵn sàng cho việc mở rộng thêm",
  },
  {
    color: "from-coolors-highlight to-coolors-accent",
    icon: <ClipboardList className="h-5 w-5" aria-hidden />,
    label: "Bài tập đã giao",
    value: "1.2K+",
    subtitle: "Bài tập được tổ chức và lưu trữ an toàn",
  },
  {
    color: "from-coolors-accent to-coolors-secondary",
    icon: <CheckCircle className="h-5 w-5" aria-hidden />,
    label: "Bài nộp đã chấm",
    value: "980+",
    subtitle: "Giảm tải công việc chấm bài thủ công",
  },
  {
    color: "from-coolors-secondary to-coolors-primary",
    icon: <BarChart3 className="h-5 w-5" aria-hidden />,
    label: "Tỉ lệ hoàn thành",
    value: "86%",
    subtitle: "Minh họa cho khả năng theo dõi tiến độ",
  },
];

export default function SystemStatsSection() {
  return (
    <section id="stats" className="bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
        <header className="max-w-2xl">
          <h2 className="text-2xl font-extrabold tracking-tight text-coolors-ink sm:text-3xl">
            Sẵn sàng cho lớp học THCS của bạn
          </h2>
          <p className="mt-3 text-sm text-coolors-ink/70 sm:text-base">
            Những con số minh họa cho cách EduVerse có thể đồng hành cùng lớp học của bạn: từ
            quản lý lớp, giao bài đến theo dõi tiến độ.
          </p>
        </header>

        <div className="mt-8">
          <StatsGrid items={statsItems} />
        </div>
      </div>
    </section>
  );
}
