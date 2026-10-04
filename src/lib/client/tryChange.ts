import type { Profile } from "@/lib/domain/types";

/** Try a change may only edit supplements the person already answered; unresolved answers stay unresolved. */
export function canChangeSupplements(status: Profile["supplementsStatus"]): boolean {
  return status === "none" || status === "some";
}

/** The status after the supplement list changes, or null when the previous answer was unresolved. */
export function supplementsStatusAfterChange(
  previous: Profile["supplementsStatus"],
  nextListLength: number,
): "none" | "some" | null {
  if (!canChangeSupplements(previous)) return null;
  return nextListLength > 0 ? "some" : "none";
}
