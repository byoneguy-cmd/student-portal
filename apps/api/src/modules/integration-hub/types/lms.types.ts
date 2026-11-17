/**
 * Контракты LMS-адаптеров (Platonus / 1С:Университет).
 * Единая внутренняя модель Academic; приём и poll (cursor), и webhook (push).
 */

/** Запись расписания. */
export interface LmsScheduleEntry {
  externalId?: string;
  subjectCode: string;
  subjectName?: string;
  type: string; // LECTURE / PRACTICE / LAB / SEMINAR / EXAM
  teacherId?: string;
  teacherName?: string;
  room?: string;
  startAt: string;
  endAt: string;
}

/** Payload синхронизации расписания. */
export interface LmsScheduleSyncPayload {
  term: string;
  group?: string;
  entries: LmsScheduleEntry[];
}

/** Запись оценки. */
export interface LmsGradeEntry {
  externalId?: string;
  subjectCode: string;
  grade: number;
  gradeType?: string;
  ects?: number;
  passedAt?: string;
}

/** Payload синхронизации оценок. */
export interface LmsGradeSyncPayload {
  term: string;
  studentId: string;
  entries: LmsGradeEntry[];
}

/** Payload импорта зачисления (enrollment). */
export interface LmsEnrollmentPayload {
  term: string;
  studentId: string;
  group?: string;
  educationForm?: string;
  educationBase?: string;
  specialtyCode?: string;
  specialtyName?: string;
  course?: number;
}

/** Результат синхронизации расписания. */
export interface LmsSyncResult {
  scheduleId: string;
  entries: number;
}

/** Результат синхронизации оценок. */
export interface LmsGradeSyncResult {
  grades: number;
}

/** Результат импорта зачисления. */
export interface LmsEnrollmentResult {
  enrollmentId: string;
}
