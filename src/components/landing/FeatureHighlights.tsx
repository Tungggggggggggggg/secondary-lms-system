import { BarChart3, CheckCircle, ClipboardList, MessageSquare } from "lucide-react";

interface FeatureItem {
  title: string;
  description: string;
  roles: string[];
  icon: JSX.Element;
}

const features: FeatureItem[] = [
  {
    title: "Quản lý lớp học & bài tập",
    description:
      "Tạo lớp, giao bài, kèm tài liệu và hướng dẫn chi tiết trong vài bước đơn giản.",
    roles: ["Giáo viên", "Học sinh"],
    icon: <ClipboardList className="h-5 w-5" aria-hidden />,
  },
  {
    title: "Theo dõi điểm số & tiến độ",
    description:
      "Bảng điểm, tiến độ và biểu đồ trực quan giúp nắm bắt tình hình học tập trong nháy mắt.",
    roles: ["Giáo viên", "Học sinh", "Phụ huynh"],
    icon: <BarChart3 className="h-5 w-5" aria-hidden />,
  },
  {
    title: "Giao tiếp đa chiều",
    description:
      "Tin nhắn, bình luận và thông báo giúp mọi người luôn được cập nhật và kết nối.",
    roles: ["Giáo viên", "Học sinh", "Phụ huynh"],
    icon: <MessageSquare className="h-5 w-5" aria-hidden />,
  },
  {
    title: "Bài kiểm tra & thi online",
    description:
      "Thiết kế đề, làm bài và chấm điểm trực tuyến, hạn chế chấm tay và thất lạc bài.",
    roles: ["Giáo viên", "Học sinh"],
    icon: <CheckCircle className="h-5 w-5" aria-hidden />,
  },
];

export default function FeatureHighlights() {
  return (
    <section id="features" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
        <header className="mb-12 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-coolors-ink sm:text-3xl">
            Tính năng nổi bật
          </h2>
          <p className="mt-4 text-base text-coolors-ink/80 sm:text-lg">
            Tập trung vào những gì thực sự giúp việc dạy và học THCS hiệu quả hơn.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-coolors-primary/10 bg-gradient-to-br from-white to-coolors-primary/5 p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-coolors-primary/30"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-coolors-primary to-coolors-primary/80 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold text-coolors-ink sm:text-lg">
                {feature.title}
              </h3>
              <p className="mt-2 flex-1 text-sm text-coolors-ink/80">{feature.description}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {feature.roles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center rounded-full bg-coolors-primary/10 px-3 py-1 text-xs font-semibold text-coolors-primary"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
