import React, { useState, useEffect } from "react";
import Button from "../ui/Button";
import { supabase } from "../../lib/supabase";

export default function EligibilityWizard({ profile, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [answers, setAnswers] = useState({
    income: "",
    dependents: 1,
    disability: "no",
    qualificationType: "",
    studyMode: "",
    previousTertiary: "no",
    fieldInterest: "",
  });

  useEffect(() => {
    if (!profile?.user_id) return;
    const loadExisting = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("eligibilities")
        .select("*")
        .eq("user_id", profile.user_id)
        .maybeSingle();
      if (data) {
        setAnswers({
          income: data.financial?.familyIncome || "",
          dependents: data.financial?.dependents || 1,
          disability: data.barriers?.disability || "no",
          qualificationType: data.education?.qualificationType || "",
          studyMode: data.lifestyle?.studyMode || "",
          previousTertiary: data.lifestyle?.previousTertiary || "no",
          fieldInterest: data.barriers?.fieldInterest || "",
        });
      }
      setLoading(false);
    };
    loadExisting();
  }, [profile?.user_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAnswers((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile?.user_id) {
      setSubmitError("You must be logged in to save your answers.");
      return;
    }
    setSubmitError("");
    setSaving(true);
    const eligibilityData = {
      user_id: profile.user_id,
      education: {
        grade: profile.highest_grade || "",
        school: profile.school || "",
        highestGradeCompleted: profile.highest_grade || "",
        qualificationType: answers.qualificationType,
      },
      subjects: profile.subjects_marks || {},
      financial: {
        familyIncome: answers.income,
        dependents: answers.dependents,
        needsFunding: answers.income === "R0 – R350 000",
      },
      lifestyle: {
        hasLaptop: null,
        studyHours: "",
        studyMode: answers.studyMode,
        previousTertiary: answers.previousTertiary,
      },
      barriers: {
        challenges: [],
        motivation: "",
        disability: answers.disability,
        fieldInterest: answers.fieldInterest,
      },
      is_completed: true,
    };
    try {
      const { error } = await supabase
        .from("eligibilities")
        .upsert(eligibilityData, { onConflict: ["user_id"] });
      if (error) throw error;
      onSaved?.(eligibilityData);
    } catch (err) {
      console.error(err);
      setSubmitError("Failed to save your answers. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Income */}
      <div className="bg-white p-4 rounded-lg border">
        <label className="block font-medium mb-2">
          1. What is your total annual household income?
        </label>
        <div className="space-y-2">
          {["R0 – R350 000", "R350 001 – R600 000", "Above R600 000"].map(
            (opt) => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="income"
                  value={opt}
                  checked={answers.income === opt}
                  onChange={handleChange}
                  required
                />
                {opt}
              </label>
            )
          )}
        </div>
      </div>

      {/* Dependents */}
      <div className="bg-white p-4 rounded-lg border">
        <label className="block font-medium mb-2">
          2. Number of people depending on this income (including yourself)
        </label>
        <input
          type="number"
          name="dependents"
          min="1"
          value={answers.dependents}
          onChange={handleChange}
          className="border p-2 rounded w-24"
          required
        />
      </div>

      {/* Disability */}
      <div className="bg-white p-4 rounded-lg border">
        <label className="block font-medium mb-2">
          3. Do you have a disability?
        </label>
        <div className="flex gap-4">
          <label>
            <input
              type="radio"
              name="disability"
              value="yes"
              checked={answers.disability === "yes"}
              onChange={handleChange}
              required
            /> Yes
          </label>
          <label>
            <input
              type="radio"
              name="disability"
              value="no"
              checked={answers.disability === "no"}
              onChange={handleChange}
              required
            /> No
          </label>
        </div>
      </div>

      {/* Qualification Type */}
      <div className="bg-white p-4 rounded-lg border">
        <label className="block font-medium mb-2">
          4. What type of qualification are you aiming for?
        </label>
        <select
          name="qualificationType"
          value={answers.qualificationType}
          onChange={handleChange}
          className="border p-2 rounded w-full"
          required
        >
          <option value="">Select...</option>
          <option value="degree">University Degree</option>
          <option value="diploma">University Diploma</option>
          <option value="tvet">TVET College (NCV/Report 191)</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Study Mode */}
      <div className="bg-white p-4 rounded-lg border">
        <label className="block font-medium mb-2">
          5. How do you plan to study?
        </label>
        <div className="space-y-2">
          {["Full-time", "Part-time", "Distance learning"].map((mode) => (
            <label key={mode} className="flex items-center gap-2">
              <input
                type="radio"
                name="studyMode"
                value={mode}
                checked={answers.studyMode === mode}
                onChange={handleChange}
                required
              />
              {mode}
            </label>
          ))}
        </div>
      </div>

      {/* Previous Tertiary */}
      <div className="bg-white p-4 rounded-lg border">
        <label className="block font-medium mb-2">
          6. Do you already have a tertiary qualification?
        </label>
        <div className="flex gap-4">
          <label>
            <input
              type="radio"
              name="previousTertiary"
              value="yes"
              checked={answers.previousTertiary === "yes"}
              onChange={handleChange}
              required
            /> Yes
          </label>
          <label>
            <input
              type="radio"
              name="previousTertiary"
              value="no"
              checked={answers.previousTertiary === "no"}
              onChange={handleChange}
              required
            /> No
          </label>
        </div>
      </div>

      {/* Field of Interest (optional) */}
      <div className="bg-white p-4 rounded-lg border">
        <label className="block font-medium mb-2">
          7. Which field are you most interested in? (optional)
        </label>
        <input
          type="text"
          name="fieldInterest"
          value={answers.fieldInterest}
          onChange={handleChange}
          placeholder="e.g. Engineering, Nursing, Business"
          className="border p-2 rounded w-full"
        />
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {submitError}
        </div>
      )}

      <Button
        type="submit"
        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
        disabled={saving}
      >
        {saving ? "Saving your answers..." : "Submit & Check Eligibility"}
      </Button>
    </form>
  );
}