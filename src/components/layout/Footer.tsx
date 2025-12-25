import { Facebook, Github, Linkedin, Twitter } from "lucide-react";
import Link from "next/link";

const footerLinkGroups = [
  {
    title: "Sản phẩm",
    links: [
      { href: "#features", label: "Tính năng" },
      { href: "#roles", label: "Vai trò" },
      { href: "#how-it-works", label: "Cách hoạt động" },
    ],
  },
  {
    title: "Tài nguyên",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/help-center", label: "Trung tâm hỗ trợ" },
      { href: "/contact", label: "Liên hệ" },
    ],
  },
  {
    title: "Pháp lý",
    links: [
      { href: "/terms-of-service", label: "Điều khoản dịch vụ" },
      { href: "/privacy-policy", label: "Chính sách bảo mật" },
    ],
  },
];

const socialLinks = [
  { 
    href: "#", 
    label: "Facebook", 
    icon: <Facebook className="h-5 w-5" /> 
  },
  { 
    href: "#", 
    label: "Twitter", 
    icon: <Twitter className="h-5 w-5" /> 
  },
  { 
    href: "#", 
    label: "LinkedIn", 
    icon: <Linkedin className="h-5 w-5" /> 
  },
  { 
    href: "#", 
    label: "GitHub", 
    icon: <Github className="h-5 w-5" /> 
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-coolors-primary/10 bg-white text-coolors-ink">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-10">
        {/* Top section: Logo and link groups */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Logo and Slogan */}
          <div className="col-span-2 mb-4 md:col-span-1 md:mb-0">
            <Link href="/" className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-coolors-primary to-coolors-primary/80 text-xs font-extrabold text-white shadow-sm">
                EV
              </span>
              <span className="text-sm font-extrabold tracking-tight text-coolors-ink">
                EduVerse
              </span>
            </Link>
            <p className="mt-3 text-sm text-coolors-ink/70">
              Đồng hành cùng lớp học THCS hiện đại.
            </p>
          </div>

          {/* Link Groups */}
          {footerLinkGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-coolors-ink/80">
                {group.title}
              </h3>
              <ul className="mt-4 space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-coolors-ink/70 transition-colors hover:text-coolors-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom section: Copyright and Socials */}
        <div className="mt-10 flex flex-col items-center justify-between border-t border-coolors-primary/10 pt-6 sm:flex-row">
          <p className="text-xs text-coolors-ink/60">
            © {year} EduVerse. All rights reserved.
          </p>
          <div className="mt-4 flex items-center space-x-4 sm:mt-0">
            {socialLinks.map((social) => (
              <Link
                key={social.label}
                href={social.href}
                className="text-coolors-ink/50 transition-colors hover:text-coolors-primary"
                aria-label={social.label}
              >
                {social.icon}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
