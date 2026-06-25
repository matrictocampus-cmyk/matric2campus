type ApplicationSummaryInput = {
  profile: any;
  eligibility: any;
  eligibilityResults: any;
  selectedCourses: any[];
};

export function generateApplicationSummary({
  profile,
  eligibility,
  eligibilityResults,
  selectedCourses
}: ApplicationSummaryInput) {
  return {
    generated_at: new Date().toISOString(),

    profile: {
      full_name: profile?.full_name ?? null,
      id_number: profile?.id_number ?? null,
      citizenship: profile?.citizenship ?? null,
      highest_grade: profile?.highest_grade ?? null
    },

    eligibility: eligibility ?? null,

    eligibility_results: eligibilityResults ?? [],

    selected_courses: (selectedCourses || []).map((c: any) => ({
      course_id: c.courseId ?? c.id ?? null,
      title: c.title ?? c.course ?? "Unknown",
      institution: c.institution_name ?? c.institution ?? null,
      programme_type: c.programme_type ?? c.type ?? null,
      eligibility: c.eligibility ?? null,
      notes: c.notes ?? null
    }))
  };
}
