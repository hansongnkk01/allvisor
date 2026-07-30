/** Asia/Kuala_Lumpur day bounds for “today” queries (fixes UTC server skew). */

export function formatDayKeyMY(date: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function dayBoundsMY(date: Date = new Date()) {
  const day = formatDayKeyMY(date);
  const start = new Date(`${day}T00:00:00+08:00`);
  const end = new Date(`${day}T23:59:59.999+08:00`);
  return { start, end, day };
}

export type AccountingPeriod =
  | "today"
  | "this_week"
  | "this_month"
  | "prev_3_months"
  | "prev_6_months"
  | "this_year";

export function accountingPeriodRange(period: AccountingPeriod, now = new Date()) {
  const { start: todayStart, end: todayEnd } = dayBoundsMY(now);
  const myParts = formatDayKeyMY(now).split("-").map(Number);
  const y = myParts[0];
  const m = myParts[1];

  if (period === "today") return { start: todayStart, end: todayEnd };

  if (period === "this_week") {
    // Monday-start week in MYT
    const dow = new Date(todayStart).getUTCDay(); // careful - use local MY offset date
    const local = new Date(todayStart);
    const jsDay = new Date(
      local.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" })
    ).getDay();
    const diffToMon = (jsDay + 6) % 7;
    const weekStart = new Date(todayStart);
    weekStart.setTime(todayStart.getTime() - diffToMon * 86400000);
    return { start: weekStart, end: todayEnd };
  }

  if (period === "this_month") {
    const start = new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00+08:00`);
    return { start, end: todayEnd };
  }

  if (period === "prev_3_months") {
    let pm = m - 3;
    let py = y;
    if (pm <= 0) {
      pm += 12;
      py -= 1;
    }
    const start = new Date(`${py}-${String(pm).padStart(2, "0")}-01T00:00:00+08:00`);
    return { start, end: todayEnd };
  }

  if (period === "prev_6_months") {
    let pm = m - 6;
    let py = y;
    if (pm <= 0) {
      pm += 12;
      py -= 1;
    }
    const start = new Date(`${py}-${String(pm).padStart(2, "0")}-01T00:00:00+08:00`);
    return { start, end: todayEnd };
  }

  // this_year
  const start = new Date(`${y}-01-01T00:00:00+08:00`);
  return { start, end: todayEnd };
}
