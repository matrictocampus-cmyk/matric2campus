import React from "react";

const INSTITUTION_TYPES = [
  { id: "UNIVERSITY", label: "University" },
  { id: "TVET_COLLEGE", label: "TVET College" },
  { id: "PRIVATE_COLLEGE", label: "Private College" },
  { id: "SKILLS_PROVIDER", label: "Skills / Learnerships" },
];

export default function InstitutionTypeSelector({ value = [], onChange }) {
  return (
    <div className="bg-white p-4 rounded shadow space-y-3">
      <h2 className="text-lg font-semibold">
        1️⃣ Where do you want to study?
      </h2>

      {INSTITUTION_TYPES.map((type) => (
        <label
          key={type.id}
          className="flex items-center gap-3 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={value.includes(type.id)}
            onChange={() => onChange(type.id)}
          />
          <span>{type.label}</span>
        </label>
      ))}
    </div>
  );
}
