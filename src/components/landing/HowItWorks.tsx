import { BookOpen, LogIn, Users } from "lucide-react";

interface StepItem {
  index: number;
  title: string;
  description: string;
  icon: JSX.Element;
}

const steps: StepItem[] = [
  {
    index: 1,
    title: "Đăng ký hoặc đăng nhập",
    description: "Tạo tài khoản mới hoặc đăng nhập bằng tài khoản có sẵn của bạn.",
    icon: <LogIn className="h-5 w-5" aria-hidden />,
  },
  {
    index: 2,
    title: "Tạo lớp hoặc tham gia lớp",
    description:
      "Giáo viên tạo lớp học và mời học sinh bằng mã lớp. Học sinh và phụ huynh tham gia bằng mã do giáo viên cung cấp.",
    icon: <Users className="h-5 w-5" aria-hidden />,
  },
  {
    index: 3,
    title: "Dạy, học và theo dõi trên một nơi",
    description:
      "Giao bài, làm bài, chấm điểm và theo dõi tiến độ – tất cả diễn ra trên cùng một bảng điều khiển.",
    icon: <BookOpen className="h-5 w-5" aria-hidden />,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
        <header className="mb-12 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-coolors-ink sm:text-3xl">
            Bắt đầu chỉ với 3 bước
          </h2>
          <p className="mt-4 text-base text-coolors-ink/80 sm:text-lg">
            Không cần cài đặt phức tạp, chỉ vài phút để vào guồng.
          </p>
        </header>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step, idx) => (
            <div key={step.index} className="relative">
              <div className="relative flex h-full flex-col rounded-2xl border border-coolors-primary/10 bg-gradient-to-br from-white to-coolors-primary/5 p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-coolors-primary/30">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-coolors-primary to-coolors-primary/80 text-sm font-semibold text-white shadow-lg">
                    {step.index}
                  </div>
                </div>
                <h3 className="text-base font-semibold text-coolors-ink sm:text-lg">{step.title}</h3>
                <p className="mt-2 text-sm text-coolors-ink/80">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
