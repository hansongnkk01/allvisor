import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/org";
import type { Organization } from "@/lib/types";

export type StudentContext = {
  organization: Organization;
  customerId: string;
  customerName: string;
  email: string;
  userId: string;
};

export const getStudentContext = cache(async (): Promise<StudentContext | null> => {
  const { supabase, user } = await getSessionUser();
  if (!user) return null;

  const { data: link } = await supabase
    .from("tuition_students")
    .select("id, organization_id, customer_id, email, active")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!link?.organization_id) return null;

  const [{ data: org }, { data: customer }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, niche, locale_default, logo_url, logo_shape")
      .eq("id", link.organization_id)
      .maybeSingle(),
    supabase
      .from("customers")
      .select("id, name")
      .eq("id", link.customer_id)
      .maybeSingle(),
  ]);

  // Student is not org member — org/customer selects may fail RLS. Use service role fallback.
  if (!org || !customer) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !url) return null;
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const admin = createAdminClient(url, serviceKey);
    const [{ data: org2 }, { data: customer2 }] = await Promise.all([
      admin
        .from("organizations")
        .select("id, name, niche, locale_default, logo_url, logo_shape")
        .eq("id", link.organization_id)
        .maybeSingle(),
      admin
        .from("customers")
        .select("id, name")
        .eq("id", link.customer_id)
        .maybeSingle(),
    ]);
    if (!org2 || !customer2) return null;
    return {
      organization: org2 as Organization,
      customerId: customer2.id,
      customerName: customer2.name,
      email: link.email,
      userId: user.id,
    };
  }

  return {
    organization: org as Organization,
    customerId: customer.id,
    customerName: customer.name,
    email: link.email,
    userId: user.id,
  };
});

export async function requireStudent(locale: string): Promise<StudentContext> {
  const ctx = await getStudentContext();
  if (!ctx) {
    redirect({ href: "/login?portal=student", locale });
  }
  return ctx!;
}

export async function getStudentAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) return null;
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  return createAdminClient(url, serviceKey);
}
