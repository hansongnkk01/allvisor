"use server";

import { revalidateApp } from "@/lib/revalidate";
import { logActivity } from "@/lib/activity";
import { requireMemberWithCapability } from "@/lib/require-capability";

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
    subject_id: String(formData.get("subject_id") || "") || null,
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
  revalidateApp("/classes");
  return { success: true };
}

export async function upsertTuitionSubjectAction(formData: FormData) {
  const { supabase, organization, profile } = await requireMemberWithCapability("class_schedule");
  const id = String(formData.get("id") || "");
  const payload = {
    organization_id: organization.id,
    name: String(formData.get("name") || "").trim(),
    price: Number(formData.get("price") || 0),
    teacher_name: String(formData.get("teacher_name") || "").trim() || null,
    teacher_salary: Number(formData.get("teacher_salary") || 0),
    notes: String(formData.get("notes") || "").trim() || null,
  };
  if (!payload.name) return { error: "Subject name required" };

  const { data, error } = id
    ? await supabase.from("tuition_subjects").update(payload).eq("id", id).select("id").single()
    : await supabase.from("tuition_subjects").insert(payload).select("id").single();

  if (error) return { error: error.message };
  await logActivity({
    action: id ? "tuition.subject.update" : "tuition.subject.create",
    summary: `${id ? "Updated" : "Created"} subject ${payload.name}`,
    entityType: "tuition_subjects",
    entityId: data.id,
    meta: { by: profile.id },
  });
  revalidateApp("/subjects", "/customers", "/classes");
  return { success: true };
}

export async function deleteTuitionSubjectAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("class_schedule");
  const id = String(formData.get("id") || "");
  if (!id) return { error: "Subject required" };
  const { error } = await supabase
    .from("tuition_subjects")
    .delete()
    .eq("id", id)
    .eq("organization_id", organization.id);
  if (error) return { error: error.message };
  revalidateApp("/subjects", "/customers", "/classes");
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
  revalidateApp("/classes", "/attendance", "/assessments");
  return { success: true };
}

export async function createTuitionAssessmentAction(formData: FormData) {
  const { supabase, organization, profile } = await requireMemberWithCapability("assessments");
  const subjectId = String(formData.get("subject_id") || "") || null;
  const classId = String(formData.get("class_id") || "") || null;
  const title = String(formData.get("title") || "").trim();
  const instructions = String(formData.get("instructions") || "").trim() || null;
  const dueAt = String(formData.get("due_at") || "") || null;
  const maxScore = Number(formData.get("max_score") || 100);
  if (!title) return { error: "Title required" };
  if (!subjectId) return { error: "Subject required" };

  const { data: assessment, error } = await supabase
    .from("tuition_assessments")
    .insert({
      organization_id: organization.id,
      subject_id: subjectId,
      class_id: classId,
      title,
      instructions,
      due_at: dueAt,
      max_score: maxScore,
    })
    .select("id")
    .single();
  if (error || !assessment) return { error: error?.message || "Failed to create assessment" };

  // Marks sheet for students enrolled in this subject
  let studentIds: string[] = [];
  const { data: enrolled } = await supabase
    .from("tuition_subject_enrollments")
    .select("customer_id")
    .eq("organization_id", organization.id)
    .eq("subject_id", subjectId);
  studentIds = (enrolled || []).map((e) => e.customer_id);

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
    summary: `Created assessment record ${title}`,
    entityType: "tuition_assessments",
    entityId: assessment.id,
    meta: { by: profile.id, assigned: studentIds.length, subject_id: subjectId },
  });
  revalidateApp("/assessments");
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
  revalidateApp("/assessments");
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
