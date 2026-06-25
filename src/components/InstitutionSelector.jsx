import React from "react";

export default function InstitutionSelector({
  institutions = [],
  selected = [],
  onToggle,
}) {
  return (
    <div className="bg-white p-4 rounded shadow space-y-3">
      <h2 className="text-lg font-semibold">
        2️⃣ Select Institution(s)
      </h2>

      {institutions.length === 0 && (
        <p className="text-gray-500">No institutions found.</p>
      )}

      {institutions.map((inst) => (
        <label
          key={inst.id}
          className="flex items-center gap-3 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={selected.includes(inst.id)}
            onChange={() => onToggle(inst.id)}
          />
          <span>{inst.name}</span>
        </label>
      ))}
    </div>
  );
}
