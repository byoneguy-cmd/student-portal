/**
 * Вспомогательная сериализация результата Prisma перед JSON-ответом.
 * Поля BigInt (id) не сериализуются стандартным JSON.stringify, поэтому
 * преобразуем их в строки. Decimal (credits/gpa) Prisma сериализует сам.
 */
export function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key: string, v: unknown) => (typeof v === 'bigint' ? v.toString() : v)),
  ) as T;
}
