"use client";

import { ActionForm } from "@/components/ActionForm";
import { FilterableRows } from "@/components/FilterableRows";
import { ExpandSection } from "@/components/BranchGroup";
import {
  addBranchStaffAction,
  addStaffAction,
  kickBranchStaffAction,
  kickStaffAction,
} from "@/app/actions";
import { staffRoleLabel } from "@/lib/roles";
import type { MembershipRole } from "@/lib/types";

type Member = {
  id: string;
  user_id: string;
  role: MembershipRole | string;
  job_title?: string | null;
  profiles?: { full_name?: string | null; email?: string | null } | null;
};

export function TeamMembersSection({
  branchId,
  isOwnBranch,
  currentUserId,
  assignableRoles,
  kickableRoles,
  members,
  labels,
  defaultOpen,
}: {
  branchId: string;
  isOwnBranch: boolean;
  currentUserId: string;
  assignableRoles: MembershipRole[];
  kickableRoles: MembershipRole[];
  members: Member[];
  defaultOpen?: boolean;
  labels: {
    title: string;
    hint: string;
    username: string;
    name: string;
    role: string;
    jobTitle: string;
    jobTitlePlaceholder?: string;
    add: string;
    search: string;
    email: string;
    kickCol: string;
    kick: string;
  };
}) {
  const addAction = isOwnBranch ? addStaffAction : addBranchStaffAction;
  const kickAction = isOwnBranch ? kickStaffAction : kickBranchStaffAction;
  const kickSet = new Set(kickableRoles.map(String));

  return (
    <ExpandSection title={labels.title} defaultOpen={defaultOpen}>
      {assignableRoles.length ? (
        <div
          className="surface"
          style={{
            padding: "1rem",
            marginBottom: "0.85rem",
            boxShadow: "none",
            background: "rgba(255,255,255,0.85)",
          }}
        >
          <p className="muted" style={{ marginTop: 0 }}>
            {labels.hint}
          </p>
          <ActionForm action={addAction} className="stack">
            {!isOwnBranch ? (
              <input type="hidden" name="target_org_id" value={branchId} />
            ) : null}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "0.65rem",
              }}
            >
              <div className="field">
                <label>{labels.username}</label>
                <input
                  name="username"
                  type="email"
                  required
                  className="input"
                  placeholder="member@email.com"
                  autoComplete="off"
                />
              </div>
              <div className="field">
                <label>{labels.name}</label>
                <input name="full_name" className="input" placeholder="Optional" />
              </div>
              <div className="field">
                <label>{labels.role}</label>
                <select name="role" className="select" defaultValue={assignableRoles[0]}>
                  {assignableRoles.map((role) => (
                    <option key={role} value={role}>
                      {staffRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>{labels.jobTitle}</label>
                <input
                  name="job_title"
                  className="input"
                  placeholder={labels.jobTitlePlaceholder || "SV / Nurse / …"}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              {labels.add}
            </button>
          </ActionForm>
        </div>
      ) : (
        <p className="muted">{labels.hint}</p>
      )}

      <FilterableRows
        placeholder={labels.search}
        headers={
          <tr>
            <th>{labels.name}</th>
            <th>{labels.email}</th>
            <th>{labels.role}</th>
            <th>{labels.jobTitle}</th>
            <th>{labels.kickCol}</th>
          </tr>
        }
      >
        {members.map((m) => {
          const name = m.profiles?.full_name || "";
          const email = m.profiles?.email || "";
          const showKick =
            kickSet.has(String(m.role)) && m.user_id !== currentUserId;
          return (
            <tr
              key={m.id}
              data-search={`${name} ${email} ${m.role} ${m.job_title || ""}`.toLowerCase()}
            >
              <td>{name || "—"}</td>
              <td>{email || "—"}</td>
              <td>
                <span className="badge">{staffRoleLabel(m.role)}</span>
              </td>
              <td>{m.job_title || "—"}</td>
              <td>
                {showKick ? (
                  <ActionForm action={kickAction}>
                    <input type="hidden" name="membership_id" value={m.id} />
                    {!isOwnBranch ? (
                      <input type="hidden" name="target_org_id" value={branchId} />
                    ) : null}
                    <button
                      type="submit"
                      className="btn btn-ghost"
                      style={{ color: "var(--danger)" }}
                    >
                      {labels.kick}
                    </button>
                  </ActionForm>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          );
        })}
      </FilterableRows>
    </ExpandSection>
  );
}
