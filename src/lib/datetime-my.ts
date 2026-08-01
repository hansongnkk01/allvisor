/** Asia/Kuala_Lumpur day bounds for “today” queries (fixes UTC server skew). */

export function formatDayKeyMY(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (y && m && d) return `${y}-${m}-${d}`;
  // Fallback
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
  const { start: todayStart, end: todayEnd, day: todayDay } = dayBoundsMY(now);
  const [ys, ms] = todayDay.split("-");
  const y = Number(ys);
  const m = Number(ms);

  const monthStartDay = (yy: number, mm: number) =>
    `${yy}-${String(mm).padStart(2, "0")}-01`;

  if (period === "today") {
    return {
      start: todayStart,
      end: todayEnd,
      startDay: todayDay,
      endDay: todayDay,
    };
  }

  if (period === "this_week") {
    const jsDay = new Date(
      todayStart.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" })
    ).getDay();
    const diffToMon = (jsDay + 6) % 7;
    const weekStart = new Date(todayStart.getTime() - diffToMon * 86400000);
    const startDay = formatDayKeyMY(weekStart);
    return {
      start: weekStart,
      end: todayEnd,
      startDay,
      endDay: todayDay,
    };
  }

  if (period === "this_month") {
    const startDay = monthStartDay(y, m);
    return {
      start: new Date(`${startDay}T00:00:00+08:00`),
      end: todayEnd,
      startDay,
      endDay: todayDay,
    };
  }

  if (period === "prev_3_months") {
    let pm = m - 3;
    let py = y;
    if (pm <= 0) {
      pm += 12;
      py -= 1;
    }
    const startDay = monthStartDay(py, pm);
    return {
      start: new Date(`${startDay}T00:00:00+08:00`),
      end: todayEnd,
      startDay,
      endDay: todayDay,
    };
  }

  if (period === "prev_6_months") {
    let pm = m - 6;
    let py = y;
    if (pm <= 0) {
      pm += 12;
      py -= 1;
    }
    const startDay = monthStartDay(py, pm);
    return {
      start: new Date(`${startDay}T00:00:00+08:00`),
      end: todayEnd,
      startDay,
      endDay: todayDay,
    };
  }

  // this_year
  const startDay = `${y}-01-01`;
  return {
    start: new Date(`${startDay}T00:00:00+08:00`),
    end: todayEnd,
    startDay,
    endDay: todayDay,
  };
}
