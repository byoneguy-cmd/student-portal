"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { QrPlaceholder } from "@/components/QrPlaceholder";
import { QrCodeIcon, ShieldCheckIcon, UserIcon } from "@/components/icons";

type Method = "form" | "qr" | "ncalayer" | null;

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithNcalayer, loginWithEgov } = useAuth();

  const [method, setMethod] = useState<Method>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("student@portal.kz");
  const [password, setPassword] = useState("demo");

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
      router.replace("/dashboard");
    } catch {
      setError("Не удалось выполнить вход. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || !password) {
      setError("Введите логин и пароль.");
      return;
    }
    await run(() => login(email, password));
  }

  function handleDemo() {
    setEmail("student@portal.kz");
    setPassword("demo");
    void run(() => login("student@portal.kz", "demo"));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 px-4 py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-lift lg:grid-cols-2">
        {/* Бренд-панель */}
        <div className="hidden flex-col justify-between bg-navy-900 p-10 text-white lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-lg font-bold">
                СП
              </span>
              <div>
                <p className="text-base font-bold">Студенческий портал</p>
                <p className="text-xs text-white/50">Student Super-App</p>
              </div>
            </div>
            <h1 className="mt-10 text-3xl font-bold leading-tight">
              Единый личный кабинет студента
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Расписание, оценки, документы с ЭЦП, заселение и льготы — без бумаги,
              в одном месте.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-white/70">
            <li className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-brand-light" />
              Вход и подписание через eGov Mobile / NCALayer
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-brand-light" />
              Юридически значимые документы (ЭЦП, hash-chain)
            </li>
          </ul>
        </div>

        {/* Форма входа */}
        <div className="p-8 sm:p-10">
          <div className="mb-6 lg:hidden">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-sm font-bold text-white">
                СП
              </span>
              <span className="text-base font-bold text-navy-900">
                Студенческий портал
              </span>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-navy-900">
            Вход в портал
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Выберите способ авторизации
          </p>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => setMethod(method === "qr" ? null : "qr")}
              className="btn w-full border border-slate-300 bg-white text-navy-800 hover:bg-slate-50"
            >
              <QrCodeIcon className="h-5 w-5 text-brand" />
              Войти через eGov Mobile (QR)
            </button>

            <button
              type="button"
              onClick={() => run(loginWithNcalayer)}
              disabled={busy}
              className="btn-primary w-full"
            >
              <ShieldCheckIcon className="h-5 w-5" />
              {busy ? "Проверка ЭЦП…" : "Войти через NCALayer"}
            </button>
          </div>

          {/* QR-флоу */}
          {method === "qr" && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <QrPlaceholder />
              <button
                type="button"
                onClick={() => run(loginWithEgov)}
                disabled={busy}
                className="btn-primary mt-3 w-full"
              >
                {busy ? "Ожидание подтверждения…" : "Симулировать сканирование"}
              </button>
              <p className="mt-2 text-center text-xs text-slate-500">
                В боевой версии здесь — WebSocket-подписка на результат сканирования.
              </p>
            </div>
          )}

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase text-slate-400">
              или резервный вход
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Логин / e-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="student@portal.kz"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Пароль
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-secondary w-full">
              <UserIcon className="h-5 w-5" />
              {busy ? "Вход…" : "Войти"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleDemo}
            disabled={busy}
            className="mt-4 w-full text-center text-sm font-medium text-brand hover:text-brand-dark disabled:opacity-60"
          >
            Войти как демо-студент →
          </button>
        </div>
      </div>
    </div>
  );
}
