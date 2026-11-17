"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/Card";
import { Badge, type BadgeVariant } from "@/components/Badge";
import { getDocuments, type DocumentStatus, type StudentDocument } from "@/lib/api";
import { DocumentIcon, ShieldCheckIcon } from "@/components/icons";

type Filter = "all" | DocumentStatus;

const STATUS_META: Record<DocumentStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Черновик", variant: "neutral" },
  pending_sign: { label: "На подпись", variant: "warning" },
  signed: { label: "Подписан", variant: "success" },
  rejected: { label: "Отклонён", variant: "danger" },
};

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [signingId, setSigningId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getDocuments()
      .then((d) => {
        if (mounted) setDocs(d);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return docs;
    return docs.filter((d) => d.status === filter);
  }, [docs, filter]);

  const pendingCount = docs.filter((d) => d.status === "pending_sign").length;

  async function handleSign(id: string) {
    setSigningId(id);
    await delay(1200); // имитация подписания через NCALayer
    setDocs((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: "signed", signedAt: "17.11.2025" } : d,
      ),
    );
    setSigningId(null);
  }

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "pending_sign", label: "На подпись" },
    { key: "signed", label: "Подписанные" },
  ];

  return (
    <DashboardShell title="Документы">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-navy-900">Документы</h2>
          <p className="mt-1 text-sm text-slate-500">
            Юридически значимые документы с ЭЦП и hash-chain
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="warning">Ожидают подписи: {pendingCount}</Badge>
        )}
      </div>

      {/* Пакет на подписание */}
      {pendingCount > 0 && (
        <Card className="mb-6 border-brand/20 bg-gradient-to-r from-navy-50 to-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white">
                <ShieldCheckIcon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-base font-semibold text-navy-900">
                  Пакет заселения ожидает вашей ЭЦП
                </p>
                <p className="text-sm text-slate-500">
                  Договор найма и акт приёма-передачи комнаты (2 документа)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                docs
                  .filter((d) => d.status === "pending_sign")
                  .forEach((d) => void handleSign(d.id));
              }}
              disabled={signingId !== null}
              className="btn-primary"
            >
              {signingId !== null ? "Подписание…" : "Подписать пакет"}
            </button>
          </div>
        </Card>
      )}

      {/* Фильтры */}
      <div className="mb-4 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              filter === t.key
                ? "bg-navy-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200/60" />
          ))}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((doc) => {
            const meta = STATUS_META[doc.status];
            return (
              <li
                key={doc.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
                  <DocumentIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{doc.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {doc.type} · {doc.sizeKb} КБ · hash {doc.hash}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Создан {doc.createdAt}
                    {doc.signedAt ? ` · подписан ${doc.signedAt}` : ""}
                  </p>
                </div>
                <Badge variant={meta.variant}>{meta.label}</Badge>
                {doc.status === "pending_sign" && (
                  <button
                    type="button"
                    onClick={() => handleSign(doc.id)}
                    disabled={signingId !== null}
                    className="btn-secondary py-2"
                  >
                    {signingId === doc.id ? "Подписание…" : "Подписать"}
                  </button>
                )}
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
              Документов в этой категории нет.
            </li>
          )}
        </ul>
      )}
    </DashboardShell>
  );
}
