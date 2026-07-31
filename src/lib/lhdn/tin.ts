/** Normalize Malaysian TIN for MyInvois (no spaces). */
export function normalizeTin(tin: string) {
  return tin.replace(/\s+/g, "").trim().toUpperCase();
}

/** MyInvois onbehalfof: TIN, or TIN:BRN for sole prop with ROB. */
export function buildOnBehalfOf(tin: string, brn?: string | null) {
  const cleanTin = normalizeTin(tin);
  const cleanBrn = brn?.replace(/\s+/g, "").trim();
  if (cleanBrn && cleanBrn.toUpperCase() !== "NA") return `${cleanTin}:${cleanBrn}`;
  return cleanTin;
}
