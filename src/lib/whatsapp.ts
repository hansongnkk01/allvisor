/**
 * WhatsApp deep-link helpers. We do not send via API —
 * staff copy or open wa.me with a ready message (MY SME reality).
 */

export function digitsPhoneMY(phone: string | null | undefined): string {
  const raw = String(phone || "").replace(/\D/g, "");
  if (!raw) return "";
  if (raw.startsWith("60")) return raw;
  if (raw.startsWith("0")) return `60${raw.slice(1)}`;
  return raw;
}

export function whatsappHref(phone: string | null | undefined, message: string): string {
  const digits = digitsPhoneMY(phone);
  const text = encodeURIComponent(message);
  if (!digits) return `https://wa.me/?text=${text}`;
  return `https://wa.me/${digits}?text=${text}`;
}

export function readyForCollectionMsg(bizName: string, ticketNo: string): string {
  return `Hi, your order/ticket ${ticketNo} at ${bizName} is ready for collection. Terima kasih.`;
}

export function appointmentReminderMsg(
  bizName: string,
  when: string,
  patientName?: string
): string {
  const who = patientName ? ` ${patientName}` : "";
  return `Hi${who}, reminder: appointment at ${bizName} on ${when}. Reply if you need to reschedule.`;
}

export function feeReminderMsg(bizName: string, amountLabel: string): string {
  return `Hi, friendly reminder from ${bizName}: outstanding balance ${amountLabel}. Thank you.`;
}

export function membershipRenewMsg(bizName: string, endsOn: string): string {
  return `Hi, your membership at ${bizName} ends on ${endsOn}. Renew to keep access. Terima kasih.`;
}
