// src/components/parent/Header.tsx
import PageHeader from "@/components/shared/PageHeader";

interface HeaderParentProps {
  title: string;
  subtitle?: string;
}

export default function HeaderParent(props: HeaderParentProps) {
  return <PageHeader {...props} />;
}