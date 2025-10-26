// src/components/layout/HeaderParent.tsx
interface HeaderParentProps {
    title: string;
    subtitle?: string;
  }
  
  export default function HeaderParent({ title, subtitle }: HeaderParentProps) {
    return (
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        {subtitle && <p className="text-gray-600">{subtitle}</p>}
      </header>
    );
  }
  