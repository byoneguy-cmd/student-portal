// Вспомогательный скрипт: конвертирует однострочные Prisma-enum
// "enum X { A B C }" в валидный многострочный формат.
import { readFileSync, writeFileSync } from 'node:fs';

const p = 'apps/api/prisma/schema.prisma';
const s = readFileSync(p, 'utf8');

const lines = s.split('\n').map((line) => {
  const m = line.match(/^enum\s+(\w+)\s*\{\s*([^}]+?)\s*\}\s*$/);
  if (m) {
    const vals = m[2].split(/\s+/).filter(Boolean);
    return `enum ${m[1]} {\n${vals.map((v) => '  ' + v).join('\n')}\n}`;
  }
  return line;
});

writeFileSync(p, lines.join('\n'));
console.log('enums fixed');
