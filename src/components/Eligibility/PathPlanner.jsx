// src/components/Eligibility/PathPlanner.jsx
import React, { useState } from "react";
import PathPlannerCard from "./PathPlannerCard";

const paths = [
  { title: "Academic Path", description: "Focus on school subjects and future academic programs." },
  { title: "Practical Path", description: "Hands-on skills, vocational training, and practical learning." },
  { title: "Exploration Path", description: "Discover interests, hobbies, and future possibilities." }
];

export default function PathPlanner({ onPathChosen }) {
  const [selectedPath, setSelectedPath] = useState("");
  const [advisorChecked, setAdvisorChecked] = useState(false);

  const handleSelect = (path) => {
    setSelectedPath(path);
    onPathChosen({ path, wantsAdvisor: advisorChecked });
  };

  const handleAdvisorToggle = (checked) => {
    setAdvisorChecked(checked);
    onPathChosen({ path: selectedPath, wantsAdvisor: checked });
  };

  return (
    <div>
      {paths.map((p) => (
        <PathPlannerCard
          key={p.title}
          title={p.title}
          description={p.description}
          selected={selectedPath === p.title}
          wantsAdvisor={advisorChecked && selectedPath === p.title}
          onSelect={handleSelect}
          onAdvisorToggle={handleAdvisorToggle}
        />
      ))}

      <p className="text-xs text-gray-500 mt-2">
        Please choose a path, select "Talk to Advisor" if you want guidance, and ensure you click Save in Step 1.
        Advisor contact details will be provided in your eligibility results.
      </p>
    </div>
  );
}
