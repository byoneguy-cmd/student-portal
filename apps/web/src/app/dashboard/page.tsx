"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/Card";
import { Badge, type BadgeVariant } from "@/components/Badge";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/lib/auth";
import {
  computeGpa,
  formatMoney,
  getBookings,
  getDocuments,
  getFinanceBalance,
  getGrades,
  getMealStatus,
  getSchedule,
  TODAY_DAY,
  type Booking,
  type FinanceBalance,
  type Grade,
  type MealStatus,
  type ScheduleEntry,
  type StudentDocument,
} from "@/lib/api";
import {
  AcademicCapIcon,
  BanknotesIcon,
  BuildingIcon,
  ChevronRightIcon,
  ClockIcon,
  MealIcon,
} from "@/components/icons";

const BOOKING_LABEL: Record<Booking["status"], string> = {
  submitted: "Заявка подана",
  approved: "Одобрена",
  documents: "Документы на подписании",
  checked_in: "Заселён",
  rejected: "Отклонена",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [finance, setFinance] = useState<FinanceBalance | null>(null);
  const [meal, setMeal] = useState<MealStatus | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [docs, setDocs] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getSchedule(),
      getGrades(),
      getFinanceBalance(),
      getMealStatus(),
      getBookings(),
      getDocuments(),
    ])
      .then(([s, g, f, m, b, d]) => {
        if (!mounted) return;
        setSchedule(s);
        setGrades(g);
        setFinance(f);
        setMeal(m);
        setBookings(b);
        setDocs(d);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const gpa = computeGpa(grades);
  const today = schedule.filter((s) => s.day === TODAY_DAY);
  const pendingDocs = docs.filter((d) => d.status === "pending_sign").length;
  const booking = bookings[0] ?? null;

  const firstName = user?.fullName?.split(" ")[0] ?? "студент";

  return (
    <DashboardShell title="Дашборд">
      {/* Приветствие */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Личный кабинет студента</p>
          <h2 className="text-2xl font-bold tracking-tight text-navy-900">
            Добрый день, {firstName}!
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {user?.faculty} · группа {user?.group} · курс {user?.course}
          </p>
        </div>
        <Link href="/schedule" className="btn-secondary">
          Расписание на неделю
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
      ) : (
        <>
          {/* Виджеты */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              title="Средний балл (GPA)"
              value={gpa.gpa.toFixed(2)}
              description={gpa.academicStanding}
              icon={<AcademicCapIcon className="h-5 w-5" />}
              accent="blue"
            />
            <StatCard
              title="Расписание сегодня"
              value={`${today.length} пары`}
              description={today.length > 0 ? `Начало в ${today[0]?.time}` : "Выходной"}
              icon={<ClockIcon className="h-5 w-5" />}
              accent="violet"
            />
            <StatCard
              title="Последние оценки"
              value={`${grades.length} дисциплин`}
              description={`Лучшая оценка: ${grades[0]?.subject ?? "—"}`}
              icon={<AcademicCapIcon className="h-5 w-5" />}
              accent="emerald"
            />
            <StatCard
              title="Заселение"
              value={booking ? BOOKING_LABEL[booking.status] : "Не подана"}
              description={booking ? `${booking.building}, ком. ${booking.room}` : "Общежитие"}
              icon={<BuildingIcon className="h-5 w-5" />}
              accent="blue"
            />
            <StatCard
              title="Льготы"
              value={meal?.eligible ? "Подтверждены" : "Нет"}
              description={meal?.category ?? "Питание"}
              icon={<MealIcon className="h-5 w-5" />}
              accent="emerald"
            />
            <StatCard
              title="Баланс оплаты"
              value={finance ? formatMoney(finance.due) : "—"}
              description={
                finance
                  ? finance.due > 0
                    ? `К оплате до ${finance.deadline}`
                    : "Задолженности нет"
                  : "Оплата обучения"
              }
              icon={<BanknotesIcon className="h-5 w-5" />}
              accent="amber"
            />
          </div>

          {/* Контент */}
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Расписание сегодня */}
            <Card
              title="Расписание сегодня"
              subtitle={`${TODAY_DAY}, ${today[0]?.date ?? ""}`}
              actions={
                <Link href="/schedule" className="text-sm font-medium text-brand hover:text-brand-dark">
                  Все →
                </Link>
              }
            >
              {today.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Сегодня занятий нет.
                </p>
              ) : (
                <ul className="space-y-3">
                  {today.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                    >
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-navy-50 text-navy-800">
                        <span className="text-[10px] font-medium">Начало</span>
                        <span className="text-xs font-bold">{entry.time.slice(0, 5)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {entry.subject}
                        </p>
                        <p className="text-xs text-slate-500">
                          {entry.room} · {entry.lecturer}
                        </p>
                      </div>
                      <Badge variant={entry.type === "Лекция" ? "info" : "neutral"}>
                        {entry.type}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Последние оценки */}
            <Card
              title="Последние оценки"
              subtitle="Осенний семестр"
              actions={
                <Link href="/grades" className="text-sm font-medium text-brand hover:text-brand-dark">
                  Журнал →
                </Link>
              }
            >
              <ul className="space-y-3">
                {grades.slice(0, 5).map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{g.subject}</p>
                      <p className="text-xs text-slate-500">
                        {g.credits} кредитов · экзамен {g.examDate}
                      </p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-sm font-bold text-emerald-700">
                      {g.grade}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Статусы */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatusCard
              label="Заселение"
              value={booking ? BOOKING_LABEL[booking.status] : "Не подана"}
              variant={booking && booking.status !== "rejected" ? "info" : "neutral"}
              href="/accommodation"
            />
            <StatusCard
              label="Льготное питание"
              value={meal?.eligible ? "Действует" : "Не оформлено"}
              variant={meal?.eligible ? "success" : "warning"}
              href="/meals"
            />
            <StatusCard
              label="Документы"
              value={pendingDocs > 0 ? `${pendingDocs} на подпись` : "Всё подписано"}
              variant={pendingDocs > 0 ? "warning" : "success"}
              href="/documents"
            />
          </div>
        </>
      )}
    </DashboardShell>
  );
}

function StatusCard({
  label,
  value,
  variant,
  href,
}: {
  label: string;
  value: string;
  variant: BadgeVariant;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:shadow-lift"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 truncate text-base font-semibold text-navy-900">{value}</p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            variant === "success"
              ? "bg-emerald-500"
              : variant === "warning"
                ? "bg-amber-500"
                : variant === "danger"
                  ? "bg-rose-500"
                  : "bg-slate-300"
          }`}
        />
        <ChevronRightIcon className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
      </div>
    </Link>
  );
}
