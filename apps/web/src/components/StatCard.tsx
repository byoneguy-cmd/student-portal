import type { ReactNode } from "react";

export type StatAccent = "blue" | "emerald" | "amber" | "rose" | "violet" | "slate";

const ACCENTS: Record<StatAccent, { chip: string; value: string }> = {
  blue: { chip: "bg-blue-50 text-blue-600", value: "text-navy-900" },
  emerald: { chip: "bg-emerald-50 text-emerald-600", value: "text-emerald-700" },
  amber: { chip: "bg-amber-50 text-amber-600", value: "text-amber-700" },
  rose: { chip: "bg-rose-50 text-rose-600", value: "text-rose-700" },
  violet: { chip: "bg-violet-50 text-violet-600", value: "text-violet-700" },
  slate: { chip: "bg-slate-100 text-slate-600", value: "text-slate-900" },
};

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  icon?: ReactNode;
  accent?: StatAccent;
  footer?: ReactNode;
}

export function StatCard({
  title,
  value,
  description,
  icon,
  accent = "blue",
  footer,
}: StatCardProps) {
  const a = ACCENTS[accent];
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500">{title}</p>
          <p className={`mt-2 text-2xl font-bold leading-none tracking-tight ${a.value}`}>
            {value}
          </p>
          {description && (
            <p className="mt-2 truncate text-xs text-slate-400">{description}</p>
          )}
        </div>
        {icon && (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.chip}`}
          >
            {icon}
          </span>
        )}
      </div>
      {footer && <div className="mt-4 border-t border-slate-100 pt-3">{footer}</div>}
    </div>
  );
}
