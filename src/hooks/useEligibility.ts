import { useState } from "react";
import { evaluateCourse } from "../lib/eligibilityEngine";

export function useEligibility(profile: any) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  function checkEligibility(courses: any[]) {
    setLoading(true);

    const evaluated = courses.map(course => {
      const result = evaluateCourse(profile, course.entry_requirements);

      return {
        course_id: course.id,
        title: course.title,
        ...result,
      };
    });

    setResults(evaluated);
    setLoading(false);
  }

  return {
    checkEligibility,
    results,
    loading,
  };
}
