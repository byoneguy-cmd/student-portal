"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getNotifications, type NotificationItem } from "@/lib/api";
import { Badge } from "./Badge";
import { BellIcon, LogoutIcon, MenuIcon } from "./icons";

interface TopbarProps {
  title?: string;
  onMenuClick: () => void;
}

export function Topbar({ title = "Дашборд", onMenuClick }: TopbarProps) {
  const router = useRouter();
  const { user, mockMode, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notifOpen) return;
    let mounted = true;
    getNotifications().then((items) => {
      if (mounted) setNotifications(items);
    });
    return () => {
      mounted = false;
    };
  }, [notifOpen]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  const roleLabel: Record<string, string> = {
    student: "Студент",
    lecturer: "Преподаватель",
    deanery: "Деканат",
    finance: "Бухгалтерия",
    dorm_admin: "Адм. общежития",
    canteen_admin: "Адм. столовой",
    admin: "Администратор",
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
        aria-label="Открыть меню"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      <h1 className="truncate text-lg font-bold tracking-tight text-navy-900">
        {title}
      </h1>

      <div className="ml-auto flex items-center gap-2">
        {mockMode && (
          <Badge variant="info" className="hidden sm:inline-flex">
            Демо-режим
          </Badge>
        )}

        {/* Уведомления */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Уведомления"
          >
            <BellIcon className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift">
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                Уведомления
              </div>
              <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                {notifications.map((n) => (
                  <li key={n.id} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          n.kind === "warning"
                            ? "bg-amber-500"
                            : n.kind === "success"
                              ? "bg-emerald-500"
                              : "bg-blue-500"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{n.description}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{n.date}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Профиль */}
        <div className="hidden items-center gap-3 border-l border-slate-200 pl-3 sm:flex">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
            {user?.avatarInitials ?? "—"}
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">{user?.fullName}</p>
            <p className="text-xs text-slate-500">
              {user ? roleLabel[user.role] ?? user.role : ""} · {user?.group}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-rose-600"
          aria-label="Выйти"
          title="Выйти"
        >
          <LogoutIcon className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
