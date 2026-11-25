// Ids of users, templates, goals and entries are PostgreSQL INT4 columns (Prisma `Int`,
// autoincrement), so a stored id is always a whole number from 1 to 2147483647.
// A value outside that range cannot belong to any row. Routes treat it exactly like an
// unknown id (404 for a path id, 422 TEMPLATE_NOT_PUBLISHED for a goal's templateId) instead
// of passing it to Prisma, which throws for numbers that do not fit INT4 (Lab 6 KI-1, #59).
export const MAX_DB_ID = 2147483647;

export function isDbId(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0 && (value as number) <= MAX_DB_ID;
}
