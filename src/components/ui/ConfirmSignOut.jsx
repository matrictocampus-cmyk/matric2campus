import React from "react";
import Button from "./Button";

/**
 * ConfirmSignOut
 * - open: boolean (show/hide)
 * - onConfirm: function (called when user confirms sign out)
 * - onCancel: function (called when user cancels)
 */
export default function ConfirmSignOut({ open, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-80">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Confirm Sign Out</h3>
        <p className="text-sm text-gray-600 mb-6">Are you sure you want to sign out?</p>

        <div className="flex justify-end gap-3">
          <Button
            onClick={onCancel}
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-black"
          >
            No
          </Button>

          <Button
            onClick={onConfirm}
            className="px-3 py-2 bg-[#39FF14] hover:bg-[#32cc0f] text-black font-semibold"
          >
            Yes, Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
