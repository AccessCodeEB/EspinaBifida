/**
 * Oracle no acepta arrays en IN (:arr).
 * buildInClause genera :p0,:p1,... y el objeto de binds correspondiente.
 *
 * Ejemplo:
 *   buildInClause(['Monterrey','Guadalupe'], 'm')
 *   → { placeholders: ':m0,:m1', binds: { m0: 'Monterrey', m1: 'Guadalupe' } }
 */
export function buildInClause(values, prefix) {
  const placeholders = values.map((_, i) => `:${prefix}${i}`).join(',');
  const binds = Object.fromEntries(values.map((v, i) => [`${prefix}${i}`, v]));
  return { placeholders, binds };
}
