import React from "react";

const statusStyles = {
  eligible: "border-green-400 bg-green-50",
  conditional: "border-yellow-400 bg-yellow-50",
  not_eligible: "border-red-400 bg-red-50"
};

const statusLabel = {
  eligible: "Eligible",
  conditional: "Conditionally Eligible",
  not_eligible: "Not Eligible"
};

export default function EligibilityCard({ course, result }) {
  const { status, reasons, missing } = result;

  return (
    <div
      className={`p-4 border rounded-lg ${statusStyles[status]}`}
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg">{course.title}</h3>
          <p className="text-sm text-gray-600">
            {course.institution_name} • {course.programme_type}
          </p>
        </div>

        <span className="font-semibold">
          {statusLabel[status]}
        </span>
      </div>

      {reasons?.length > 0 && (
        <div className="mt-3">
          <p className="font-medium text-sm">Why you don't qualify:</p>
          <ul className="list-disc ml-5 text-sm">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {missing?.length > 0 && (
        <div className="mt-3">
          <p className="font-medium text-sm">
            What you still need:
          </p>
          <ul className="list-disc ml-5 text-sm">
            {missing.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
