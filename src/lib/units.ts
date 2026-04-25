import type { Units } from './params/schema';

const MM_PER_INCH = 25.4;

/** Format a millimetre value for display in the active unit system. */
export function fmtLength(mm: number, units: Units, fractionDigits = 1): string {
  if (units === 'imperial') {
    return `${(mm / MM_PER_INCH).toFixed(fractionDigits + 1)}"`;
  }
  return `${mm.toFixed(fractionDigits)} mm`;
}

/** Suffix for length-input fields. */
export function lengthSuffix(units: Units): string {
  return units === 'imperial' ? 'in' : 'mm';
}
