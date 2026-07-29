export type LhdnSubmitResult = {
  success: boolean;
  uuid?: string;
  status: "pending" | "accepted" | "rejected";
  response: Record<string, unknown>;
  error?: string;
};

export type LhdnInvoicePayload = {
  invoiceNumber: string;
  issueDate: string;
  supplierTin: string;
  supplierName: string;
  buyerName: string;
  buyerTin?: string | null;
  total: number;
  taxAmount: number;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

export interface LhdnProvider {
  submitInvoice(payload: LhdnInvoicePayload): Promise<LhdnSubmitResult>;
}
