import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { canAccessAdmin } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { createTaskAction, updateTaskStatusAction } from "@/app/ops-brain-actions";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOrg(locale);
  const t = await getTranslations("Nav");
  const tDash = await getTranslations("Dashboard");
  const isAdmin = canAccessAdmin(ctx.membership.role);

  const supabase = await createClient();
  const orgId = ctx.organization.id;

  const [tasksRes, membersRes, profilesRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, description, status, priority, assigned_to, created_at")
      .eq("organization_id", orgId)
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(100),
    isAdmin
      ? supabase.from("memberships").select("user_id").eq("organization_id", orgId).limit(100)
      : Promise.resolve({ data: [] as Array<{ user_id: string }> }),
    supabase.from("profiles").select("id, full_name, email").limit(200),
  ]);

  const nameById = new Map(
    (profilesRes.data || []).map((p) => [p.id as string, (p.full_name || p.email || "Staff") as string])
  );

  // Staff only ever see their own or unassigned work.
  const tasks = (tasksRes.data || []).filter((task) =>
    isAdmin ? true : !task.assigned_to || task.assigned_to === ctx.profile.id
  );

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <PageHeader
        title={t("tasks")}
        subtitle={isAdmin ? tDash("delegatedTasks") : tDash("myTasks")}
      />

      {isAdmin ? (
        <section className="surface" style={{ padding: "1rem" }}>
          <strong>{tDash("createTask")}</strong>
          <ActionForm action={createTaskAction} className="stack" style={{ gap: 8, marginTop: 10 }}>
            <input name="title" className="input" placeholder={tDash("taskTitle")} required />
            <textarea name="description" className="input" rows={2} placeholder="Details (optional)" />
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <select name="assigned_to" className="input" style={{ maxWidth: 240 }}>
                <option value="">Unassigned</option>
                {(membersRes.data || []).map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {nameById.get(m.user_id) || "Staff"}
                  </option>
                ))}
              </select>
              <select name="priority" className="input" style={{ maxWidth: 160 }} defaultValue="medium">
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
              <button type="submit" className="btn btn-primary">
                {tDash("createTask")}
              </button>
            </div>
          </ActionForm>
        </section>
      ) : null}

      <section className="surface" style={{ padding: "1rem" }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Task</th>
                <th>Priority</th>
                {isAdmin ? <th>Assigned</th> : null}
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <strong>{task.title}</strong>
                    {task.description ? (
                      <div className="muted" style={{ fontSize: ".85rem" }}>
                        {task.description}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <span className="badge">{task.priority}</span>
                  </td>
                  {isAdmin ? (
                    <td>{task.assigned_to ? nameById.get(task.assigned_to) || "Staff" : "—"}</td>
                  ) : null}
                  <td>{task.status}</td>
                  <td>
                    <ActionForm action={updateTaskStatusAction}>
                      <input type="hidden" name="task_id" value={task.id} />
                      <input type="hidden" name="status" value="done" />
                      <button type="submit" className="btn btn-ghost" style={{ fontSize: ".75rem" }}>
                        {tDash("markDone")}
                      </button>
                    </ActionForm>
                  </td>
                </tr>
              ))}
              {!tasks.length ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="muted">
                    {tDash("noTasks")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
