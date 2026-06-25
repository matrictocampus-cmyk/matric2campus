// src/components/Loader.jsx
import React from "react";

export default function Loader({ size = 40, label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 50 50"
        className="animate-spin"
        aria-hidden="true"
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="#e6ffe6"
          strokeWidth="6"
          strokeOpacity="0.25"
        />
        <path
          fill="#39FF14"
          d="M25 5
             a20 20 0 0 1 0 40
             a16 16 0 0 0 0 -40"
        />
      </svg>

      <span className="text-sm text-gray-700">{label}</span>
    </div>
  );
}
