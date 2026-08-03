"use server";

import { revalidateApp } from "@/lib/revalidate";
import { logActivity } from "@/lib/activity";
import { requireMemberWithCapability } from "@/lib/require-capability";
import { getStudentContext, getStudentAdminClient } from "@/lib/tuition-student";
import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

async function getServiceAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) return null;
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  return createAdminClient(url, serviceKey);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildScheduleLabel(weekday: number | null, start: string | null, end: string | null) {
  if (weekday === null || weekday === undefined || Number.isNaN(weekday)) return null;
  const day = WEEKDAYS[weekday] || `D${weekday}`;
  if (start && end) return `${day} ${start.slice(0, 5)}–${end.slice(0, 5)}`;
  if (start) return `${day} ${start.slice(0, 5)}`;
  return day;
}

export async function upsertTuitionClassAction(formData: FormData) {
  const { supabase, organization, profile } = await requireMemberWithCapability("class_schedule");
  const id = String(formData.get("id") || "");
  const weekdayRaw = String(formData.get("weekday") || "");
  const weekday = weekdayRaw === "" ? null : Number(weekdayRaw);
  const startTime = String(formData.get("start_time") || "") || null;
  const endTime = String(formData.get("end_time") || "") || null;
  const payload = {
    organization_id: organization.id,
    name: String(formData.get("name") || "").trim(),
    teacher_name: String(formData.get("teacher_name") || "").trim() || null,
    weekday: weekday === null || Number.isNaN(weekday) ? null : weekday,
    start_time: startTime,
    end_time: endTime,
    room: String(formData.get("room") || "").trim() || null,
    fee: Number(formData.get("fee") || 0),
    schedule: buildScheduleLabel(
      weekday === null || Number.isNaN(weekday) ? null : weekday,
      startTime,
      endTime
    ),
  };
  if (!payload.name) return { error: "Class name required" };

  const { data, error } = id
    ? await supabase.from("tuition_classes").update(payload).eq("id", id).select("id").single()
    : await supabase.from("tuition_classes").insert(payload).select("id").single();

  if (error) return { error: error.message };
  await logActivity({
    action: id ? "tuition.class.update" : "tuition.class.create",
    summary: `${id ? "Updated" : "Created"} class ${payload.name}`,
    entityType: "tuition_classes",
    entityId: data.id,
    meta: { by: profile.id },
  });
  revalidateApp("/classes", "/student");
  return { success: true };
}

export async function enrollStudentAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("class_schedule");
  const classId = String(formData.get("class_id") || "");
  const customerId = String(formData.get("customer_id") || "");
  if (!classId || !customerId) return { error: "Class and student required" };

  const { error } = await supabase.from("tuition_enrollments").insert({
    organization_id: organization.id,
    class_id: classId,
    customer_id: customerId,
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { error: "Student already enrolled" };
    return { error: error.message };
  }
  revalidateApp("/classes", "/attendance", "/assessments", "/student");
  return { success: true };
}

export async function createTuitionAssessmentAction(formData: FormData) {
  const { supabase, organization, profile } = await requireMemberWithCapability("assessments");
  const classId = String(formData.get("class_id") || "") || null;
  const title = String(formData.get("title") || "").trim();
  const instructions = String(formData.get("instructions") || "").trim() || null;
  const dueAt = String(formData.get("due_at") || "") || null;
  const maxScore = Number(formData.get("max_score") || 100);
  if (!title) return { error: "Title required" };

  const { data: assessment, error } = await supabase
    .from("tuition_assessments")
    .insert({
      organization_id: organization.id,
      class_id: classId,
      title,
      instructions,
      due_at: dueAt,
      max_score: maxScore,
    })
    .select("id")
    .single();
  if (error || !assessment) return { error: error?.message || "Failed to create assessment" };

  // Assign to enrolled students (or all customers if no class)
  let studentIds: string[] = [];
  if (classId) {
    const { data: enrolled } = await supabase
      .from("tuition_enrollments")
      .select("customer_id")
      .eq("organization_id", organization.id)
      .eq("class_id", classId);
    studentIds = (enrolled || []).map((e) => e.customer_id);
  } else {
    const { data: customers } = await supabase
      .from("customers")
      .select("id")
      .eq("organization_id", organization.id)
      .limit(500);
    studentIds = (customers || []).map((c) => c.id);
  }

  if (studentIds.length) {
    await supabase.from("tuition_submissions").insert(
      studentIds.map((customer_id) => ({
        organization_id: organization.id,
        assessment_id: assessment.id,
        customer_id,
        status: "assigned",
      }))
    );
  }

  await logActivity({
    action: "tuition.assessment.create",
    summary: `Created assessment ${title}`,
    entityType: "tuition_assessments",
    entityId: assessment.id,
    meta: { by: profile.id, assigned: studentIds.length },
  });
  revalidateApp("/assessments", "/student");
  return { success: true };
}

export async function gradeSubmissionAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("assessments");
  const id = String(formData.get("id") || "");
  const score = Number(formData.get("score") || 0);
  const feedback = String(formData.get("feedback") || "").trim() || null;
  if (!id) return { error: "Submission required" };

  const { error } = await supabase
    .from("tuition_submissions")
    .update({ score, feedback, status: "graded" })
    .eq("id", id)
    .eq("organization_id", organization.id);
  if (error) return { error: error.message };
  revalidateApp("/assessments", "/student");
  return { success: true };
}

/** Shared helper: link CRM customer → Auth student portal. */
export async function provisionStudentPortal(opts: {
  organizationId: string;
  customerId: string;
  email: string;
  password: string;
  fullName?: string;
  byProfileId?: string;
}) {
  const email = opts.email.trim().toLowerCase();
  const password = opts.password;
  if (!email) return { error: "Student email required" };
  if (!password || password.length < 6) return { error: "Password min 6 characters" };

  const admin = await getServiceAdmin();
  if (!admin) {
    return { error: "Creating student accounts requires SUPABASE_SERVICE_ROLE_KEY on the server." };
  }

  const { data: customer } = await admin
    .from("customers")
    .select("id, name, email")
    .eq("id", opts.customerId)
    .eq("organization_id", opts.organizationId)
    .maybeSingle();
  if (!customer) return { error: "Student not found" };

  const { data: existingLink } = await admin
    .from("tuition_students")
    .select("id")
    .eq("organization_id", opts.organizationId)
    .eq("customer_id", opts.customerId)
    .maybeSingle();
  if (existingLink) return { error: "This student already has a portal account" };

  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let userId =
    listed?.users?.find((u) => (u.email || "").toLowerCase() === email)?.id || null;

  if (!userId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: opts.fullName || customer.name,
        account_type: "allvisor-student",
        organization_id: opts.organizationId,
      },
    });
    if (createError || !created.user) {
      return { error: createError?.message || "Failed to create student login" };
    }
    userId = created.user.id;
  } else {
    await admin.auth.admin.updateUserById(userId, { password });
  }

  const { data: staffMem } = await admin
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (staffMem) {
    return { error: "This email is already a staff Allvisor account. Use a different student email." };
  }

  await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name: opts.fullName || customer.name,
  });

  const { error: linkError } = await admin.from("tuition_students").insert({
    organization_id: opts.organizationId,
    customer_id: opts.customerId,
    user_id: userId,
    email,
    active: true,
  });
  if (linkError) return { error: linkError.message };

  if (!customer.email) {
    await admin.from("customers").update({ email }).eq("id", opts.customerId);
  }

  await logActivity({
    action: "tuition.student_account.create",
    summary: `Created student portal for ${customer.name}`,
    entityType: "tuition_students",
    entityId: opts.customerId,
    meta: { by: opts.byProfileId, email },
  });
  return { success: true as const, email };
}

export async function createStudentAccountAction(formData: FormData) {
  const { organization, profile } = await requireMemberWithCapability("student_accounts");
  const customerId = String(formData.get("customer_id") || "");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("full_name") || "").trim();

  if (!customerId) return { error: "Select a student first" };

  const result = await provisionStudentPortal({
    organizationId: organization.id,
    customerId,
    email,
    password,
    fullName,
    byProfileId: profile.id,
  });
  if (result.error) return { error: result.error };
  revalidateApp("/customers", "/student-accounts", "/classes");
  return { success: true, email: result.email };
}

export async function resolvePostLoginPathAction(): Promise<string> {
  const student = await getStudentContext();
  if (student) return "/student";
  const org = await getOrgContext();
  if (org) return "/dashboard";
  return "/onboarding";
}

export async function submitAssessmentAction(formData: FormData) {
  const student = await getStudentContext();
  if (!student) return { error: "Not signed in as student" };
  const admin = await getStudentAdminClient();
  if (!admin) return { error: "Server misconfigured" };

  const submissionId = String(formData.get("submission_id") || "");
  const answer = String(formData.get("answer_text") || "").trim();
  if (!submissionId) return { error: "Submission required" };
  if (!answer) return { error: "Write your answer before submitting" };

  const { data: row } = await admin
    .from("tuition_submissions")
    .select("id, status, customer_id, organization_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (!row || row.customer_id !== student.customerId || row.organization_id !== student.organization.id) {
    return { error: "Not allowed" };
  }
  if (row.status === "graded") return { error: "Already graded — cannot resubmit" };

  const { error } = await admin
    .from("tuition_submissions")
    .update({
      answer_text: answer,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (error) return { error: error.message };
  revalidateApp("/student", "/student/assessments", "/assessments");
  return { success: true };
}

/** Mark attendance with dropdowns (staff). */
export async function markAttendanceAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("attendance");
  const classId = String(formData.get("class_id") || "");
  const customerId = String(formData.get("customer_id") || "");
  const attendedOn = String(formData.get("attended_on") || new Date().toISOString().slice(0, 10));
  const present = formData.get("present") !== "false" && formData.get("present") !== "off";
  if (!classId || !customerId) return { error: "Class and student required" };

  const { error } = await supabase.from("tuition_attendance").insert({
    organization_id: organization.id,
    class_id: classId,
    customer_id: customerId,
    attended_on: attendedOn,
    present,
  });
  if (error) return { error: error.message };
  revalidateApp("/attendance");
  return { success: true };
}

export async function isStudentOnlyUserAction(): Promise<boolean> {
  const student = await getStudentContext();
  if (!student) return false;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: mem } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  return !mem;
}
