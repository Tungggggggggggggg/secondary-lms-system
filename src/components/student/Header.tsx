// src/components/student/Header.tsx
import { PageHeader } from "@/components/shared";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header(props: HeaderProps) {
  return <PageHeader {...props} role="student" />;
}