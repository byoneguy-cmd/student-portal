"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/Card";
import { Badge, type BadgeVariant } from "@/components/Badge";
import { StatCard } from "@/components/StatCard";
import {
  formatMoney,
  getCertificateTypes,
  getCertificates,
  getFinanceBalance,
  getInvoices,
  type Certificate,
  type CertificateStatus,
  type CertificateType,
  type FinanceBalance,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/api";
import { BanknotesIcon, DocumentIcon, ServiceIcon } from "@/components/icons";

const CERT_STATUS_META: Record<CertificateStatus, { label: string; variant: BadgeVariant }> = {
  processing: { label: "В обработке", variant: "info" },
  ready: { label: "Готова", variant: "success" },
  issued: { label: "Выдана", variant: "success" },
  rejected: { label: "Отклонена", variant: "danger" },
};

const INVOICE_META: Record<InvoiceStatus, { label: string; variant: BadgeVariant }> = {
  paid: { label: "Оплачен", variant: "success" },
  partial: { label: "Частично", variant: "warning" },
  unpaid: { label: "Не оплачен", variant: "danger" },
};

export default function ServicesPage() {
  const [finance, setFinance] = useState<FinanceBalance | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [types, setTypes] = useState<CertificateType[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getFinanceBalance(),
      getInvoices(),
      getCertificateTypes(),
      getCertificates(),
    ])
      .then(([f, i, t, c]) => {
        if (!mounted) return;
        setFinance(f);
        setInvoices(i);
        setTypes(t);
        setCerts(c);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const progress = useMemo(() => {
    if (!finance) return 0;
    return Math.min(100, Math.round((finance.paid / finance.tuitionTotal) * 100));
  }, [finance]);

  function orderCertificate(type: CertificateType) {
    setCerts((prev) => [
      { id: `c-${Date.now()}`, type: type.name, status: "processing", requestedAt: "17.11.2025", issuedAt: null },
      ...prev,
    ]);
  }

  return (
    <DashboardShell title="Услуги">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-navy-900">
          Услуги и оплата
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Справки с ЭЦП вуза, баланс и оплата обучения
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
          {/* Финансы */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="К оплате"
              value={finance ? formatMoney(finance.due) : "—"}
              description={finance ? `Срок до ${finance.deadline}` : ""}
              icon={<BanknotesIcon className="h-5 w-5" />}
              accent="amber"
            />
            <StatCard
              title="Оплачено"
              value={finance ? formatMoney(finance.paid) : "—"}
              description={finance ? `из ${formatMoney(finance.tuitionTotal)}` : ""}
              icon={<BanknotesIcon className="h-5 w-5" />}
              accent="emerald"
            />
            <StatCard
              title="Стипендия"
              value={finance ? formatMoney(finance.scholarship) : "—"}
              description="Ежемесячно"
              icon={<ServiceIcon className="h-5 w-5" />}
              accent="violet"
            />
          </div>

          <Card title="Оплата обучения" className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-500">Прогресс оплаты за семестр</p>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {progress}% оплачено · осталось {finance ? formatMoney(finance.due) : "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaid(true)}
                disabled={paid}
                className="btn-primary"
              >
                {paid ? "Платёж отправлен" : "Оплатить через eGov Pay"}
              </button>
            </div>
            {paid && (
              <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200">
                Заявка на платёж сформирована. Вы будете перенаправлены в платёжный
                шлюз (Halyk / eGov Pay).
              </p>
            )}
          </Card>

          {/* Счета */}
          <Card title="Счета и начисления" className="mt-6" padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-medium">Наименование</th>
                    <th className="px-4 py-3 font-medium">Период</th>
                    <th className="px-4 py-3 font-medium">Сумма</th>
                    <th className="px-4 py-3 font-medium">Срок</th>
                    <th className="px-5 py-3 font-medium">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => {
                    const meta = INVOICE_META[inv.status];
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3 font-medium text-slate-900">{inv.name}</td>
                        <td className="px-4 py-3 text-slate-500">{inv.semester}</td>
                        <td className="px-4 py-3 font-semibold text-navy-900">
                          {formatMoney(inv.amount)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{inv.dueDate}</td>
                        <td className="px-5 py-3">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Справки */}
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card title="Доступные справки" subtitle="С серверной ЭЦП вуза">
              <ul className="space-y-3">
                {types.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
                        <DocumentIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{t.name}</p>
                        <p className="text-xs text-slate-500">
                          {t.processingDays} дн. · {t.price === 0 ? "бесплатно" : formatMoney(t.price)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => orderCertificate(t)}
                      className="btn-secondary shrink-0 py-2"
                    >
                      Заказать
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Мои справки" subtitle="Заказанные и выданные документы">
              <ul className="space-y-3">
                {certs.map((c) => {
                  const meta = CERT_STATUS_META[c.status];
                  return (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{c.type}</p>
                        <p className="text-xs text-slate-500">
                          Заказана {c.requestedAt}
                          {c.issuedAt ? ` · выдана ${c.issuedAt}` : ""}
                        </p>
                      </div>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </li>
                  );
                })}
                {certs.length === 0 && (
                  <li className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
                    Заказанных справок пока нет.
                  </li>
                )}
              </ul>
            </Card>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
