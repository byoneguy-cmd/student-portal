"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/Card";
import { Badge, type BadgeVariant } from "@/components/Badge";
import { formatMoney, getBookings, getRooms, type Booking, type Room } from "@/lib/api";
import { BuildingIcon } from "@/components/icons";

const BOOKING_META: Record<Booking["status"], { label: string; variant: BadgeVariant }> = {
  submitted: { label: "Заявка подана", variant: "info" },
  approved: { label: "Одобрена", variant: "info" },
  documents: { label: "Документы на подписании", variant: "warning" },
  checked_in: { label: "Заселён", variant: "success" },
  rejected: { label: "Отклонена", variant: "danger" },
};

export default function AccommodationPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [building, setBuilding] = useState("Общежитие №2");
  const [room, setRoom] = useState("412");
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([getRooms(), getBookings()])
      .then(([r, b]) => {
        if (!mounted) return;
        setRooms(r);
        setBookings(b);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const booking = bookings[0] ?? null;
  const buildings = Array.from(new Set(rooms.map((r) => r.building)));

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setApplied(true);
    setApplyOpen(false);
  }

  return (
    <DashboardShell title="Общежитие">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-navy-900">Общежитие</h2>
          <p className="mt-1 text-sm text-slate-500">
            Заселение, комнаты и пропускной режим (СКУД)
          </p>
        </div>
        {!applied && (
          <button
            type="button"
            onClick={() => setApplyOpen((v) => !v)}
            className="btn-primary"
          >
            Подать заявку на заселение
          </button>
        )}
      </div>

      {applied && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <Badge variant="success">Подана</Badge>
          <p className="text-sm">
            Заявка на заселение отправлена на рассмотрение администрации общежития.
            Статус доступен в разделе «Мои заявки».
          </p>
        </div>
      )}

      {applyOpen && (
        <Card title="Новая заявка на заселение" className="mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="building" className="label">
                Корпус
              </label>
              <select
                id="building"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="input"
              >
                {buildings.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="room" className="label">
                Комната
              </label>
              <select
                id="room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="input"
              >
                {rooms
                  .filter((r) => r.building === building)
                  .map((r) => (
                    <option key={r.id} value={r.number}>
                      {r.number} ({r.type})
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full">
                Отправить заявку
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Текущая заявка */}
      {booking && (
        <Card className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white">
                <BuildingIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-base font-semibold text-navy-900">
                  {booking.building}, комната {booking.room}
                </p>
                <p className="text-sm text-slate-500">Заявка от {booking.createdAt}</p>
              </div>
            </div>
            <Badge variant={BOOKING_META[booking.status].variant}>
              {BOOKING_META[booking.status].label}
            </Badge>
          </div>
        </Card>
      )}

      {/* Доступные комнаты */}
      <Card
        title="Доступные комнаты"
        subtitle="Свободные места с учётом льгот"
        className="mt-6"
      >
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-200/60" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rooms.map((r) => {
              const free = r.capacity - r.occupied;
              const pct = Math.round((r.occupied / r.capacity) * 100);
              return (
                <div
                  key={r.id}
                  className="rounded-2xl border border-slate-200 p-4 transition hover:shadow-lift"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-navy-900">
                        {r.building} · комн. {r.number}
                      </p>
                      <p className="text-xs text-slate-500">
                        Этаж {r.floor} · {r.type}
                      </p>
                    </div>
                    <Badge variant={r.available ? "success" : "neutral"}>
                      {r.available ? `${free} мест` : "Занята"}
                    </Badge>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>Занятость</span>
                      <span>
                        {r.occupied}/{r.capacity}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${pct >= 100 ? "bg-rose-400" : "bg-brand"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.amenities.map((a) => (
                      <span
                        key={a}
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                      >
                        {a}
                      </span>
                    ))}
                  </div>

                  <p className="mt-3 text-sm font-semibold text-navy-900">
                    {formatMoney(r.pricePerMonth)}{" "}
                    <span className="text-xs font-normal text-slate-400">/мес</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </DashboardShell>
  );
}
