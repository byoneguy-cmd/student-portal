// Исправления schema.prisma для Prisma 6 multi-schema (GA):
// 1) убрать deprecated previewFeatures = ["multiSchema"]
// 2) объявить schemas в datasource
// 3) сделать опциональными relation-поля при nullable FK (SetNull)
import { readFileSync, writeFileSync } from 'node:fs';

const p = 'apps/api/prisma/schema.prisma';
let s = readFileSync(p, 'utf8');

s = s.replace('  previewFeatures = ["multiSchema"]\n', '');

s = s.replace(
  '  url      = env("DATABASE_URL")\n',
  '  url      = env("DATABASE_URL")\n  schemas  = ["iam", "doc", "acc", "social", "acad", "svc", "notif", "ops", "public"]\n',
);

s = s.replace(
  /(\w+)(\s+)User(\s+@relation\(fields: \[(?:user_id|admin_user_id|owner_user_id)\], references: \[id\], onDelete: SetNull\))/g,
  '$1$2User?$3',
);

writeFileSync(p, s);
console.log('schema fixed');
