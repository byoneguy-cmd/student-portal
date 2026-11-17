"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/Card";
import { StatCard } from "@/components/StatCard";
import { computeGpa, getGrades, type Grade } from "@/lib/api";
import { AcademicCapIcon, CheckCircleIcon } from "@/components/icons";

function gradeBadgeClass(grade: string): string {
  if (grade.startsWith("A")) return "bg-emerald-50 text-emerald-700";
  if (grade.startsWith("B")) return "bg-blue-50 text-blue-700";
  if (grade.startsWith("C")) return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

export default function GradesPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getGrades()
      .then((g) => {
        if (mounted) setGrades(g);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const gpa = computeGpa(grades);

  return (
    <DashboardShell title="Оценки">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-navy-900">
          Журнал успеваемости
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Осенний семестр 2025/2026 учебного года
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
      ) : (
        <>
          {/* Сводка GPA */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="Средний балл (GPA)"
              value={gpa.gpa.toFixed(2)}
              description={gpa.academicStanding}
              icon={<AcademicCapIcon className="h-5 w-5" />}
              accent="blue"
            />
            <StatCard
              title="Зачётные кредиты"
              value={String(gpa.totalCredits)}
              description={`${gpa.completedCourses} дисциплин`}
              icon={<CheckCircleIcon className="h-5 w-5" />}
              accent="emerald"
            />
            <StatCard
              title="Взвешенные баллы"
              value={gpa.weightedPoints.toFixed(2)}
              description="Сумма (кредит × GPA-балл)"
              icon={<AcademicCapIcon className="h-5 w-5" />}
              accent="violet"
            />
          </div>

          {/* Таблица оценок */}
          <Card
            title="Оценки за семестр"
            subtitle="Шкала: A = 4.0, A- = 3.67, B+ = 3.33, B = 3.0"
            className="mt-6"
            padded={false}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-medium">Дисциплина</th>
                    <th className="px-4 py-3 font-medium">Кредиты</th>
                    <th className="px-4 py-3 font-medium">Балл</th>
                    <th className="px-4 py-3 font-medium">Оценка</th>
                    <th className="px-4 py-3 font-medium">GPA-балл</th>
                    <th className="px-5 py-3 font-medium">Экзамен</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grades.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-medium text-slate-900">{g.subject}</td>
                      <td className="px-4 py-3 text-slate-600">{g.credits}</td>
                      <td className="px-4 py-3 text-slate-600">{g.score}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-xs font-bold ${gradeBadgeClass(g.grade)}`}
                        >
                          {g.grade}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-navy-900">
                        {g.gpaPoints.toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{g.examDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </DashboardShell>
  );
}
