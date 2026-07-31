import type { LhdnInvoicePayload, LhdnProvider, LhdnSubmitResult } from "./types";
import { createHash } from "crypto";

const IDENTITY_URL = {
  sandbox: "https://preprod-api.myinvois.hasil.gov.my/connect/token",
  production: "https://api.myinvois.hasil.gov.my/connect/token",
};

const API_BASE = {
  sandbox: "https://preprod-api.myinvois.hasil.gov.my",
  production: "https://api.myinvois.hasil.gov.my",
};

function lhdnMode(): "intermediary" | "taxpayer" {
  const mode = (process.env.LHDN_MODE || "intermediary").toLowerCase();
  return mode === "taxpayer" ? "taxpayer" : "intermediary";
}

/** MyInvois onbehalfof: TIN, or TIN:BRN for sole prop with ROB. */
export function buildOnBehalfOf(tin: string, brn?: string | null) {
  const cleanTin = tin.trim();
  const cleanBrn = brn?.trim();
  if (cleanBrn) return `${cleanTin}:${cleanBrn}`;
  return cleanTin;
}

async function getAccessToken(
  env: "sandbox" | "production",
  onBehalfOf?: string
) {
  const clientId = process.env.LHDN_CLIENT_ID;
  const clientSecret = process.env.LHDN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing LHDN_CLIENT_ID / LHDN_CLIENT_SECRET");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: "InvoicingAPI",
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (lhdnMode() === "intermediary") {
    if (!onBehalfOf) {
      throw new Error("Intermediary mode requires taxpayer TIN (onbehalfof)");
    }
    headers.onbehalfof = onBehalfOf;
  }

  const res = await fetch(IDENTITY_URL[env], {
    method: "POST",
    headers,
    body,
  });

  const json = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !json.access_token) {
    throw new Error(
      json.error_description || json.error || `Token request failed (${res.status})`
    );
  }

  return json.access_token;
}

function buildMinimalInvoiceJson(payload: LhdnInvoicePayload) {
  // Minimal UBL-inspired JSON document for MyInvois.
  // Production orgs should replace with fully signed UBL once certificates are configured.
  return {
    _D: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    _A: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    _B: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    Invoice: [
      {
        ID: [{ _: payload.invoiceNumber }],
        IssueDate: [{ _: payload.issueDate }],
        InvoiceTypeCode: [{ _: "01" }],
        DocumentCurrencyCode: [{ _: "MYR" }],
        AccountingSupplierParty: [
          {
            Party: [
              {
                PartyLegalEntity: [
                  {
                    RegistrationName: [{ _: payload.supplierName }],
                    CompanyID: [{ _: payload.supplierTin }],
                  },
                ],
              },
            ],
          },
        ],
        AccountingCustomerParty: [
          {
            Party: [
              {
                PartyLegalEntity: [
                  {
                    RegistrationName: [{ _: payload.buyerName }],
                    ...(payload.buyerTin
                      ? { CompanyID: [{ _: payload.buyerTin }] }
                      : {}),
                  },
                ],
              },
            ],
          },
        ],
        LegalMonetaryTotal: [
          {
            TaxExclusiveAmount: [{ _: payload.total - payload.taxAmount }],
            TaxInclusiveAmount: [{ _: payload.total }],
            PayableAmount: [{ _: payload.total }],
          },
        ],
        InvoiceLine: payload.lines.map((line, index) => ({
          ID: [{ _: String(index + 1) }],
          InvoicedQuantity: [{ _: line.quantity }],
          LineExtensionAmount: [{ _: line.lineTotal }],
          Item: [{ Description: [{ _: line.description }] }],
          Price: [{ PriceAmount: [{ _: line.unitPrice }] }],
        })),
      },
    ],
  };
}

export class MyInvoisLiveProvider implements LhdnProvider {
  constructor(private env: "sandbox" | "production" = "sandbox") {}

  async submitInvoice(payload: LhdnInvoicePayload): Promise<LhdnSubmitResult> {
    try {
      if (!payload.supplierTin) {
        return {
          success: false,
          status: "rejected",
          response: { message: "Supplier TIN is required" },
          error: "Supplier TIN is required",
        };
      }

      const onBehalfOf =
        lhdnMode() === "intermediary"
          ? buildOnBehalfOf(payload.supplierTin, payload.supplierBrn)
          : undefined;

      const token = await getAccessToken(this.env, onBehalfOf);
      const documentObj = buildMinimalInvoiceJson(payload);
      const documentRaw = JSON.stringify(documentObj);
      const documentBase64 = Buffer.from(documentRaw, "utf8").toString("base64");
      const documentHash = createHash("sha256").update(documentRaw).digest("hex");

      const res = await fetch(
        `${API_BASE[this.env]}/api/v1.0/documentsubmissions/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documents: [
              {
                format: "JSON",
                document: documentBase64,
                documentHash,
                codeNumber: payload.invoiceNumber,
              },
            ],
          }),
        }
      );

      const response = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      if (!res.ok) {
        return {
          success: false,
          status: "rejected",
          response: {
            environment: this.env,
            mode: lhdnMode(),
            onBehalfOf: onBehalfOf || null,
            httpStatus: res.status,
            ...response,
          },
          error:
            (response.message as string) ||
            (response.error as string) ||
            `MyInvois submit failed (${res.status})`,
        };
      }

      const accepted = response.acceptedDocuments as
        | Array<{ uuid?: string }>
        | undefined;
      const uuid = accepted?.[0]?.uuid;

      return {
        success: true,
        uuid,
        status: uuid ? "accepted" : "pending",
        response: {
          environment: this.env,
          mode: lhdnMode(),
          onBehalfOf: onBehalfOf || null,
          ...response,
        },
      };
    } catch (error) {
      return {
        success: false,
        status: "rejected",
        response: {
          environment: this.env,
          mode: lhdnMode(),
          message: error instanceof Error ? error.message : "Unknown error",
        },
        error: error instanceof Error ? error.message : "LHDN submit failed",
      };
    }
  }
}
