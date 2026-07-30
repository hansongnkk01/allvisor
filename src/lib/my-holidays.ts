/** Fixed Malaysian public / important holidays (national). Update yearly as needed. */

export type MyHoliday = {
  date: string; // yyyy-MM-dd
  nameEn: string;
  nameMs: string;
};

const HOLIDAYS: MyHoliday[] = [
  // 2026
  { date: "2026-01-01", nameEn: "New Year's Day", nameMs: "Hari Tahun Baru" },
  { date: "2026-01-16", nameEn: "Thaipusam", nameMs: "Thaipusam" },
  { date: "2026-02-01", nameEn: "Federal Territory Day", nameMs: "Hari Wilayah Persekutuan" },
  { date: "2026-02-17", nameEn: "Chinese New Year", nameMs: "Tahun Baru Cina" },
  { date: "2026-02-18", nameEn: "Chinese New Year (Day 2)", nameMs: "Tahun Baru Cina (Hari 2)" },
  { date: "2026-03-20", nameEn: "Nuzul Al-Quran", nameMs: "Nuzul Al-Quran" },
  { date: "2026-03-21", nameEn: "Hari Raya Aidilfitri", nameMs: "Hari Raya Aidilfitri" },
  { date: "2026-03-22", nameEn: "Hari Raya Aidilfitri (Day 2)", nameMs: "Hari Raya Aidilfitri (Hari 2)" },
  { date: "2026-05-01", nameEn: "Labour Day", nameMs: "Hari Pekerja" },
  { date: "2026-05-27", nameEn: "Wesak Day", nameMs: "Hari Wesak" },
  { date: "2026-05-28", nameEn: "Hari Raya Haji", nameMs: "Hari Raya Haji" },
  { date: "2026-06-01", nameEn: "Agong's Birthday", nameMs: "Hari Keputeraan Agong" },
  { date: "2026-06-17", nameEn: "Awal Muharram", nameMs: "Awal Muharram" },
  { date: "2026-08-31", nameEn: "National Day", nameMs: "Hari Kebangsaan" },
  { date: "2026-09-16", nameEn: "Malaysia Day", nameMs: "Hari Malaysia" },
  { date: "2026-09-26", nameEn: "Prophet Muhammad's Birthday", nameMs: "Maulidur Rasul" },
  { date: "2026-10-20", nameEn: "Deepavali", nameMs: "Deepavali" },
  { date: "2026-12-25", nameEn: "Christmas Day", nameMs: "Hari Krismas" },
  // 2027 (key national)
  { date: "2027-01-01", nameEn: "New Year's Day", nameMs: "Hari Tahun Baru" },
  { date: "2027-02-01", nameEn: "Federal Territory Day", nameMs: "Hari Wilayah Persekutuan" },
  { date: "2027-02-06", nameEn: "Chinese New Year", nameMs: "Tahun Baru Cina" },
  { date: "2027-02-07", nameEn: "Chinese New Year (Day 2)", nameMs: "Tahun Baru Cina (Hari 2)" },
  { date: "2027-05-01", nameEn: "Labour Day", nameMs: "Hari Pekerja" },
  { date: "2027-08-31", nameEn: "National Day", nameMs: "Hari Kebangsaan" },
  { date: "2027-09-16", nameEn: "Malaysia Day", nameMs: "Hari Malaysia" },
  { date: "2027-12-25", nameEn: "Christmas Day", nameMs: "Hari Krismas" },
];

export function getMyHolidayOn(date: Date, locale: string = "ms"): MyHoliday | null {
  const key = formatYmd(date);
  const hit = HOLIDAYS.find((h) => h.date === key);
  return hit || null;
}

export function holidayLabel(h: MyHoliday, locale: string = "ms") {
  return locale.startsWith("en") ? h.nameEn : h.nameMs;
}

export function formatYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getUpcomingMyHolidays(from: Date, days = 90): MyHoliday[] {
  const start = formatYmd(from);
  const endDate = new Date(from);
  endDate.setDate(endDate.getDate() + days);
  const end = formatYmd(endDate);
  return HOLIDAYS.filter((h) => h.date >= start && h.date <= end);
}
