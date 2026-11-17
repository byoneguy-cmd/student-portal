/**
 * API-клиент студенческого портала.
 *
 * - baseUrl берётся из NEXT_PUBLIC_API_URL (см. apps/web/.env.example).
 * - Bearer-токен хранится в localStorage.
 * - При недоступности API возвращаются осмысленные mock-данные (без пустых экранов).
 *
 * Все типы предметной области и демо-данные собраны здесь, чтобы страницы
 * оставались тонкими и переиспользовали единый контракт.
 */

export type Role =
  | "student"
  | "lecturer"
  | "deanery"
  | "finance"
  | "dorm_admin"
  | "canteen_admin"
  | "admin";

export interface User {
  id: string;
  iin: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  faculty: string;
  department: string;
  group: string;
  course: number;
  enrollmentYear: number;
  avatarInitials: string;
}

export interface ScheduleEntry {
  id: string;
  day: string;
  date: string;
  time: string;
  subject: string;
  type: "Лекция" | "Практика" | "Лабораторная" | "Семинар";
  room: string;
  lecturer: string;
}

export interface Grade {
  id: string;
  subject: string;
  semester: string;
  credits: number;
  score: number;
  grade: string;
  gpaPoints: number;
  examDate: string;
}

export interface GpaSummary {
  totalCredits: number;
  weightedPoints: number;
  gpa: number;
  completedCourses: number;
  academicStanding: string;
}

export type DocumentStatus = "draft" | "pending_sign" | "signed" | "rejected";

export interface StudentDocument {
  id: string;
  title: string;
  type: string;
  status: DocumentStatus;
  createdAt: string;
  signedAt: string | null;
  sizeKb: number;
  hash: string;
}

export interface Room {
  id: string;
  building: string;
  floor: number;
  number: string;
  type: string;
  capacity: number;
  occupied: number;
  pricePerMonth: number;
  available: boolean;
  amenities: string[];
}

export type BookingStatus =
  | "submitted"
  | "approved"
  | "documents"
  | "checked_in"
  | "rejected";

export interface Booking {
  id: string;
  roomId: string;
  building: string;
  room: string;
  status: BookingStatus;
  createdAt: string;
  checkinDate: string | null;
}

export type MealApplicationStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "active"
  | "rejected";

export interface MealApplication {
  id: string;
  category: string;
  status: MealApplicationStatus;
  submittedAt: string;
  decisionAt: string | null;
}

export interface MealStatus {
  eligible: boolean;
  category: string;
  basis: string;
  validUntil: string;
  canteen: string;
  syncStatus: "synced" | "pending" | "failed";
}

export interface CertificateType {
  id: string;
  name: string;
  description: string;
  processingDays: number;
  price: number;
}

export type CertificateStatus = "processing" | "ready" | "issued" | "rejected";

export interface Certificate {
  id: string;
  type: string;
  status: CertificateStatus;
  requestedAt: string;
  issuedAt: string | null;
}

export type InvoiceStatus = "paid" | "partial" | "unpaid";

export interface Invoice {
  id: string;
  name: string;
  semester: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
}

export interface FinanceBalance {
  tuitionTotal: number;
  paid: number;
  due: number;
  deadline: string;
  scholarship: number;
  currency: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  date: string;
  read: boolean;
  kind: "info" | "success" | "warning";
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ---------------------------------------------------------------------------
// Конфигурация и токен
// ---------------------------------------------------------------------------

export const TOKEN_STORAGE_KEY = "sp_access_token";
export const MOCK_MODE = true;
export const MOCK_TOKEN = "mock-token-demo";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // localStorage может быть недоступен (private mode) — игнорируем
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Демо-данные (mock)
// ---------------------------------------------------------------------------

export const DEMO_USER: User = {
  id: "u-1001",
  iin: "031001500123",
  fullName: "Айгерим Нурланова",
  email: "a.nurlanova@student.kz",
  phone: "+7 700 123 45 67",
  role: "student",
  faculty: "Факультет информационных технологий",
  department: "Кафедра информационных систем",
  group: "ИС-22-01",
  course: 3,
  enrollmentYear: 2022,
  avatarInitials: "АН",
};

export const MOCK_SCHEDULE: ScheduleEntry[] = [
  { id: "s-01", day: "Понедельник", date: "17.11", time: "09:00–10:40", subject: "Базы данных", type: "Лекция", room: "А-204", lecturer: "Тулегенов А. К." },
  { id: "s-02", day: "Понедельник", date: "17.11", time: "11:00–12:40", subject: "Алгоритмы и структуры данных", type: "Лекция", room: "Б-102", lecturer: "Серикова Д. М." },
  { id: "s-03", day: "Понедельник", date: "17.11", time: "14:00–15:40", subject: "Веб-разработка", type: "Лабораторная", room: "К-305", lecturer: "Ахметов Н. С." },
  { id: "s-04", day: "Вторник", date: "18.11", time: "09:00–10:40", subject: "Операционные системы", type: "Лекция", room: "А-110", lecturer: "Куандыков Е. Т." },
  { id: "s-05", day: "Вторник", date: "18.11", time: "11:00–12:40", subject: "Базы данных", type: "Практика", room: "К-208", lecturer: "Тулегенов А. К." },
  { id: "s-06", day: "Среда", date: "19.11", time: "09:00–10:40", subject: "Теория вероятностей", type: "Лекция", room: "В-301", lecturer: "Жумабаева Г. Р." },
  { id: "s-07", day: "Среда", date: "19.11", time: "11:00–12:40", subject: "Веб-разработка", type: "Практика", room: "К-305", lecturer: "Ахметов Н. С." },
  { id: "s-08", day: "Среда", date: "19.11", time: "14:00–15:40", subject: "Иностранный язык (проф.)", type: "Семинар", room: "Г-12", lecturer: "Петрова И. В." },
  { id: "s-09", day: "Четверг", date: "20.11", time: "09:00–10:40", subject: "Алгоритмы и структуры данных", type: "Лабораторная", room: "К-201", lecturer: "Серикова Д. М." },
  { id: "s-10", day: "Четверг", date: "20.11", time: "11:00–12:40", subject: "Операционные системы", type: "Практика", room: "А-110", lecturer: "Куандыков Е. Т." },
  { id: "s-11", day: "Пятница", date: "21.11", time: "09:00–10:40", subject: "Базы данных", type: "Лекция", room: "А-204", lecturer: "Тулегенов А. К." },
  { id: "s-12", day: "Пятница", date: "21.11", time: "13:00–14:40", subject: "Физическая культура", type: "Практика", room: "Спортзал", lecturer: "Сагинбаев К. Ж." },
];

/** День, который считается «сегодня» для виджета на дашборде. */
export const TODAY_DAY = "Вторник";

export const MOCK_GRADES: Grade[] = [
  { id: "g-01", subject: "Базы данных", semester: "Осень 2025", credits: 5, score: 92, grade: "A", gpaPoints: 4.0, examDate: "12.12.2025" },
  { id: "g-02", subject: "Алгоритмы и структуры данных", semester: "Осень 2025", credits: 5, score: 88, grade: "A-", gpaPoints: 3.67, examDate: "15.12.2025" },
  { id: "g-03", subject: "Веб-разработка", semester: "Осень 2025", credits: 4, score: 95, grade: "A", gpaPoints: 4.0, examDate: "10.12.2025" },
  { id: "g-04", subject: "Операционные системы", semester: "Осень 2025", credits: 4, score: 82, grade: "B+", gpaPoints: 3.33, examDate: "17.12.2025" },
  { id: "g-05", subject: "Теория вероятностей", semester: "Осень 2025", credits: 3, score: 78, grade: "B", gpaPoints: 3.0, examDate: "08.12.2025" },
  { id: "g-06", subject: "Иностранный язык (проф.)", semester: "Осень 2025", credits: 2, score: 91, grade: "A", gpaPoints: 4.0, examDate: "05.12.2025" },
  { id: "g-07", subject: "Физическая культура", semester: "Осень 2025", credits: 1, score: 98, grade: "A", gpaPoints: 4.0, examDate: "01.12.2025" },
];

export const MOCK_DOCUMENTS: StudentDocument[] = [
  { id: "d-01", title: "Договор найма жилого помещения", type: "Договор", status: "pending_sign", createdAt: "14.11.2025", signedAt: null, sizeKb: 248, hash: "0x9f2c…e41a" },
  { id: "d-02", title: "Акт приёма-передачи комнаты", type: "Акт", status: "pending_sign", createdAt: "14.11.2025", signedAt: null, sizeKb: 96, hash: "0x77a1…c30d" },
  { id: "d-03", title: "Заявление на льготное питание", type: "Заявление", status: "signed", createdAt: "01.09.2025", signedAt: "05.09.2025", sizeKb: 112, hash: "0x3e0b…821f" },
  { id: "d-04", title: "Справка с места учёбы", type: "Справка", status: "signed", createdAt: "28.09.2025", signedAt: "02.10.2025", sizeKb: 84, hash: "0x1d55…907c" },
  { id: "d-05", title: "Транскрипт (весенний семестр)", type: "Справка", status: "signed", createdAt: "20.06.2025", signedAt: "23.06.2025", sizeKb: 156, hash: "0xbb03…44de" },
  { id: "d-06", title: "Согласие на обработку ПДн", type: "Согласие", status: "signed", createdAt: "28.08.2025", signedAt: "01.09.2025", sizeKb: 68, hash: "0x5c8f…19aa" },
];

export const MOCK_ROOMS: Room[] = [
  { id: "r-01", building: "Общежитие №2", floor: 4, number: "412", type: "2-местная", capacity: 2, occupied: 1, pricePerMonth: 18000, available: true, amenities: ["Wi-Fi", "Кухня", "Прачечная"] },
  { id: "r-02", building: "Общежитие №2", floor: 4, number: "415", type: "3-местная", capacity: 3, occupied: 2, pricePerMonth: 15000, available: true, amenities: ["Wi-Fi", "Кухня"] },
  { id: "r-03", building: "Общежитие №1", floor: 5, number: "508", type: "2-местная", capacity: 2, occupied: 0, pricePerMonth: 20000, available: true, amenities: ["Wi-Fi", "Душ", "Прачечная"] },
  { id: "r-04", building: "Общежитие №1", floor: 2, number: "207", type: "4-местная", capacity: 4, occupied: 4, pricePerMonth: 12000, available: false, amenities: ["Кухня"] },
];

export const MOCK_BOOKINGS: Booking[] = [
  { id: "b-01", roomId: "r-01", building: "Общежитие №2", room: "412", status: "documents", createdAt: "10.11.2025", checkinDate: null },
];

export const MOCK_MEAL_STATUS: MealStatus = {
  eligible: true,
  category: "Социально уязвимые слои населения (СУСН)",
  basis: "Многодетная семья",
  validUntil: "30.06.2026",
  canteen: "Столовая корпуса А",
  syncStatus: "synced",
};

export const MOCK_MEAL_APPLICATIONS: MealApplication[] = [
  { id: "m-01", category: "Льготное питание (СУСН)", status: "active", submittedAt: "01.09.2025", decisionAt: "05.09.2025" },
  { id: "m-02", category: "Льготное питание (СУСН)", status: "approved", submittedAt: "20.08.2024", decisionAt: "27.08.2024" },
];

export const MOCK_CERTIFICATE_TYPES: CertificateType[] = [
  { id: "ct-01", name: "Справка с места учёбы", description: "Подтверждает факт обучения для гос. органов и работодателей", processingDays: 1, price: 0 },
  { id: "ct-02", name: "Академическая справка (транскрипт)", description: "Перечень дисциплин и оценок с ЭЦП вуза", processingDays: 3, price: 500 },
  { id: "ct-03", name: "Справка о размере стипендии", description: "Для банков и социальных служб", processingDays: 2, price: 0 },
  { id: "ct-04", name: "Справка для военкомата", description: "Приписная / отсрочка по месту учёбы", processingDays: 2, price: 0 },
];

export const MOCK_CERTIFICATES: Certificate[] = [
  { id: "c-01", type: "Справка с места учёбы", status: "ready", requestedAt: "12.11.2025", issuedAt: "14.11.2025" },
  { id: "c-02", type: "Академическая справка (транскрипт)", status: "processing", requestedAt: "15.11.2025", issuedAt: null },
];

export const MOCK_FINANCE: FinanceBalance = {
  tuitionTotal: 450000,
  paid: 250000,
  due: 200000,
  deadline: "20.12.2025",
  scholarship: 41845,
  currency: "₸",
};

export const MOCK_INVOICES: Invoice[] = [
  { id: "i-01", name: "Оплата обучения (осенний семестр)", semester: "2025/2026 · Осень", amount: 450000, dueDate: "20.12.2025", status: "partial" },
  { id: "i-02", name: "Проживание в общежитии (сентябрь–декабрь)", semester: "2025/2026 · Осень", amount: 72000, dueDate: "05.09.2025", status: "paid" },
  { id: "i-03", name: "Проживание в общежитии (январь–май)", semester: "2025/2026 · Весна", amount: 90000, dueDate: "20.01.2026", status: "unpaid" },
  { id: "i-04", name: "Библиотечный залог", semester: "Единоразово", amount: 5000, dueDate: "01.09.2025", status: "paid" },
];

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  { id: "n-01", title: "Документы на подпись", description: "Пакет заселения ожидает вашей ЭЦП", date: "14.11.2025", read: false, kind: "warning" },
  { id: "n-02", title: "Расписание обновлено", description: "Замена пары по «Базам данных» в четверг", date: "13.11.2025", read: false, kind: "info" },
  { id: "n-03", title: "Стипендия начислена", description: "За октябрь: 41 845 ₸", date: "05.11.2025", read: true, kind: "success" },
];

// ---------------------------------------------------------------------------
// Низкоуровневый запрос
// ---------------------------------------------------------------------------

function unwrap<T>(payload: T | { data: T }): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in (payload as Record<string, unknown>)
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new ApiError(`HTTP ${res.status}`, res.status);
    }

    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Выполняет запрос и при любой ошибке/пустом списке возвращает `fallback`,
 * гарантируя, что интерфейс не останется пустым при недоступности API.
 */
async function safeRequest<T>(
  path: string,
  fallback: T,
  init?: RequestInit,
): Promise<T> {
  try {
    const data = await request<unknown>(path, init);
    const raw = unwrap(data) as T;
    if (raw === undefined || raw === null) return fallback;
    if (Array.isArray(raw) && raw.length === 0) return fallback;
    return raw;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Публичные методы API (с fallback на mock)
// ---------------------------------------------------------------------------

export function computeGpa(grades: Grade[]): GpaSummary {
  let totalCredits = 0;
  let weightedPoints = 0;
  for (const g of grades) {
    totalCredits += g.credits;
    weightedPoints += g.credits * g.gpaPoints;
  }
  const gpa = totalCredits > 0 ? weightedPoints / totalCredits : 0;
  const academicStanding =
    gpa >= 3.67
      ? "Отличник (Dean's List)"
      : gpa >= 3.0
        ? "Хорошист"
        : gpa >= 2.0
          ? "Успевающий"
          : "Требуется внимание";
  return {
    totalCredits,
    weightedPoints,
    gpa,
    completedCourses: grades.length,
    academicStanding,
  };
}

export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<AuthResponse> {
  try {
    const data = await request<{
      access_token?: string;
      token?: string;
      user?: User;
    }>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return {
      token: data.access_token ?? data.token ?? MOCK_TOKEN,
      user: data.user ?? DEMO_USER,
    };
  } catch {
    return { token: MOCK_TOKEN, user: DEMO_USER };
  }
}

export function getCurrentUser(): Promise<User> {
  return safeRequest<User>("/v1/iam/users/me", DEMO_USER);
}

export function getSchedule(): Promise<ScheduleEntry[]> {
  return safeRequest<ScheduleEntry[]>("/v1/academic/schedule", MOCK_SCHEDULE);
}

export function getGrades(): Promise<Grade[]> {
  return safeRequest<Grade[]>("/v1/academic/grades/me", MOCK_GRADES);
}

export function getGpa(): Promise<GpaSummary> {
  return safeRequest<GpaSummary>("/v1/academic/gpa/me", computeGpa(MOCK_GRADES));
}

export function getDocuments(): Promise<StudentDocument[]> {
  return safeRequest<StudentDocument[]>("/v1/documents", MOCK_DOCUMENTS);
}

export function getRooms(): Promise<Room[]> {
  return safeRequest<Room[]>("/v1/accommodation/rooms", MOCK_ROOMS);
}

export function getBookings(): Promise<Booking[]> {
  return safeRequest<Booking[]>("/v1/accommodation/bookings/me", MOCK_BOOKINGS);
}

export function getMealStatus(): Promise<MealStatus> {
  return safeRequest<MealStatus>("/v1/social/meal/status", MOCK_MEAL_STATUS);
}

export function getMealApplications(): Promise<MealApplication[]> {
  return safeRequest<MealApplication[]>(
    "/v1/social/meal/applications/me",
    MOCK_MEAL_APPLICATIONS,
  );
}

export function getCertificateTypes(): Promise<CertificateType[]> {
  return safeRequest<CertificateType[]>(
    "/v1/services/certificates/types",
    MOCK_CERTIFICATE_TYPES,
  );
}

export function getCertificates(): Promise<Certificate[]> {
  return safeRequest<Certificate[]>(
    "/v1/services/certificates/me",
    MOCK_CERTIFICATES,
  );
}

export function getFinanceBalance(): Promise<FinanceBalance> {
  return safeRequest<FinanceBalance>(
    "/v1/services/finance/balance",
    MOCK_FINANCE,
  );
}

export function getInvoices(): Promise<Invoice[]> {
  return safeRequest<Invoice[]>(
    "/v1/services/finance/invoices",
    MOCK_INVOICES,
  );
}

export function getNotifications(): Promise<NotificationItem[]> {
  return safeRequest<NotificationItem[]>(
    "/v1/notifications/me",
    MOCK_NOTIFICATIONS,
  );
}

/** Утилиты форматирования (общие для страниц). */
export function formatMoney(value: number, currency = "₸"): string {
  return `${value.toLocaleString("ru-RU")} ${currency}`;
}
