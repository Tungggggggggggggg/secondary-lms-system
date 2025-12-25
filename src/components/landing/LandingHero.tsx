import Link from "next/link";
import Button from "@/components/ui/button";
import { BarChart3, BookOpen, Users } from "lucide-react";

export default function LandingHero() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-16 pt-16 sm:px-6 md:flex-row md:items-center lg:px-10 lg:pb-24 lg:pt-20">
        <div className="relative flex-1 space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-coolors-primary">
            NỀN TẢNG LMS THCS
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-coolors-ink sm:text-4xl lg:text-5xl">
            EduVerse – Hệ thống học tập thông minh cho THCS
          </h1>
          <p className="max-w-xl text-base text-coolors-ink/90 sm:text-lg">
            Kết nối giáo viên, học sinh và phụ huynh trong một không gian học tập hiện đại, minh
            bạch và dễ sử dụng.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="bg-coolors-primary hover:bg-coolors-primary/90 text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <Link href="/auth/register">Đăng ký miễn phí</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2 border-coolors-primary text-coolors-primary hover:bg-coolors-primary/5 transition-all duration-300">
              <Link href="/auth/login">Đăng nhập</Link>
            </Button>
          </div>

          <p className="text-sm text-coolors-ink/70">
            Dành cho giáo viên, học sinh và phụ huynh THCS.
          </p>
        </div>

        <div className="relative flex-1">
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-3xl bg-coolors-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 -bottom-32 h-80 w-80 rounded-full bg-coolors-accent/15 blur-3xl" />

          <div className="relative mx-auto w-full max-w-md rounded-3xl border border-coolors-primary/20 bg-white/90 p-6 shadow-[0_25px_60px_rgba(38,70,83,0.25)] backdrop-blur animate-fade-in transition-all duration-300 hover:shadow-[0_35px_80px_rgba(38,70,83,0.35)] hover:-translate-y-2">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-coolors-ink/70">
                  Bảng điều khiển lớp học
                </p>
                <p className="text-base font-semibold text-coolors-ink">
                  9A1 • Năm học 2024–2025
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-coolors-highlight/20 px-3 py-1.5 text-xs font-semibold text-coolors-accent">
                Đang hoạt động
              </span>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-gradient-to-br from-coolors-primary to-coolors-primary/80 px-4 py-4 text-white shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                    <Users className="h-5 w-5" aria-hidden />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/80">
                    Học sinh
                  </span>
                </div>
                <p className="mt-2 text-2xl font-extrabold">32</p>
                <p className="text-xs text-white/80">3 học sinh mới tuần này</p>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-coolors-highlight to-coolors-accent px-4 py-4 text-white shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                    <BookOpen className="h-5 w-5" aria-hidden />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/80">
                    Bài tập
                  </span>
                </div>
                <p className="mt-2 text-2xl font-extrabold">18</p>
                <p className="text-xs text-white/80">6 bài đến hạn trong tuần</p>
              </div>
            </div>

            <div className="rounded-2xl bg-coolors-primary/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-coolors-primary/20 text-xs font-semibold text-coolors-primary">
                    A
                  </span>
                  <p className="truncate text-sm font-medium text-coolors-ink">
                    Bài kiểm tra 15 phút – Địa lý
                  </p>
                </div>
                <span className="text-xs font-semibold text-coolors-accent">
                  Đã chấm 24/32
                </span>
              </div>
              <p className="mt-2 text-xs text-coolors-ink/60">
                Ví dụ minh họa, không phải dữ liệu thật.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
