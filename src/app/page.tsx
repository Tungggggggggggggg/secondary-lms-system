import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import LandingHero from "@/components/landing/LandingHero";
import RolesSection from "@/components/landing/RoleSection";
import FeatureHighlights from "@/components/landing/FeatureHighlights";
import SystemStatsSection from "@/components/landing/SystemStatsSection";
import HowItWorks from "@/components/landing/HowItWorks";
import Link from "next/link";
import Button from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <LandingHero />
        <RolesSection />
        <FeatureHighlights />
        <SystemStatsSection />
        <HowItWorks />
        <section id="cta" className="relative overflow-hidden bg-gradient-to-r from-coolors-primary to-coolors-primary/80 py-16 sm:py-20">
          <div className="pointer-events-none absolute inset-0 opacity-10">
            <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-coolors-accent/50 blur-3xl" />
            <div className="absolute -right-16 -bottom-32 h-80 w-80 rounded-full bg-coolors-highlight/50 blur-3xl" />
          </div>
          <div className="relative z-10 mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-10">
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Sẵn sàng nâng cấp lớp học THCS của bạn?
            </h2>
            <p className="mt-3 text-base text-white/95 sm:text-lg">
              EduVerse giúp bạn bắt đầu nhanh chóng, rồi âm thầm làm nhẹ đi công việc hàng ngày.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="bg-white text-coolors-primary hover:bg-white/90 shadow-lg hover:shadow-xl transition-all duration-300">
                <Link href="/auth/register">Đăng ký miễn phí</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 transition-all duration-300">
                <Link href="/auth/login">Đăng nhập</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}