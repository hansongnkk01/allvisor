import type { LhdnStatus } from "@/lib/types";
import { getMyInvoisAccessToken, LHDN_API_BASE } from "./auth";

export type LhdnDocumentDetailsResult = {
  success: boolean;
  uuid: string;
  /** Raw MyInvois status: Submitted | Valid | Invalid | Cancelled */
  myinvoisStatus: string;
  /** Mapped to our DB enum */
  status: LhdnStatus;
  longId?: string | null;
  submissionUid?: string | null;
  validationSummary?: string | null;
  response: Record<string, unknown>;
  error?: string;
};

/** Map MyInvois document status → Allvisor lhdn_status enum. */
export function mapMyInvoisStatus(raw: string): LhdnStatus {
  const s = (raw || "").trim().toLowerCase();
  if (s === "valid") return "accepted";
  if (s === "invalid") return "rejected";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "submitted") return "pending";
  return "pending";
}

export function displayLhdnStatus(status: string, myinvoisStatus?: string | null) {
  const raw = (myinvoisStatus || "").trim();
  if (raw) return raw; // Valid / Invalid / Submitted / Cancelled
  if (status === "accepted") return "Valid";
  if (status === "rejected") return "Invalid";
  if (status === "pending") return "Submitted";
  if (status === "cancelled") return "Cancelled";
  if (status === "not_submitted") return "Not submitted";
  return status;
}

function extractValidationSummary(details: Record<string, unknown>): string | null {
  const validationResults = details.validationResults as
    | { status?: string; validationSteps?: Array<Record<string, unknown>> }
    | undefined;
  if (!validationResults) return null;

  const steps = validationResults.validationSteps || [];
  const errors: string[] = [];
  for (const step of steps) {
    const stepStatus = String(step.status || "");
    if (/invalid|reject|error/i.test(stepStatus) || step.error) {
      const name = String(step.name || step.type || "Validation");
      const err = step.error as Record<string, unknown> | string | undefined;
      const msg =
        typeof err === "string"
          ? err
          : err && typeof err === "object"
            ? String(
                (err as { error?: string; message?: string }).error ||
                  (err as { message?: string }).message ||
                  JSON.stringify(err).slice(0, 200)
              )
            : stepStatus;
      errors.push(`${name}: ${msg}`);
    }
    const inner = step.validationSteps as Array<Record<string, unknown>> | undefined;
    if (inner?.length) {
      for (const sub of inner) {
        if (/invalid|reject|error/i.test(String(sub.status || ""))) {
          errors.push(String(sub.name || sub.error || JSON.stringify(sub)).slice(0, 180));
        }
      }
    }
  }

  if (errors.length) return errors.slice(0, 5).join(" | ");
  if (validationResults.status) return String(validationResults.status);
  return null;
}

export async function fetchMyInvoisDocumentDetails(opts: {
  uuid: string;
  supplierTin?: string | null;
  supplierBrn?: string | null;
}): Promise<LhdnDocumentDetailsResult> {
  const uuid = opts.uuid.trim();
  if (!uuid) {
    return {
      success: false,
      uuid: "",
      myinvoisStatus: "",
      status: "pending",
      response: {},
      error: "Document UUID is required",
    };
  }

  try {
    const { token, env } = await getMyInvoisAccessToken({
      supplierTin: opts.supplierTin,
      supplierBrn: opts.supplierBrn,
    });

    const res = await fetch(
      `${LHDN_API_BASE[env]}/api/v1.0/documents/${encodeURIComponent(uuid)}/details`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const response = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        success: false,
        uuid,
        myinvoisStatus: "",
        status: "pending",
        response: { httpStatus: res.status, ...response },
        error:
          (response.message as string) ||
          (response.error as string) ||
          `Get document details failed (${res.status})`,
      };
    }

    const myinvoisStatus = String(response.status || "Submitted");
    return {
      success: true,
      uuid: String(response.uuid || uuid),
      myinvoisStatus,
      status: mapMyInvoisStatus(myinvoisStatus),
      longId: (response.longId as string) || null,
      submissionUid: (response.submissionUid as string) || null,
      validationSummary: extractValidationSummary(response),
      response,
    };
  } catch (error) {
    return {
      success: false,
      uuid,
      myinvoisStatus: "",
      status: "pending",
      response: {
        message: error instanceof Error ? error.message : "Unknown error",
      },
      error: error instanceof Error ? error.message : "Get document details failed",
    };
  }
}

/** Poll until Valid/Invalid/Cancelled or attempts exhausted. */
export async function pollMyInvoisDocumentStatus(opts: {
  uuid: string;
  supplierTin?: string | null;
  supplierBrn?: string | null;
  attempts?: number;
  delayMs?: number;
}): Promise<LhdnDocumentDetailsResult> {
  const attempts = opts.attempts ?? 5;
  const delayMs = opts.delayMs ?? 2500;
  let last = await fetchMyInvoisDocumentDetails(opts);

  for (let i = 1; i < attempts; i++) {
    if (!last.success) return last;
    const done = ["valid", "invalid", "cancelled", "canceled"].includes(
      last.myinvoisStatus.toLowerCase()
    );
    if (done) return last;
    await new Promise((r) => setTimeout(r, delayMs));
    last = await fetchMyInvoisDocumentDetails(opts);
  }

  return last;
}
