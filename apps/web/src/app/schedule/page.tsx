"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/Card";
import { Badge, type BadgeVariant } from "@/components/Badge";
import { getSchedule, TODAY_DAY, type ScheduleEntry } from "@/lib/api";
import { ClockIcon } from "@/components/icons";

const DAY_ORDER = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
];

const TYPE_VARIANT: Record<ScheduleEntry["type"], BadgeVariant> = {
  Лекция: "info",
  Практика: "neutral",
  Лабораторная: "warning",
  Семинар: "success",
};

const SHORT_DAY: Record<string, string> = {
  Понедельник: "Пн",
  Вторник: "Вт",
  Среда: "Ср",
  Четверг: "Чт",
  Пятница: "Пт",
  Суббота: "Сб",
};

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>(TODAY_DAY);

  useEffect(() => {
    let mounted = true;
    getSchedule()
      .then((s) => {
        if (mounted) setSchedule(s);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const days = useMemo(() => {
    return DAY_ORDER.filter((d) => schedule.some((s) => s.day === d)).map((d) => {
      const first = schedule.find((s) => s.day === d);
      return { day: d, date: first?.date ?? "" };
    });
  }, [schedule]);

  const activeDay = days.some((d) => d.day === selected) ? selected : days[0]?.day ?? "";
  const entries = schedule.filter((s) => s.day === activeDay);

  return (
    <DashboardShell title="Расписание">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-navy-900">
            Расписание занятий
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Неделя 17.11 – 22.11 · {schedule.length} занятий
          </p>
        </div>
      </div>

      {/* Переключатель дней */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => {
          const active = d.day === activeDay;
          return (
            <button
              key={d.day}
              type="button"
              onClick={() => setSelected(d.day)}
              className={`flex shrink-0 flex-col items-center rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-navy-900 text-white shadow-card"
                  : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{SHORT_DAY[d.day] ?? d.day.slice(0, 2)}</span>
              <span className={`text-xs ${active ? "text-white/60" : "text-slate-400"}`}>
                {d.date}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
      ) : (
        <Card title={activeDay} subtitle={days.find((d) => d.day === activeDay)?.date}>
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              В этот день занятий нет.
            </p>
          ) : (
            <ol className="relative space-y-4">
              {entries.map((entry) => (
                <li key={entry.id} className="flex gap-4">
                  {/* Время */}
                  <div className="w-28 shrink-0 text-right">
                    <p className="text-sm font-semibold text-navy-900">{entry.time}</p>
                    <p className="mt-0.5 flex items-center justify-end gap-1 text-xs text-slate-400">
                      <ClockIcon className="h-3.5 w-3.5" />
                      {entry.type}
                    </p>
                  </div>
                  {/* Карточка занятия */}
                  <div className="flex flex-1 flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-slate-900">
                        {entry.subject}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {entry.room} · {entry.lecturer}
                      </p>
                    </div>
                    <Badge variant={TYPE_VARIANT[entry.type]}>{entry.type}</Badge>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}
    </DashboardShell>
  );
}
