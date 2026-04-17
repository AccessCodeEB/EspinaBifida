/**
 * Converts an Oracle DB row (UPPER_SNAKE_CASE keys) into a camelCase object
 * so the frontend receives consistent JSON naming.
 *
 * Example: { APELLIDO_PATERNO: "García" } → { apellidoPaterno: "García" }
 */
export function toCamel(row) {
  if (!row || typeof row !== "object") return row;

  const result = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key
      .toLowerCase()
      .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

    // Oracle DATE/TIMESTAMP objects come as JS Date — serialize to ISO string
    if (value instanceof Date) {
      result[camelKey] = value.toISOString().slice(0, 10);
    } else {
      result[camelKey] = value;
    }
  }
  return result;
}

/** Maps an array of Oracle rows to camelCase objects */
export function toCamelArray(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(toCamel);
}
