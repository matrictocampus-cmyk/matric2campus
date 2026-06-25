type SubjectMark =
  | number
  | {
      level?: number;
      percent?: number;
    }
  | null
  | undefined;

export function normalizeProfile(profile: any) {
  if (!profile) return profile;

  const marks = profile.marks ?? {};

  const normalizedMarks = Object.fromEntries(
    Object.entries(marks).map(([subject, value]) => {
      const v = value as SubjectMark;

      return [
        subject,
        {
          level: typeof v === "number" ? v : v?.level ?? null,
          percent: typeof v === "number" ? null : v?.percent ?? null
        }
      ];
    })
  );

  return {
    ...profile,
    marks: normalizedMarks
  };
}
