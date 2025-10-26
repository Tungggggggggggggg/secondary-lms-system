// src/components/layout/Header.tsx
interface HeaderProps {
    title: string;
    subtitle?: string;
  }
  
  export default function Header({ title, subtitle }: HeaderProps) {
    return (
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        {subtitle && <p className="text-gray-600">{subtitle}</p>}
      </header>
    );
  }
  