"use client";

interface QrPlaceholderProps {
  value?: string;
  label?: string;
  caption?: string;
  className?: string;
}

const N = 25; // модулей на сторону
const CELL = 8; // px на модуль
const MARGIN = 16; // внешний отступ

function finder(x: number, y: number) {
  const s = CELL * 7;
  return (
    <g>
      <rect x={x} y={y} width={s} height={s} rx={4} fill="#0c2345" />
      <rect x={x + CELL} y={y + CELL} width={CELL * 5} height={CELL * 5} rx={3} fill="#fff" />
      <rect
        x={x + CELL * 2}
        y={y + CELL * 2}
        width={CELL * 3}
        height={CELL * 3}
        rx={2}
        fill="#0c2345"
      />
    </g>
  );
}

function isFinderArea(r: number, c: number): boolean {
  return (
    (r < 8 && c < 8) ||
    (r < 8 && c >= N - 8) ||
    (r >= N - 8 && c < 8)
  );
}

/**
 * Стилизованный QR-код-плейсхолдер (детерминированный паттерн на основе `value`).
 * Используется на экране входа для флоу eGov Mobile.
 */
export function QrPlaceholder({
  value = "student-super-app-demo",
  label = "Отсканируйте QR в eGov Mobile",
  caption = "Действителен 60 секунд",
  className = "",
}: QrPlaceholderProps) {
  const cells: boolean[] = [];
  let seed = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i++) {
    seed ^= value.charCodeAt(i);
    seed = Math.imul(seed, 16777619) >>> 0;
  }
  for (let i = 0; i < N * N; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    cells.push(((seed >>> 16) & 1) === 1);
  }

  const sizePx = N * CELL + MARGIN * 2;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="rounded-2xl bg-white p-4 shadow-lift ring-1 ring-slate-200">
        <svg
          width={sizePx}
          height={sizePx}
          viewBox={`0 0 ${sizePx} ${sizePx}`}
          role="img"
          aria-label={label}
        >
          <rect width={sizePx} height={sizePx} rx={12} fill="#fff" />
          {cells.map((on, i) => {
            if (!on) return null;
            const r = Math.floor(i / N);
            const c = i % N;
            if (isFinderArea(r, c)) return null;
            return (
              <rect
                key={i}
                x={MARGIN + c * CELL}
                y={MARGIN + r * CELL}
                width={CELL}
                height={CELL}
                rx={1.5}
                fill="#0c2345"
              />
            );
          })}
          {finder(MARGIN, MARGIN)}
          {finder(MARGIN + (N - 7) * CELL, MARGIN)}
          {finder(MARGIN, MARGIN + (N - 7) * CELL)}
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="mt-1 text-xs text-slate-500">{caption}</p>
      </div>
    </div>
  );
}
