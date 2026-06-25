import { SUBJECT_ALIASES } from "./subjectAliases";

export function normalizeSubjectName(name: string): string {
  const cleaned = name.toLowerCase().trim();

  for (const [canonical, aliases] of Object.entries(SUBJECT_ALIASES)) {
    if (aliases.some(a => a === cleaned)) {
      return canonical;
    }
  }

  // fallback (still prevents crashes)
  return cleaned.toUpperCase();
}
