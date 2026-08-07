import type { AlertSeverity } from "@/lib/types";

export type { AlertSeverity };

/** Loose supabase client — Ops Brain helpers must not fail typechecks on chaining. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseClientLike = any;
