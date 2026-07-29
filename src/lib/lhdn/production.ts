import type { LhdnInvoicePayload, LhdnProvider, LhdnSubmitResult } from "./types";

/**
 * Production MyInvois provider scaffold.
 * Selected when LHDN_ENV=production (or credentials present with non-sandbox env).
 * Full API wire-up needs official MyInvois endpoints — fails closed until then.
 */
export class MyInvoisProductionProvider implements LhdnProvider {
  async submitInvoice(payload: LhdnInvoicePayload): Promise<LhdnSubmitResult> {
    const clientId = process.env.LHDN_CLIENT_ID;
    const clientSecret = process.env.LHDN_CLIENT_SECRET;
    const env = process.env.LHDN_ENV || "production";

    if (!clientId || !clientSecret) {
      return {
        success: false,
        status: "rejected",
        response: { message: "Missing LHDN_CLIENT_ID / LHDN_CLIENT_SECRET" },
        error: "Missing LHDN API credentials",
      };
    }

    if (!payload.supplierTin) {
      return {
        success: false,
        status: "rejected",
        response: { message: "Supplier TIN is required" },
        error: "Supplier TIN is required",
      };
    }

    return {
      success: false,
      status: "rejected",
      response: {
        environment: env,
        invoiceNumber: payload.invoiceNumber,
        message:
          "Production MyInvois credentials detected, but API mapping is not fully wired yet. Use LHDN_ENV=sandbox for demo.",
      },
      error:
        "Production MyInvois API not fully wired. Set LHDN_ENV=sandbox for demo, or complete API integration.",
    };
  }
}
