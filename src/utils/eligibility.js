export function checkEligibility(user, entryRequirements) {
  const reasons = [];
  const missing = [];
  const notes = [];

  if (!entryRequirements) {
    return {
      status: "not_eligible",
      reasons: ["Missing course entry requirements"],
      missing: [],
      notes: []
    };
  }

  const {
    minimum_requirements,
    required_subjects,
    additional_requirements
  } = entryRequirements;

  // 1️⃣ Minimum grade check
  if (
    minimum_requirements?.min_grade &&
    user.grade < minimum_requirements.min_grade
  ) {
    reasons.push(
      `Minimum grade ${minimum_requirements.min_grade} required`
    );
  }

  // 2️⃣ Required subjects (ALL)
  if (required_subjects?.all_of?.length) {
    required_subjects.all_of.forEach((subject) => {
      if (!user.subjects.includes(subject)) {
        reasons.push(`Missing required subject: ${subject}`);
      }
    });
  }

  // 3️⃣ Required subjects (ANY)
  if (required_subjects?.any_of?.length) {
    const hasAny = required_subjects.any_of.some((s) =>
      user.subjects.includes(s)
    );
    if (!hasAny) {
      missing.push(
        `One of the following subjects required: ${required_subjects.any_of.join(", ")}`
      );
    }
  }

  // 4️⃣ Age restriction
  if (additional_requirements?.age_restriction) {
    const { min, max } = additional_requirements.age_restriction;
    if (min && user.age < min) reasons.push("Below minimum age");
    if (max && user.age > max) reasons.push("Above maximum age");
  }

  // 5️⃣ Citizenship
  if (
    additional_requirements?.citizenship_requirement &&
    user.citizenship !== additional_requirements.citizenship_requirement
  ) {
    reasons.push("Citizenship requirement not met");
  }

  // 6️⃣ Criminal record
  if (
    additional_requirements?.criminal_record_clearance_required &&
    user.hasCriminalRecord
  ) {
    reasons.push("Criminal record clearance required");
  }

  // 7️⃣ Medical fitness
  if (
    additional_requirements?.medical_fitness_required &&
    !user.medicallyFit
  ) {
    reasons.push("Medical fitness required");
  }

  // 🎯 FINAL STATUS
  let status = "eligible";
  if (reasons.length > 0) status = "not_eligible";
  else if (missing.length > 0) status = "conditional";

  return {
    status,
    reasons,
    missing,
    notes
  };
}
