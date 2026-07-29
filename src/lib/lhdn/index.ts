import type { LhdnProvider } from "./types";
import { MyInvoisSandboxProvider } from "./sandbox";
import { MyInvoisProductionProvider } from "./production";

export type { LhdnInvoicePayload, LhdnProvider, LhdnSubmitResult } from "./types";
export { MyInvoisSandboxProvider } from "./sandbox";
export { MyInvoisProductionProvider } from "./production";

export function getLhdnProvider(): LhdnProvider {
  const env = (process.env.LHDN_ENV || "sandbox").toLowerCase();
  const hasCreds = Boolean(
    process.env.LHDN_CLIENT_ID && process.env.LHDN_CLIENT_SECRET
  );

  if (env === "production" || (env !== "sandbox" && hasCreds)) {
    return new MyInvoisProductionProvider();
  }

  return new MyInvoisSandboxProvider();
}
