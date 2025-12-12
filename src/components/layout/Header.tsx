"use client";

import Link from "next/link";
import Button from "@/components/ui/button";
import MobileNav from "@/components/layout/MobileNav";

interface PublicNavItem {
  href: string;
  label: string;
}

const navItems: PublicNavItem[] = [
  { href: "#features", label: "Tính năng" },
  { href: "#roles", label: "Vai trò" },
  { href: "#how-it-works", label: "Cách hoạt động" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-coolors-primary/10 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-coolors-primary to-coolors-primary/80 text-sm font-extrabold text-white shadow-sm">
              EV
            </span>
            <span className="text-base font-extrabold tracking-tight text-coolors-ink sm:text-lg">
              EduVerse
            </span>
          </Link>
        </div>

        <nav className="hidden items-center gap-6 text-sm font-medium text-coolors-ink/80 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-2 py-1.5 transition-colors hover:text-coolors-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coolors-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button asChild size="sm" variant="ghost" className="text-coolors-primary hover:bg-coolors-primary/5">
            <Link href="/auth/login">Đăng nhập</Link>
          </Button>
          <Button asChild size="sm" className="bg-coolors-primary hover:bg-coolors-primary/90 text-white">
            <Link href="/auth/register">Đăng ký miễn phí</Link>
          </Button>
        </div>

        <div className="flex items-center md:hidden">
          <MobileNav navItems={navItems} />
        </div>
      </div>
    </header>
  );
}
