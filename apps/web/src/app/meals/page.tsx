"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/Card";
import { Badge, type BadgeVariant } from "@/components/Badge";
import {
  getMealApplications,
  getMealStatus,
  type MealApplication,
  type MealApplicationStatus,
  type MealStatus,
} from "@/lib/api";
import { MealIcon, ShieldCheckIcon } from "@/components/icons";

const APP_STATUS_META: Record<MealApplicationStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Черновик", variant: "neutral" },
  submitted: { label: "Подана", variant: "info" },
  approved: { label: "Одобрена", variant: "info" },
  active: { label: "Действует", variant: "success" },
  rejected: { label: "Отклонена", variant: "danger" },
};

const SYNC_META: Record<MealStatus["syncStatus"], { label: string; variant: BadgeVariant }> = {
  synced: { label: "Синхронизировано со столовой", variant: "success" },
  pending: { label: "Синхронизация…", variant: "warning" },
  failed: { label: "Ошибка синхронизации", variant: "danger" },
};

export default function MealsPage() {
  const [meal, setMeal] = useState<MealStatus | null>(null);
  const [apps, setApps] = useState<MealApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [category, setCategory] = useState("Социально уязвимые слои населения (СУСН)");
  const [basis, setBasis] = useState("Многодетная семья");
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([getMealStatus(), getMealApplications()])
      .then(([m, a]) => {
        if (!mounted) return;
        setMeal(m);
        setApps(a);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setApplied(true);
    setApplyOpen(false);
  }

  const sync = meal ? SYNC_META[meal.syncStatus] : null;

  return (
    <DashboardShell title="Питание">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-navy-900">
            Льготное питание
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Проверка права на льготу и синхронизация со столовой
          </p>
        </div>
        {!applied && (
          <button
            type="button"
            onClick={() => setApplyOpen((v) => !v)}
            className="btn-primary"
          >
            Подать заявление
          </button>
        )}
      </div>

      {applied && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <ShieldCheckIcon className="h-5 w-5" />
          <p className="text-sm">
            Заявление на льготное питание отправлено. Оно будет подписано ЭЦП и
            передано на проверку.
          </p>
        </div>
      )}

      {applyOpen && (
        <Card title="Заявление на льготное питание" className="mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="category" className="label">
                Категория льготы
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input"
              >
                <option>Социально уязвимые слои населения (СУСН)</option>
                <option>Дети-сироты</option>
                <option>Инвалидность I–II группы</option>
              </select>
            </div>
            <div>
              <label htmlFor="basis" className="label">
                Основание
              </label>
              <select
                id="basis"
                value={basis}
                onChange={(e) => setBasis(e.target.value)}
                className="input"
              >
                <option>Многодетная семья</option>
                <option>Малообеспеченная семья</option>
                <option>Справка о потере кормильца</option>
                <option>Иное (по документам)</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full">
                Отправить
              </button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-56 animate-pulse rounded-2xl bg-slate-200/60" />
          <div className="h-56 animate-pulse rounded-2xl bg-slate-200/60" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Статус льготы */}
          <Card title="Статус льготы">
            {meal && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                      meal.eligible ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    <MealIcon className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-lg font-bold text-navy-900">
                      {meal.eligible ? "Льгота подтверждена" : "Льгота не подтверждена"}
                    </p>
                    <p className="text-sm text-slate-500">{meal.category}</p>
                  </div>
                </div>
                <dl className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Основание</dt>
                    <dd className="text-right font-medium text-slate-900">{meal.basis}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Действует до</dt>
                    <dd className="font-medium text-slate-900">{meal.validUntil}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Столовая</dt>
                    <dd className="text-right font-medium text-slate-900">{meal.canteen}</dd>
                  </div>
                </dl>
                {sync && <Badge variant={sync.variant}>{sync.label}</Badge>}
              </div>
            )}
          </Card>

          {/* История заявлений */}
          <Card title="Мои заявления" subtitle="История заявок на льготное питание">
            <ul className="space-y-3">
              {apps.map((a) => {
                const meta = APP_STATUS_META[a.status];
                return (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {a.category}
                      </p>
                      <p className="text-xs text-slate-500">
                        Подано {a.submittedAt}
                        {a.decisionAt ? ` · решение ${a.decisionAt}` : ""}
                      </p>
                    </div>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
