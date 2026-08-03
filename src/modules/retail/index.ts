/** Retail niche — POS & inventory-heavy flows */
export { PosWorkspace, PosWorkspaceLazy } from "@/modules/commerce";
export type { PosProduct } from "@/modules/commerce";
export const retailFeatures = ["pos", "inventory", "customers", "invoices"] as const;
