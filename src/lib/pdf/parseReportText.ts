import type { BiomarkerId, ReferenceRange } from "@/lib/domain/types";
import { isSupportedUnit } from "@/lib/domain/units";

export type ExtractedIssue = "missing_unit" | "unsupported_unit" | "conflicting_duplicate" | "missing_value";

export type ExtractedReading = {
  id: BiomarkerId;
  label: string;
  value: number | null;
  unit: string | null;
  ranges: ReferenceRange[];
  issues: ExtractedIssue[];
  candidates: number[];
};

export type ParsedReport = {
  collectedOn: string | null;
  readings: ExtractedReading[];
  unsupportedAnalytes: string[];
};

const SYNONYMS: Record<BiomarkerId, string[]> = {
  vitaminD: ["25-OH Vitamin D", "25-Hydroxyvitamin D", "Vitamin D, 25-Hydroxy"],
  b12: ["Vitamin B12", "Cobalamin", "B12"],
  folate: ["Folate, Serum", "Folate"],
  ferritin: ["Ferritin"],
  magnesium: ["Magnesium, Serum", "Magnesium"],
};

// Longest synonym first so "Folate, Serum" wins over "Folate".
const NAME_TABLE = (Object.entries(SYNONYMS) as [BiomarkerId, string[]][])
  .flatMap(([id, names]) => names.map((name) => ({ id, name })))
  .sort((a, b) => b.name.length - a.name.length);

const NUM = String.raw`\d+(?:\.\d+)?`;
const DASH = String.raw`\s*[-–]\s*`;
const SINGLE_RANGE = new RegExp(`^(?:(${NUM})${DASH}(${NUM})|>\\s*(${NUM})|<\\s*(${NUM}))$`);
const SEX_RANGE = /^(female|male)\s*:\s*(.+)$/i;
const RANGE_TEXT = String.raw`(?:(?:Female|Male)\s*:\s*)?(?:${NUM}${DASH}${NUM}|[<>]\s*${NUM})`;
const UNSUPPORTED_LINE = new RegExp(
  String.raw`^([A-Za-z][A-Za-z ,()]*?)\s+(${NUM})\s+(\S+)\s+(${RANGE_TEXT}(?:\s*;\s*${RANGE_TEXT})*)\s*$`,
);

function parseSingle(text: string, unit: string, sex?: "female" | "male"): ReferenceRange | null {
  const m = SINGLE_RANGE.exec(text.trim());
  if (!m) return null;
  const range: ReferenceRange = m[1] !== undefined
    ? { low: Number(m[1]), high: Number(m[2]), unit }
    : m[3] !== undefined
      ? { low: Number(m[3]), high: null, unit }
      : { low: null, high: Number(m[4]), unit };
  return sex ? { sex, ...range } : range;
}

function parseRanges(text: string, unit: string): ReferenceRange[] {
  const out: ReferenceRange[] = [];
  for (const part of text.split(";")) {
    const sex = SEX_RANGE.exec(part.trim());
    const r = sex
      ? parseSingle(sex[2], unit, sex[1].toLowerCase() as "female" | "male")
      : parseSingle(part, unit);
    if (r) out.push(r);
  }
  return out;
}

function parseDate(text: string): string | null {
  const iso = /Collect(?:ed|ion Date)\s*:?\s*(\d{4})-(\d{2})-(\d{2})/i.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = /Collect(?:ed|ion Date)\s*:?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i.exec(text);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  return null;
}

function matchKnown(line: string): { id: BiomarkerId; name: string; rest: string } | null {
  for (const { id, name } of NAME_TABLE) {
    if (line.length > name.length && line.slice(0, name.length).toLowerCase() === name.toLowerCase() && /\s/.test(line[name.length])) {
      return { id, name, rest: line.slice(name.length).trim() };
    }
  }
  return null;
}

function parseKnownLine(id: BiomarkerId, label: string, rest: string): ExtractedReading {
  const issues: ExtractedIssue[] = [];
  const valueMatch = new RegExp(`^(${NUM})(?:\\s+(.*))?$`).exec(rest);
  if (!valueMatch) {
    return { id, label, value: null, unit: null, ranges: [], issues: ["missing_value"], candidates: [] };
  }
  const value = Number(valueMatch[1]);
  let tail = (valueMatch[2] ?? "").trim();
  let unit: string | null = null;
  if (tail && !/^(?:\d|[<>]|(?:female|male)\s*:)/i.test(tail)) {
    const [token, ...others] = tail.split(/\s+/);
    unit = token;
    tail = others.join(" ");
  }
  if (unit === null) issues.push("missing_unit");
  else if (!isSupportedUnit(id, unit)) issues.push("unsupported_unit");
  return { id, label, value, unit, ranges: parseRanges(tail, unit ?? ""), issues, candidates: [] };
}

function mergeDuplicates(entries: ExtractedReading[]): ExtractedReading {
  const [first] = entries;
  const values = [...new Set(entries.map((e) => e.value).filter((v): v is number => v !== null))];
  const units = new Set(entries.map((e) => e.unit));
  if (entries.length === 1 || (values.length <= 1 && units.size === 1)) return first;
  return {
    ...first,
    value: null,
    unit: units.size === 1 ? first.unit : null,
    issues: [...new Set<ExtractedIssue>([...entries.flatMap((e) => e.issues), "conflicting_duplicate"])],
    candidates: values,
  };
}

export function parseReportText(text: string): ParsedReport {
  const byId = new Map<BiomarkerId, ExtractedReading[]>();
  const unsupported: string[] = [];
  let collectedOn: string | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    collectedOn ??= parseDate(line);
    const known = matchKnown(line);
    if (known) {
      const list = byId.get(known.id) ?? [];
      list.push(parseKnownLine(known.id, known.name, known.rest));
      byId.set(known.id, list);
      continue;
    }
    const other = UNSUPPORTED_LINE.exec(line);
    if (other && !unsupported.includes(other[1].trim())) unsupported.push(other[1].trim());
  }

  return {
    collectedOn,
    readings: [...byId.values()].map(mergeDuplicates),
    unsupportedAnalytes: unsupported,
  };
}
