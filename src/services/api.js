// src/services/api.js
import { supabase } from "../lib/supabase";

// submits an application object to the 'applications' table
export async function submitApplication(payload) {
  // payload should be an object matching your "applications" table columns
  // e.g. { student_id, course_id, cover_letter, answers, package_type, total }
  const { data, error } = await supabase
    .from("applications")
    .insert([payload]);

  if (error) {
    console.error("submitApplication error:", error);
    throw error;
  }
  return data;
}
