"use client";

import { createContext, useContext, useMemo } from "react";
import type { Niche, Organization, OrgContext } from "@/lib/types";

type OrgClientContextValue = {
  niche: Niche;
  orgName: string;
  organizationId: string;
  role: OrgContext["membership"]["role"];
};

const OrgClientContext = createContext<OrgClientContextValue | null>(null);

export function OrgProvider({
  organization,
  role,
  children,
}: {
  organization: Pick<Organization, "id" | "name" | "niche">;
  role: OrgContext["membership"]["role"];
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({
      niche: organization.niche,
      orgName: organization.name,
      organizationId: organization.id,
      role,
    }),
    [organization.id, organization.name, organization.niche, role]
  );

  return (
    <OrgClientContext.Provider value={value}>{children}</OrgClientContext.Provider>
  );
}

export function useOrgClient() {
  const ctx = useContext(OrgClientContext);
  if (!ctx) throw new Error("useOrgClient must be used within OrgProvider");
  return ctx;
}
