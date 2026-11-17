"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";
import {
  AcademicCapIcon,
  BuildingIcon,
  CalendarIcon,
  DocumentIcon,
  HomeIcon,
  MealIcon,
  ServiceIcon,
  XIcon,
} from "./icons";

interface NavItem {
  href: string;
  label: string;
  icon: (props: { className?: string }) => ReactElement;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Дашборд", icon: HomeIcon },
  { href: "/schedule", label: "Расписание", icon: CalendarIcon },
  { href: "/grades", label: "Оценки", icon: AcademicCapIcon },
  { href: "/documents", label: "Документы", icon: DocumentIcon },
  { href: "/accommodation", label: "Общежитие", icon: BuildingIcon },
  { href: "/meals", label: "Питание", icon: MealIcon },
  { href: "/services", label: "Услуги", icon: ServiceIcon },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Мобильная подложка */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-navy-950/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 text-white transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Бренд */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg font-bold">
              СП
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight">Студенческий портал</p>
              <p className="text-[11px] text-white/50">Student Super-App</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Закрыть меню"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Навигация */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "text-brand-light" : "text-white/50 group-hover:text-white"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Подвал */}
        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-[11px] leading-relaxed text-white/40">
            Безбумажный вуз · РК
            <br />
            Данные защищены ЭЦП и hash-chain
          </p>
        </div>
      </aside>
    </>
  );
}
