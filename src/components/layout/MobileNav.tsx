"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import { Menu, X } from "lucide-react";

interface MobileNavItem {
  href: string;
  label: string;
}

interface MobileNavProps {
  navItems: MobileNavItem[];
}

export default function MobileNav({ navItems }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Đóng menu" : "Mở menu"}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-coolors-primary/10 bg-white text-coolors-ink shadow-sm transition-colors hover:bg-coolors-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coolors-primary"
      >
        {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 bg-coolors-ink/80">
          <div className="absolute inset-x-0 top-0 rounded-b-3xl bg-white px-4 pb-6 pt-4 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2" onClick={closeMenu}>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-coolors-primary to-coolors-primary/80 text-sm font-extrabold text-white shadow-sm">
                  EV
                </span>
                <span className="text-base font-extrabold tracking-tight text-coolors-ink">
                  EduVerse
                </span>
              </Link>
              <button
                type="button"
                aria-label="Đóng menu"
                onClick={closeMenu}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-coolors-primary/10 bg-white text-coolors-ink shadow-sm transition-colors hover:bg-coolors-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coolors-primary"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className="block rounded-xl px-3 py-2 text-sm font-semibold text-coolors-ink hover:bg-coolors-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coolors-primary"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-4 flex flex-col gap-2">
              <Button asChild size="default" variant="ghost" color="blue">
                <Link href="/auth/login" onClick={closeMenu}>
                  Đăng nhập
                </Link>
              </Button>
              <Button asChild size="default" color="blue">
                <Link href="/auth/register" onClick={closeMenu}>
                  Đăng ký miễn phí
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
