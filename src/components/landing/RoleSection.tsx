import Link from "next/link";
import { BookOpen, Users, ShieldCheck } from "lucide-react";

type RoleId = "teacher" | "student" | "parent";

interface RoleCard {
    id: RoleId;
    title: string;
    description: string;
    benefits: string[];
    ctaHref: string;
}

const roles: RoleCard[] = [
    {
        id: "teacher",
        title: "Giáo viên",
        description: "Tổ chức lớp học, giao bài và chấm điểm nhanh chóng.",
        benefits: [
            "Tạo và quản lý lớp học số dễ dàng",
            "Giao bài, chấm điểm và phản hồi tập trung",
            "Theo dõi tiến độ từng lớp và từng học sinh",
        ],
        ctaHref: "/auth/register?role=teacher",
    },
    {
        id: "student",
        title: "Học sinh",
        description: "Giúp học sinh nắm rõ bài tập, deadline và tiến độ.",
        benefits: [
            "Xem lịch học, bài tập và hạn nộp rõ ràng",
            "Làm bài trực tuyến mọi lúc, mọi nơi",
            "Nhận phản hồi và điểm số kịp thời",
        ],
        ctaHref: "/auth/register?role=student",
    },
    {
        id: "parent",
        title: "Phụ huynh",
        description:
            "Đồng hành cùng con qua dữ liệu minh bạch và cập nhật liên tục.",
        benefits: [
            "Xem điểm số và tiến độ học tập của con",
            "Nhận thông báo quan trọng từ giáo viên",
            "Hiểu rõ điểm mạnh, điểm cần cải thiện của con",
        ],
        ctaHref: "/auth/register?role=parent",
    },
];

export default function RoleOverviewSection() {
    return (
        <section id="roles" className="bg-white py-16 sm:py-20">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
                <header className="mb-10 text-center">
                    <h2 className="text-2xl font-extrabold tracking-tight text-coolors-ink sm:text-3xl">
                        Một hệ thống, ba trải nghiệm tối ưu
                    </h2>
                    <p className="mt-3 text-base text-coolors-ink/80 sm:text-lg">
                        EduVerse được thiết kế riêng cho từng vai trò, giúp mỗi
                        người đạt được mục tiêu của mình.
                    </p>
                </header>

                <div className="grid gap-6 md:grid-cols-3">
                    {roles.map((role) => (
                        <article
                            key={role.id}
                            className="flex h-full flex-col rounded-3xl border border-coolors-primary/10 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-coolors-primary/30"
                        >
                            <div className="mb-4 flex items-center gap-3">
                                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-coolors-primary/10 text-coolors-primary">
                                    {role.id === "teacher" && (
                                        <BookOpen
                                            className="h-5 w-5"
                                            aria-hidden
                                        />
                                    )}
                                    {role.id === "student" && (
                                        <Users
                                            className="h-5 w-5"
                                            aria-hidden
                                        />
                                    )}
                                    {role.id === "parent" && (
                                        <ShieldCheck
                                            className="h-5 w-5"
                                            aria-hidden
                                        />
                                    )}
                                </div>
                                <h3 className="text-lg font-semibold text-coolors-ink">
                                    {role.title}
                                </h3>
                            </div>

                            <p className="mb-4 text-base text-coolors-ink/80">
                                {role.description}
                            </p>

                            <ul className="mb-6 space-y-2">
                                {role.benefits.map((benefit) => (
                                    <li
                                        key={benefit}
                                        className="flex items-start gap-2 text-sm text-coolors-ink/90"
                                    >
                                        <span
                                            className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-coolors-primary"
                                            aria-hidden
                                        />
                                        <span>{benefit}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href={role.ctaHref}
                                className="mt-auto inline-flex h-10 items-center rounded-lg bg-coolors-primary/10 px-4 py-2 text-sm font-semibold text-coolors-primary transition-all duration-300 hover:bg-coolors-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coolors-primary"
                            >
                                Trải nghiệm như {role.title.toLowerCase()}
                            </Link>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
