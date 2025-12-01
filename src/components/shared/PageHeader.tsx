interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="mb-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-100 via-indigo-50 to-violet-100 border border-indigo-50 shadow-[0_18px_40px_rgba(15,23,42,0.12)] px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex items-center justify-between gap-6">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-indigo-500 uppercase">
              Bảng điều khiển học tập
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm sm:text-base text-slate-600 max-w-xl">
                {subtitle}
              </p>
            )}
          </div>

          <div className="hidden sm:flex items-center justify-center">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/80 backdrop-blur flex items-center justify-center shadow-[0_10px_30px_rgba(15,23,42,0.12)]">
                <span className="text-3xl">📚</span>
              </div>
              <div className="pointer-events-none absolute -bottom-3 -left-4 h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-200 to-emerald-400 opacity-60 blur-[2px]" />
              <div className="pointer-events-none absolute -top-4 -right-6 h-12 w-12 rounded-full bg-gradient-to-br from-sky-200 to-indigo-300 opacity-40 blur-sm" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
