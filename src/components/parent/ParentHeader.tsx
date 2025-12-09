// src/components/parent/Header.tsx
import { PageHeader } from "@/components/shared";

interface HeaderParentProps {
  title: string;
  subtitle?: string;
}

export default function HeaderParent(props: HeaderParentProps) {
  return <PageHeader {...props} role="parent" />;
}