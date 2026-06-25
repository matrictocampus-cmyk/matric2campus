import React from "react";

export default function Button({ children, className = "", variant = "primary", ...props }) {
  const base = "px-4 py-2 rounded-lg shadow-md transition";

  const styles =
    variant === "secondary"
      ? "bg-[#0c0c0c] text-green-400 border border-green-500/40 hover:bg-green-500/10"
      : "bg-green-500 text-black hover:bg-green-400";

  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}
