// src/components/Eligibility/PathPlannerCard.jsx
import React from "react";

export default function PathPlannerCard({ title, description, selected, fit, onClick }) {
  return (
    <div
      onClick={onClick} // whole card clickable
      className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition relative
        ${selected ? "border-black bg-gray-100" : "border-gray-300 bg-white"}`}
    >
      <h4 className="font-semibold mb-2">{title}</h4>
      <p className="text-sm text-gray-600 mb-2">{description}</p>

      <div className="text-xs text-gray-500 mb-2">
        <p>Timeline: Early exploration</p>
        <p>Outcome: Possible fit</p>
        <p>Fit: {fit}%</p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // prevent double triggering if card also clickable
            onClick();
          }}
          className={`px-3 py-1 rounded border text-sm
            ${selected ? "bg-black text-white" : "bg-white text-black border-gray-400 hover:bg-gray-100"}`}
        >
          Select Path
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            alert(`Talk to advisor for ${title} — contact details provided at the end of eligibility.`);
          }}
          className="px-3 py-1 rounded border text-sm bg-white text-black border-gray-400 hover:bg-gray-100"
        >
          Talk to Advisor
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            alert(`Saved ${title} path!`);
          }}
          className="px-3 py-1 rounded border text-sm bg-white text-black border-gray-400 hover:bg-gray-100"
        >
          Save
        </button>
      </div>

      {selected && (
        <div className="absolute top-2 right-2 text-xs text-green-600 font-semibold">
          Selected
        </div>
      )}
    </div>
  );
}
