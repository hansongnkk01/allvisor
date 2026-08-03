/**
 * Commerce module — POS, cash drawer, receipts, and retail checkout flows.
 *
 * Commerce routes (/pos, /cash, /receipts, /categories, /logistics, /printers)
 * should load UI entry points via this module rather than importing
 * @/components directly, so POS code stays out of unrelated route bundles.
 */
export { PosWorkspace } from "@/components/PosWorkspace";
export type { PosProduct } from "@/components/PosWorkspace";
export { PosWorkspaceLazy } from "@/components/PosWorkspaceLazy";
