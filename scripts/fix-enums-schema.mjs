// Добавляет @@schema("<схема>") каждому Prisma-enum в соответствии с raw-SQL миграциями.
import { readFileSync, writeFileSync } from 'node:fs';

const p = 'apps/api/prisma/schema.prisma';
let s = readFileSync(p, 'utf8');

const map = {
  UserStatus: 'iam', IdentityProvider: 'iam', IdentityStatus: 'iam', RoleType: 'iam',
  ImportSource: 'iam', ImportStatus: 'iam', ConsentStatus: 'iam', ConsentScope: 'iam',
  DocumentStatus: 'doc', DocumentType: 'doc', PackageStatus: 'doc', SignatureStatus: 'doc',
  SignatureFormat: 'doc', SignerType: 'doc', HashAlgorithm: 'doc',
  DormitoryStatus: 'acc', RoomStatus: 'acc', GenderPolicy: 'acc', ApplicationStatus: 'acc', AllocationStatus: 'acc',
  EligibilityStatus: 'social', MealApplicationStatus: 'social', MealPeriod: 'social',
  TermType: 'acad', EnrollmentStatus: 'acad', ScheduleEntryType: 'acad', Weekday: 'acad',
  GradeStatus: 'acad', AppealStatus: 'acad', ElectiveStatus: 'acad', SubmissionStatus: 'acad',
  QuizStatus: 'acad', QuizAttemptStatus: 'acad', ConversationType: 'acad', ConversationStatus: 'acad', MessageType: 'acad',
  CertificateStatus: 'svc', CertificateType: 'svc', InvoiceStatus: 'svc', PaymentStatus: 'svc', PaymentMethod: 'svc',
  NotificationChannel: 'notif', NotificationStatus: 'notif', NotificationPriority: 'notif',
  OutboxStatus: 'ops',
};

let count = 0;
for (const [name, schema] of Object.entries(map)) {
  const re = new RegExp('(enum ' + name + ' \\{[^}]*)\\n\\}', 'g');
  const before = s;
  s = s.replace(re, '$1\n  @@schema("' + schema + '")\n}');
  if (s !== before) count++;
}

writeFileSync(p, s);
console.log('enums annotated: ' + count);
