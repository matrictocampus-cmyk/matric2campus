// src/pages/Courses.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Courses({ institutionId, prefetchedCourses, onAddToBucket }) {
  const [courses, setCourses] = useState(prefetchedCourses || []);
  const [loading, setLoading] = useState(!prefetchedCourses);
  const [error, setError] = useState("");
  const [expandedCourse, setExpandedCourse] = useState(null);

  // Reset expanded course when institution changes
  useEffect(() => {
    setExpandedCourse(null);
  }, [institutionId]);

  // Use prefetched courses if available
  useEffect(() => {
    if (prefetchedCourses && prefetchedCourses.length > 0) {
      setCourses(prefetchedCourses);
      setLoading(false);
      return;
    }

    if (!institutionId) return;

    fetchCourses();
  }, [institutionId, prefetchedCourses]);

  const fetchCourses = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("institution_courses")
        .select("*")
        .eq("institution_id", institutionId)
        .order("title");

      if (error) throw error;

      setCourses(data || []);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError("Failed to load courses.");
    } finally {
      setLoading(false);
    }
  };

  // Parse entry requirements safely
  const parseRequirements = (req) => {
    if (!req) return null;

    if (typeof req === "string") {
      try {
        return JSON.parse(req);
      } catch {
        return null;
      }
    }

    return req;
  };

  const formatRequirements = (req) => {
    const requirements = parseRequirements(req);
    if (!requirements) return <p className="text-gray-600">No requirements listed.</p>;

    return (
      <div className="space-y-2">
        {requirements.min_aps && (
          <p>
            <span className="font-medium">Minimum APS:</span> {requirements.min_aps}
          </p>
        )}

        {requirements.required_subjects && (
  <div>
    <span className="font-medium">Required Subjects:</span>

    {Object.entries(requirements.required_subjects).map(([type, value]) => (
      <div key={type} className="mt-2 ml-2">

        <p className="font-medium capitalize text-gray-800">
          {type.replace("_", " ")}
        </p>

        <ul className="list-disc list-inside ml-4">
          {Array.isArray(value)
            ? value.map((subj, i) => <li key={i}>{subj}</li>)
            : value
                .match(/[A-Z][a-zA-Z ]+ Level \d/g)
                ?.map((subj, i) => <li key={i}>{subj}</li>)}
        </ul>

      </div>
    ))}
  </div>
)}

        {requirements.selection_notes && (
          <p>
            <span className="font-medium">Selection Notes:</span>{" "}
            {requirements.selection_notes}
          </p>
        )}
      </div>
    );
  };

  const handleAdd = (course) => {
    if (!onAddToBucket) return;

    const requirements = parseRequirements(course.entry_requirements);

    const result = {
      course: course.title,
      courseId: course.id,
      eligibility: "PENDING",
      reasons: [],
      notes: requirements?.selection_notes || null,
    };

    onAddToBucket(result);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading courses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl">
        <p className="text-gray-500">
          No courses available for this institution.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {courses.map((course) => (
        <div
          key={course.id}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="p-5 flex flex-wrap justify-between items-start gap-3">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">
                {course.title}
              </h3>

              <div className="flex flex-wrap gap-2 mt-2">
                {course.duration && (
                  <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                    ⏱️ {course.duration}
                  </span>
                )}

                {course.category && (
                  <span className="bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-full">
                    {course.category}
                  </span>
                )}

                {course.outcome && (
                  <span className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full">
                    {course.outcome}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {onAddToBucket && (
                <button
                  onClick={() => handleAdd(course)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  + Add
                </button>
              )}

              <button
                onClick={() =>
                  setExpandedCourse(
                    expandedCourse === course.id ? null : course.id
                  )
                }
                className="text-blue-600 hover:text-blue-800 font-medium text-sm border border-blue-200 px-3 py-1 rounded-lg"
              >
                {expandedCourse === course.id ? "Hide" : "Details"}
              </button>
            </div>
          </div>

          {expandedCourse === course.id && (
            <div className="border-t border-gray-100 p-5 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {course.entry_requirements && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      📋 Entry Requirements
                    </h4>
                    <div className="text-sm text-gray-700">
                      {formatRequirements(course.entry_requirements)}
                    </div>
                  </div>
                )}

                {course.career_opportunities && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      💼 Career Opportunities
                    </h4>
                    <p className="text-sm text-gray-700">
                      {course.career_opportunities}
                    </p>
                  </div>
                )}

                {course.campus_availability && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      📍 Campus Availability
                    </h4>
                    <p className="text-sm text-gray-700">
                      {course.campus_availability}
                    </p>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}