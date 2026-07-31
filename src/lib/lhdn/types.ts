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
  /** Optional ROB/ROC for MyInvois onbehalfof (TIN:BRN). */
  supplierBrn?: string | null;
  supplierSst?: string | null;
  supplierName: string;
  supplierAddress?: string | null;
  supplierPhone?: string | null;
  supplierCity?: string | null;
  supplierPostcode?: string | null;
  /** LHDN state code, e.g. 12 = Sabah */
  supplierStateCode?: string | null;
  supplierMsic?: string | null;
  supplierMsicName?: string | null;
  buyerName: string;
  buyerTin?: string | null;
  buyerBrn?: string | null;
  buyerAddress?: string | null;
  buyerPhone?: string | null;
  buyerCity?: string | null;
  buyerPostcode?: string | null;
  buyerStateCode?: string | null;
  /** CLASS code e.g. 022 healthcare */
  itemClassification?: string | null;
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
