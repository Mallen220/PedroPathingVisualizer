import type { Settings } from "../types";
import { DEFAULT_SETTINGS } from "../config/defaults";

export function handleNumberInput(
  settings: Settings,
  value: string,
  property: keyof Settings,
  min?: number,
  max?: number,
  restoreDefaultIfEmpty = false,
) {
  if (value === "" && restoreDefaultIfEmpty) {
    (settings as any)[property] = DEFAULT_SETTINGS[property];
    return;
  }
  let num = parseFloat(value);
  if (isNaN(num)) num = 0;
  if (min !== undefined) num = Math.max(min, num);
  if (max !== undefined) num = Math.min(max, num);
  (settings as any)[property] = num;
}
