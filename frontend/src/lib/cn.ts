import { clsx } from "clsx";
import type { ClassValue } from "clsx";

/** Thin wrapper around clsx so components can compose conditional
 * Tailwind classes without repeating clsx's import everywhere. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}