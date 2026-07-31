import type { LhdnInvoicePayload, LhdnProvider, LhdnSubmitResult } from "./types";
import { buildMyInvoisInvoiceDocument } from "./document";
import { buildOnBehalfOf, normalizeTin } from "./tin";
import { createHash } from "crypto";

const IDENTITY_URL = {
  sandbox: "https://preprod-api.myinvois.hasil.gov.my/connect/token",
  production: "https://api.myinvois.hasil.gov.my/connect/token",
};

const API_BASE = {
  sandbox: "https://preprod-api.myinvois.hasil.gov.my",
  production: "https://api.myinvois.hasil.gov.my",
};

function stringifyErr(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value;
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "MyInvois error";
  }
}

function extractMyInvoisError(
  response: Record<string, unknown>,
  httpStatus?: number
): string {
  const rejected = response.rejectedDocuments as
    | Array<{ error?: unknown; message?: unknown; details?: unknown }>
    | undefined;
  if (rejected?.[0]) {
    const first = rejected[0];
    return (
      stringifyErr(first.message) ||
      stringifyErr(first.error) ||
      stringifyErr(first.details) ||
      "Document rejected by MyInvois"
    );
  }
  return (
    stringifyErr(response.message) ||
    stringifyErr(response.error) ||
    stringifyErr(response.title) ||
    (httpStatus ? `MyInvois submit failed (${httpStatus})` : "MyInvois submit failed")
  );
}

function enrichTinMismatchHint(
  error: string,
  authTin: string | null,
  docTin: string
): string {
  if (!/authenticated TIN and documents TIN is not matching/i.test(error)) {
    return error;
  }
  return (
    `${error}\n\n` +
    `API token TIN: ${authTin || "(unknown from token)"}\n` +
    `Document supplier TIN: ${docTin}\n\n` +
    "• Client ID/Secret must be from the SAME MyInvois taxpayer that owns that TIN.\n" +
    "• For IG (individual) TIN: fill NRIC in LHDN settings (MyInvois ID Number), not leave BRN empty.\n" +
    "• Preprod ERP must be registered under that same preprod taxpayer profile."
  );
}

function lhdnMode(): "intermediary" | "taxpayer" {
  const mode = (process.env.LHDN_MODE || "intermediary").toLowerCase();
  return mode === "taxpayer" ? "taxpayer" : "intermediary";
}

function peekTokenClaims(token: string): Record<string, unknown> {
  try {
    const part = token.split(".")[1];
    if (!part) return {};
    const json = Buffer.from(
      part.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function authenticatedTinFromToken(token: string): string | null {
  const claims = peekTokenClaims(token);
  const candidates = [
    claims.tin,
    claims.TIN,
    claims.taxpayerTIN,
    claims.TaxpayerTIN,
    claims.TaxPayerTIN,
    claims.preferred_username,
    claims.name,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && /[A-Z]{1,2}\d+/i.test(c)) {
      return c.replace(/\s+/g, "").toUpperCase();
    }
  }
  const nested = claims.taxpayer || claims.Taxpayer;
  if (nested && typeof nested === "object") {
    const t =
      (nested as Record<string, unknown>).tin ||
      (nested as Record<string, unknown>).TIN;
    if (typeof t === "string") return t.replace(/\s+/g, "").toUpperCase();
  }
  return null;
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
      const authTin = authenticatedTinFromToken(token);
      const documentObj = buildMyInvoisInvoiceDocument(payload);
      const documentRaw = JSON.stringify(documentObj);
      const documentBase64 = Buffer.from(documentRaw, "utf8").toString("base64");
      const documentHash = createHash("sha256").update(documentRaw).digest("hex");
      const docTin = normalizeTin(payload.supplierTin);

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
            authenticatedTin: authTin,
            documentTin: docTin,
            httpStatus: res.status,
            ...response,
          },
          error: enrichTinMismatchHint(
            extractMyInvoisError(response, res.status),
            authTin,
            docTin
          ),
        };
      }

      const accepted = response.acceptedDocuments as
        | Array<{ uuid?: string }>
        | undefined;
      const rejected = response.rejectedDocuments as unknown[] | undefined;
      const uuid = accepted?.[0]?.uuid;

      if (rejected && rejected.length > 0 && !uuid) {
        return {
          success: false,
          status: "rejected",
          response: {
            environment: this.env,
            mode: lhdnMode(),
            onBehalfOf: onBehalfOf || null,
            authenticatedTin: authTin,
            documentTin: docTin,
            ...response,
          },
          error: enrichTinMismatchHint(
            extractMyInvoisError(response, res.status),
            authTin,
            docTin
          ),
        };
      }

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
