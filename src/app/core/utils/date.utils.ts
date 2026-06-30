// src/app/core/utils/date.utils.ts

/**
 * Convierte una fecha a formato 'YYYY-MM-DD' usando la ZONA HORARIA LOCAL,
 * NO UTC. Esto es crítico: `date.toISOString()` siempre devuelve la fecha
 * en UTC, lo que puede adelantar o atrasar un día completo dependiendo de
 * la hora y el huso horario del usuario (ej: México UTC-6).
 *
 * Usar SIEMPRE esta función en vez de `new Date().toISOString().split('T')[0]`
 * para fechas de citas, agenda, dashboard, etc.
 */
export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Devuelve la fecha de hoy en formato 'YYYY-MM-DD', en hora local.
 */
export function todayLocalDateString(): string {
  return toLocalDateString(new Date());
}