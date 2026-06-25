import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Settings() {
  const navigate = useNavigate();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }

      const { error } = await supabase.rpc("delete_user_account");
      if (error) throw error;
      await supabase.auth.signOut();
      navigate("/");
    } catch (err) {
      console.error("Delete error:", err);
      setDeleteError("Could not delete your account. Please contact support@txi.ac.za");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Profile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
        <p className="text-gray-600 text-sm mt-1">Update your personal information and academic details.</p>
        <button
          onClick={() => navigate("/profile")}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          Edit Profile
        </button>
      </div>

      {/* Eligibility */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold text-gray-900">Eligibility</h2>
        <p className="text-gray-600 text-sm mt-1">Update your eligibility answers any time — this won't affect submitted applications.</p>
        <button
          onClick={() => navigate("/eligibility")}
          className="mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          Update Eligibility
        </button>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-5">
        <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
        <p className="text-gray-600 text-sm mt-1">
          Permanently delete your account and all your data. <strong>This cannot be undone.</strong>
        </p>

        {deleteError && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{deleteError}</p>
        )}

        {deleteConfirm && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm font-medium">Are you absolutely sure? All your applications and profile data will be permanently deleted.</p>
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {deleting ? "Deleting…" : deleteConfirm ? "Yes, delete my account" : "Delete Account"}
          </button>
          {deleteConfirm && (
            <button
              onClick={() => setDeleteConfirm(false)}
              className="border border-gray-300 text-gray-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
