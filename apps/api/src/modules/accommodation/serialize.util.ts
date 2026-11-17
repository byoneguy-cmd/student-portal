/**
 * Рекурсивно приводит результат Prisma к JSON-безопасному виду:
 *  - BigInt → строка (JSON.stringify не умеет сериализовать bigint и бросает TypeError);
 *  - Date → ISO-строка;
 *  - Prisma.Decimal → строка;
 *  - вложенные объекты и массивы обходятся рекурсивно.
 */
export function toJson<T>(value: T): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => toJson(item));
  if (typeof value === 'object') {
    const ctor = (value as { constructor?: { name?: string } }).constructor;
    if (ctor && ctor.name === 'Decimal') return String(value);
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = toJson(val);
    }
    return out;
  }
  return value;
}
