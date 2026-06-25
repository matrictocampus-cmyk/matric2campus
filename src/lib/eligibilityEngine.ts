import { normalizeSubjectName } from "./normalizeSubject";

function hasSubject(profile: any, subject: string) {
  const canonical = normalizeSubjectName(subject);
  return profile.subjects.some((s: any) => s.canonical === canonical);
}

function checkSubjectRule(profile: any, rule: any, reasons: string[]) {
  const canonical = normalizeSubjectName(rule.subject);

  const subject = profile.subjects.find(
    (s: any) => s.canonical === canonical
  );

  if (!subject) {
    reasons.push(`Missing subject: ${rule.subject}`);
    return false;
  }

  if (rule.min_level && subject.level < rule.min_level) {
    reasons.push(`${rule.subject} requires level ${rule.min_level}`);
    return false;
  }

  if (rule.min_percent && subject.percent < rule.min_percent) {
    reasons.push(`${rule.subject} requires ${rule.min_percent}%`);
    return false;
  }

  return true;
}

/**
 * MAIN ENTRY POINT
 */
export function evaluateCourse(profile: any, entryRequirements: any) {
  const reasons: string[] = [];

  // 🔹 MULTI-ROUTE STRUCTURE (Rosebank)
  if (entryRequirements?.routes) {
    for (const route of entryRequirements.routes) {
      const routeReasons: string[] = [];

      let ok = true;

      for (const rule of route.required_subjects || []) {
        if (!checkSubjectRule(profile, rule, routeReasons)) {
          ok = false;
          break;
        }
      }

      if (ok) {
        return {
          eligibility: "ELIGIBLE",
          matched_route: route.route_name,
          reasons: [],
        };
      }
    }

    return {
      eligibility: "NOT_ELIGIBLE",
      reasons: ["Does not meet any admission route"],
    };
  }

  // 🔹 OLD STRUCTURE (Mnambithi / UKZN / CTU)
  const req = entryRequirements?.required_subjects;

  if (req?.all_of) {
    for (const subject of req.all_of) {
      if (!hasSubject(profile, subject)) {
        reasons.push(`Missing required subject: ${subject}`);
      }
    }
  }

  if (req?.any_of?.length) {
    const hasAny = req.any_of.some((s: string) =>
      hasSubject(profile, s)
    );
    if (!hasAny) {
      reasons.push(`Requires one of: ${req.any_of.join(", ")}`);
    }
  }

  if (reasons.length) {
    return { eligibility: "NOT_ELIGIBLE", reasons };
  }

  return { eligibility: "ELIGIBLE", reasons: [] };
}
