import React from "react";
import { useNavigate } from "react-router-dom";

export default function ActionCard() {
  const navigate = useNavigate();

  return (
    <div
      className="bg-[#0c0c0c] border border-green-500/40 rounded-2xl p-5 shadow-lg shadow-green-500/20 cursor-pointer
                 hover:bg-green-500/10 transition-all duration-200"
      onClick={() => navigate("/institutions")}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-green-400/80">Quick Actions</div>
          <div className="font-semibold text-white text-lg">
            Apply to Institutions
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate("/institutions");
          }}
          className="px-4 py-2 rounded-lg border border-green-500 text-green-400 
                     hover:bg-green-600/20 transition"
        >
          Browse
        </button>
      </div>
    </div>
  );
}
