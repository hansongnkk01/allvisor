import type { LhdnProvider } from "./types";
import { MyInvoisSandboxProvider } from "./sandbox";
import { MyInvoisLiveProvider } from "./live";

export type { LhdnInvoicePayload, LhdnProvider, LhdnSubmitResult } from "./types";
export { MyInvoisSandboxProvider } from "./sandbox";
export { MyInvoisLiveProvider } from "./live";
export {
  displayLhdnStatus,
  fetchMyInvoisDocumentDetails,
  pollMyInvoisDocumentStatus,
} from "./status";

export function getLhdnMode(): "intermediary" | "taxpayer" | "demo" {
  const hasCreds = Boolean(
    process.env.LHDN_CLIENT_ID && process.env.LHDN_CLIENT_SECRET
  );
  if (!hasCreds) return "demo";
  const mode = (process.env.LHDN_MODE || "intermediary").toLowerCase();
  return mode === "taxpayer" ? "taxpayer" : "intermediary";
}

export function getLhdnProvider(): LhdnProvider {
  const env = (process.env.LHDN_ENV || "sandbox").toLowerCase();
  const hasCreds = Boolean(
    process.env.LHDN_CLIENT_ID && process.env.LHDN_CLIENT_SECRET
  );

  // Real MyInvois API (sandbox or production) when platform credentials exist.
  // Default LHDN_MODE=intermediary: token uses onbehalfof = shop TIN.
  if (hasCreds) {
    return new MyInvoisLiveProvider(env === "production" ? "production" : "sandbox");
  }

  // Local demo only when credentials are not configured
  return new MyInvoisSandboxProvider();
}
