import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useEligibility } from "../hooks/useEligibility";

export default function EligibilityFlow({ profile, allCourses }) {
  const [recommendedFields, setRecommendedFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const { checkEligibility, results, loading } = useEligibility();

  // STEP 1 — INFER FIELDS
  useEffect(() => {
    const infer = async () => {
      const { data } = await supabase.functions.invoke("infer-fields", {
        body: { subjects: profile.subjects },
      });
      setRecommendedFields(data.recommended_fields);
      setSelectedFields(data.recommended_fields);
    };
    infer();
  }, [profile.subjects]);

  // STEP 2 — FILTER COURSES
  const filteredCourses = allCourses.filter((c) =>
    selectedFields.includes(c.category)
  );

  return (
    <div>
      <h2>Recommended Fields</h2>

      {recommendedFields.map((field) => (
        <label key={field} style={{ display: "block" }}>
          <input
            type="checkbox"
            checked={selectedFields.includes(field)}
            onChange={() =>
              setSelectedFields((prev) =>
                prev.includes(field)
                  ? prev.filter((f) => f !== field)
                  : [...prev, field]
              )
            }
          />
          {field}
        </label>
      ))}

      <button
        onClick={() => checkEligibility(profile, filteredCourses)}
        disabled={loading}
      >
        {loading ? "Checking..." : "Check Eligibility"}
      </button>

      <hr />

      {results.map((r) => (
        <div key={r.course_id}>
          <strong>{r.title}</strong>
          <p>
            {r.status === "ELIGIBLE" && "✅ Eligible"}
            {r.status === "CONDITIONAL" && "🟡 Conditional"}
            {r.status === "NOT_ELIGIBLE" && "❌ Not Eligible"}
          </p>
          <small>{r.explanation}</small>
        </div>
      ))}
    </div>
  );
}
