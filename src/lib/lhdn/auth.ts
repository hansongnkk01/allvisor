import { buildOnBehalfOf } from "./tin";

export const LHDN_IDENTITY_URL = {
  sandbox: "https://preprod-api.myinvois.hasil.gov.my/connect/token",
  production: "https://api.myinvois.hasil.gov.my/connect/token",
} as const;

export const LHDN_API_BASE = {
  sandbox: "https://preprod-api.myinvois.hasil.gov.my",
  production: "https://api.myinvois.hasil.gov.my",
} as const;

export function getLhdnApiEnv(): "sandbox" | "production" {
  return (process.env.LHDN_ENV || "sandbox").toLowerCase() === "production"
    ? "production"
    : "sandbox";
}

export function getLhdnAuthMode(): "intermediary" | "taxpayer" {
  const mode = (process.env.LHDN_MODE || "intermediary").toLowerCase();
  return mode === "taxpayer" ? "taxpayer" : "intermediary";
}

export async function getMyInvoisAccessToken(opts?: {
  supplierTin?: string | null;
  supplierBrn?: string | null;
}) {
  const env = getLhdnApiEnv();
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

  if (getLhdnAuthMode() === "intermediary") {
    if (!opts?.supplierTin) {
      throw new Error("Intermediary mode requires taxpayer TIN (onbehalfof)");
    }
    headers.onbehalfof = buildOnBehalfOf(opts.supplierTin, opts.supplierBrn);
  }

  const res = await fetch(LHDN_IDENTITY_URL[env], {
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

  return { token: json.access_token, env };
}
