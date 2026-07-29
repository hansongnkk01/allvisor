import type { LhdnInvoicePayload, LhdnProvider, LhdnSubmitResult } from "./types";

/** Sandbox MyInvois client — simulates acceptance for development. */
export class MyInvoisSandboxProvider implements LhdnProvider {
  async submitInvoice(payload: LhdnInvoicePayload): Promise<LhdnSubmitResult> {
    if (!payload.supplierTin) {
      return {
        success: false,
        status: "rejected",
        response: { message: "Supplier TIN is required" },
        error: "Supplier TIN is required",
      };
    }

    const uuid = crypto.randomUUID();
    return {
      success: true,
      uuid,
      status: "accepted",
      response: {
        environment: process.env.LHDN_ENV || "sandbox",
        uuid,
        invoiceNumber: payload.invoiceNumber,
        acceptedAt: new Date().toISOString(),
        message: "Sandbox submission accepted",
      },
    };
  }
}
