import { getMyInvoisAccessToken, LHDN_API_BASE } from "./auth";

export type LhdnCancelResult = {
  success: boolean;
  uuid?: string;
  status?: string;
  response: Record<string, unknown>;
  error?: string;
};

/** Cancel a previously issued MyInvois document (usually within 72h of Valid). */
export async function cancelMyInvoisDocument(opts: {
  uuid: string;
  reason: string;
  supplierTin?: string | null;
  supplierBrn?: string | null;
}): Promise<LhdnCancelResult> {
  const uuid = opts.uuid.trim();
  const reason = opts.reason.trim().slice(0, 300);
  if (!uuid) {
    return { success: false, response: {}, error: "Document UUID is required" };
  }
  if (!reason) {
    return { success: false, response: {}, error: "Cancel reason is required" };
  }

  try {
    const { token, env } = await getMyInvoisAccessToken({
      supplierTin: opts.supplierTin,
      supplierBrn: opts.supplierBrn,
    });

    const res = await fetch(
      `${LHDN_API_BASE[env]}/api/v1.0/documents/state/${encodeURIComponent(uuid)}/state`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          status: "cancelled",
          reason,
        }),
      }
    );

    const response = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const errObj = response.error as { message?: string; details?: unknown } | undefined;
      return {
        success: false,
        uuid,
        response: { httpStatus: res.status, ...response },
        error:
          (typeof response.message === "string" && response.message) ||
          errObj?.message ||
          (errObj?.details ? JSON.stringify(errObj.details) : null) ||
          `Cancel failed (${res.status})`,
      };
    }

    return {
      success: true,
      uuid: String(response.uuid || uuid),
      status: String(response.status || "Cancelled"),
      response,
    };
  } catch (error) {
    return {
      success: false,
      uuid,
      response: {
        message: error instanceof Error ? error.message : "Unknown error",
      },
      error: error instanceof Error ? error.message : "Cancel failed",
    };
  }
}
