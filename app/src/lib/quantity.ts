/** Turns raw input text into a whole quantity in [1, max]. Never returns a fraction, NaN or Infinity. */
export function clampQuantity(raw: string | number, max: number): number {
  const parsed = typeof raw === "number" ? raw : Number(raw);
  const whole = Number.isFinite(parsed) ? Math.trunc(parsed) : 1;
  return Math.min(Math.max(whole, 1), Math.max(Math.trunc(max) || 1, 1));
}
