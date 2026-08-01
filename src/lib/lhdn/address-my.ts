/** LHDN CountrySubentityCode → display name */
export const MY_STATE_BY_CODE: Record<string, string> = {
  "01": "JOHOR",
  "02": "KEDAH",
  "03": "KELANTAN",
  "04": "MELAKA",
  "05": "NEGERI SEMBILAN",
  "06": "PAHANG",
  "07": "PULAU PINANG",
  "08": "PERAK",
  "09": "PERLIS",
  "10": "SELANGOR",
  "11": "TERENGGANU",
  "12": "SABAH",
  "13": "SARAWAK",
  "14": "WILAYAH PERSEKUTUAN KUALA LUMPUR",
  "15": "WILAYAH PERSEKUTUAN LABUAN",
  "16": "WILAYAH PERSEKUTUAN PUTRAJAYA",
  "17": "NOT APPLICABLE",
};

type StateEntry = { code: string; aliases: string[] };

const STATES: StateEntry[] = [
  { code: "01", aliases: ["johor", "johor bahru"] },
  { code: "02", aliases: ["kedah"] },
  { code: "03", aliases: ["kelantan"] },
  { code: "04", aliases: ["melaka", "malacca"] },
  { code: "05", aliases: ["negeri sembilan", "n sembilan", "n. sembilan"] },
  { code: "06", aliases: ["pahang"] },
  { code: "07", aliases: ["pulau pinang", "penang", "pinang"] },
  { code: "08", aliases: ["perak"] },
  { code: "09", aliases: ["perlis", "pelris"] },
  { code: "10", aliases: ["selangor"] },
  { code: "11", aliases: ["terengganu", "trengganu"] },
  { code: "12", aliases: ["sabah"] },
  { code: "13", aliases: ["sarawak"] },
  {
    code: "14",
    aliases: [
      "wilayah persekutuan kuala lumpur",
      "w.p. kuala lumpur",
      "wp kuala lumpur",
      "wilayah persekutuan",
      "kuala lumpur",
      "kl",
    ],
  },
  {
    code: "15",
    aliases: ["wilayah persekutuan labuan", "wp labuan", "labuan", "w.p. labuan"],
  },
  {
    code: "16",
    aliases: [
      "wilayah persekutuan putrajaya",
      "wp putrajaya",
      "putrajaya",
      "w.p. putrajaya",
    ],
  },
];

/** Rough MY postcode prefix → state (first 2 digits). */
function stateFromPostcode(postcode: string): string | null {
  const n = Number(postcode.slice(0, 2));
  if (!Number.isFinite(n)) return null;
  if (n >= 1 && n <= 2) return "09";
  if (n >= 5 && n <= 9) return "02";
  if (n >= 10 && n <= 14) return "07";
  if (n >= 15 && n <= 18) return "03";
  if (n >= 20 && n <= 24) return "11";
  if (n >= 25 && n <= 28) return "06";
  if (n >= 30 && n <= 36) return "08";
  if (n >= 39 && n <= 48) return "10";
  if (n >= 50 && n <= 60) return "14";
  if (n >= 62 && n <= 63) return "16";
  if (n >= 70 && n <= 73) return "05";
  if (n >= 75 && n <= 78) return "04";
  if (n >= 79 && n <= 86) return "01";
  if (n === 87) return "15";
  if (n >= 88 && n <= 91) return "12";
  if (n >= 93 && n <= 98) return "13";
  return null;
}

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/** Match a segment that is (mostly) a state name. */
function matchStateSegment(segment: string): string | null {
  const key = normalizeKey(segment);
  if (!key) return null;

  let best: { code: string; len: number } | null = null;
  for (const state of STATES) {
    for (const alias of state.aliases) {
      const a = normalizeKey(alias);
      if (!a) continue;
      if (key === a || key === `wp ${a}` || key.endsWith(` ${a}`) || key.startsWith(`${a} `)) {
        if (!best || a.length > best.len) best = { code: state.code, len: a.length };
      }
    }
  }
  if (best) return best.code;

  // 1-char typo on short state tokens (pELRIS → perlis)
  if (key.length >= 5 && !key.includes(" ")) {
    for (const state of STATES) {
      for (const alias of state.aliases) {
        const a = normalizeKey(alias);
        if (a.length < 5 || a.includes(" ")) continue;
        if (Math.abs(a.length - key.length) <= 1 && editDistance(key, a) <= 1) {
          return state.code;
        }
      }
    }
  }
  return null;
}

function defaultCityForState(code: string, fallbackCity: string) {
  if (code === "14") return "Kuala Lumpur";
  if (code === "15") return "Labuan";
  if (code === "16") return "Putrajaya";
  return fallbackCity;
}

export type ParsedMyAddress = {
  line1: string;
  line2: string | null;
  line3: string | null;
  city: string;
  postcode: string;
  stateCode: string;
};

/**
 * Parse free-text Malaysian address into MyInvois PostalAddress fields.
 * Preferred shape: "street, city, postcode, state"
 */
export function parseMalaysiaAddress(
  raw: string | null | undefined,
  fallback?: Partial<ParsedMyAddress>
): ParsedMyAddress {
  const fb: ParsedMyAddress = {
    line1: (fallback?.line1 || "Malaysia").trim() || "Malaysia",
    line2: fallback?.line2 || null,
    line3: fallback?.line3 || null,
    city: (fallback?.city || "Kuala Lumpur").trim() || "Kuala Lumpur",
    postcode: (fallback?.postcode || "50000").trim() || "50000",
    stateCode: (fallback?.stateCode || "14").trim() || "14",
  };

  const input = (raw || "").trim();
  if (!input) return fb;

  let segments = input
    .split(/[,;/|]+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  let postcode: string | null = null;
  segments = segments
    .map((seg) => {
      const m = seg.match(/\b(\d{5})\b/);
      if (m && !postcode) {
        postcode = m[1];
        return seg.replace(/\b\d{5}\b/, "").replace(/\s+/g, " ").trim();
      }
      return seg;
    })
    .filter(Boolean);

  let stateCode: string | null = null;
  // Prefer state from the last segment (typical "..., State")
  for (let i = segments.length - 1; i >= 0; i--) {
    const code = matchStateSegment(segments[i]);
    if (!code) continue;
    // Avoid eating a city named "Kuala Lumpur" when a later WP segment exists —
    // we iterate from the end, so last match wins and we stop.
    stateCode = code;
    segments.splice(i, 1);
    break;
  }

  if (!stateCode && postcode) {
    stateCode = stateFromPostcode(postcode);
  }

  // Drop leftover bare "Wilayah Persekutuan" if state already known
  segments = segments.filter((seg) => {
    const key = normalizeKey(seg);
    if (key === "wilayah persekutuan" || key === "wp") return false;
    return true;
  });

  let city = "";
  if (segments.length >= 2) {
    city = segments[segments.length - 1];
    segments = segments.slice(0, -1);
  }

  const streetParts = segments.length ? segments : [input.replace(/\b\d{5}\b/, "").trim() || fb.line1];
  const lines = streetParts.map((p) => p.slice(0, 150)).filter(Boolean).slice(0, 3);

  const resolvedState = stateCode || fb.stateCode;
  if (!city) {
    city = defaultCityForState(resolvedState, fb.city);
  }

  return {
    line1: (lines[0] || fb.line1).slice(0, 150),
    line2: lines[1] ? lines[1].slice(0, 150) : null,
    line3: lines[2] ? lines[2].slice(0, 150) : null,
    city: city.slice(0, 50),
    postcode: postcode || fb.postcode,
    stateCode: resolvedState,
  };
}

export function addressLinesForUbl(parsed: ParsedMyAddress): string[] {
  return [parsed.line1, parsed.line2, parsed.line3].filter(
    (line): line is string => Boolean(line && line.trim() && line.trim() !== "-")
  );
}
