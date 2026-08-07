import { dayBoundsMY, formatDayKeyMY } from "@/lib/datetime-my";

/** Time windows offered on the owner Performance page. */
export const PERFORMANCE_RANGES = ["day", "week", "month", "year"] as const;

export type PerformanceRange = (typeof PERFORMANCE_RANGES)[number];

export type PerformanceBucket = {
  key: string;
  /** Short axis label, already trimmed for a dense chart. */
  label: string;
  start: Date;
  end: Date;
};

export type PerformanceWindow = {
  range: PerformanceRange;
  start: Date;
  end: Date;
  /** Same length, immediately before `start`, used for the comparison arrows. */
  prevStart: Date;
  prevEnd: Date;
  buckets: PerformanceBucket[];
};

export function isPerformanceRange(value: string | undefined): value is PerformanceRange {
  return !!value && (PERFORMANCE_RANGES as readonly string[]).includes(value);
}

function monthKeyMY(date: Date) {
  return formatDayKeyMY(date).slice(0, 7);
}

function monthStart(key: string) {
  return new Date(`${key}-01T00:00:00+08:00`);
}

function shiftMonthKey(key: string, months: number) {
  const [year, month] = key.split("-").map(Number);
  const zeroBased = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(zeroBased / 12);
  const nextMonth = (zeroBased % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

function dailyBuckets(now: Date, days: number): PerformanceBucket[] {
  const buckets: PerformanceBucket[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const { start, end, day } = dayBoundsMY(new Date(now.getTime() - i * 86400000));
    buckets.push({ key: day, label: day.slice(8), start, end });
  }
  return buckets;
}

/**
 * Everything is anchored to Malaysia time so a shop closing at 11pm still books
 * the sale on the right day.
 */
export function performanceWindow(range: PerformanceRange, now = new Date()): PerformanceWindow {
  let buckets: PerformanceBucket[];

  if (range === "day") {
    const { start: dayStart, day } = dayBoundsMY(now);
    buckets = Array.from({ length: 24 }, (_, hour) => {
      const start = new Date(dayStart.getTime() + hour * 3600000);
      return {
        key: `${day}T${String(hour).padStart(2, "0")}`,
        label: String(hour).padStart(2, "0"),
        start,
        end: new Date(start.getTime() + 3599999),
      };
    });
  } else if (range === "week") {
    buckets = dailyBuckets(now, 7);
  } else if (range === "month") {
    buckets = dailyBuckets(now, 30);
  } else {
    const current = monthKeyMY(now);
    buckets = Array.from({ length: 12 }, (_, index) => {
      const key = shiftMonthKey(current, index - 11);
      const start = monthStart(key);
      const end = new Date(monthStart(shiftMonthKey(key, 1)).getTime() - 1);
      return { key, label: key.slice(5), start, end };
    });
  }

  const start = buckets[0].start;
  const end = buckets[buckets.length - 1].end;
  const span = end.getTime() - start.getTime();

  return {
    range,
    start,
    end,
    prevEnd: new Date(start.getTime() - 1),
    prevStart: new Date(start.getTime() - span - 1),
    buckets,
  };
}

/** Percentage change, or null when there is no baseline to compare against. */
export function deltaPercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
