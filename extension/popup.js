// popup.js — final (v1 UMD supabase)
/*
  Requires:
  - libs/supabase.min.js loaded from popup.html BEFORE this file
  - chrome.storage.local must contain TXI_ADMIN_ID (set by admin dashboard)
  - content script should listen for TXI_INJECT_STUDENT messages
*/

const SUPABASE_URL = "https://igfnrntcwzotligxdslf.supabase.co"; // <- replace if needed
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZm5ybnRjd3pvdGxpZ3hkc2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODQ3ODksImV4cCI6MjA3MjY2MDc4OX0.91dJ2m8wlohXfMaTJnGsxzuLp5-ZK8AvyEPnqyiabmM"; // <- replace if needed

// UI nodes (assumes these IDs exist in popup.html)
const statusDiv = document.getElementById("status");
const select = document.getElementById("studentSelect");
const injectBtn = document.getElementById("injectBtn");
const infoDiv = document.getElementById("info");

// Small helpers
const setStatus = (text) => {
  if (statusDiv) statusDiv.innerText = text;
  console.log("Popup status:", text);
};

const getProfileFromJoin = (bundle) => {
  // When using PostgREST joins, "profiles" can be an array (or object). normalize it.
  const p = bundle.profiles;
  if (!p) return null;
  return Array.isArray(p) ? p[0] || null : p;
};

// Ensure supabase lib is available
if (!window.supabase || typeof window.supabase.createClient !== "function") {
  setStatus("❌ Supabase library missing (libs/supabase.min.js).");
  console.error("window.supabase missing or wrong build. Check libs/supabase.min.js load order.");
} else {
  setStatus("Checking login...");
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Main flow
  (async function main() {
    try {
      // Read admin id from chrome.storage (set by the dashboard)
      chrome.storage.local.get(["TXI_ADMIN_ID"], async (res) => {
        const adminId = res?.TXI_ADMIN_ID;
        console.log("chrome.storage.local TXI_ADMIN_ID =>", adminId);

        if (!adminId) {
          setStatus("❌ Not logged in. Open the admin dashboard first.");
          return;
        }

        // v1: check session via supabase.auth.session()
        try {
          const session = supabase.auth.session();
          if (session) {
            console.log("Supabase session (popup):", session);
            setStatus(`✅ Logged in as admin: ${adminId.slice(0, 8)}...`);
          } else {
            // Note: dashboard may set chrome.storage without sharing the Supabase session; that's expected in local dev
            setStatus(`✅ Admin detected: ${adminId.slice(0, 8)}... (no Supabase session on this domain)`);
          }
        } catch (e) {
          console.warn("Could not read supabase session (v1 API). Proceeding with adminId anyway.", e);
        }

        // Query active bundles assigned to admin
        setStatus("Loading active bundles...");
        try {
          const { data: bundles, error } = await supabase
            .from("application_bundles")
            .select(`
              id,
              bundle_ref,
              status,
              user_id,
              profiles!user_id (
                full_name,
                email,
                phone,
                school,
                gpa,
                sat_score,
                act_score,
                address,
                city,
                state,
                zip
              )
            `)
            .eq("assigned_admin_id", adminId)
            .in("status", ["in_progress", "action_required"]);

          if (error) {
            console.error("Error fetching bundles:", error);
            setStatus("❌ Error fetching bundles — check console.");
            return;
          }

          if (!bundles || bundles.length === 0) {
            setStatus("ℹ️ No active bundles assigned.");
            return;
          }

          // Populate dropdown
          select.innerHTML = '<option value="">Select a student</option>';
          bundles.forEach((b, idx) => {
            const p = getProfileFromJoin(b) || {};
            const opt = document.createElement("option");
            opt.value = idx;
            opt.textContent = `${p.full_name || "Unknown"} — ${b.bundle_ref}`;
            select.appendChild(opt);
          });
          select.style.display = "block";
          injectBtn.style.display = "block";
          setStatus(`✅ ${bundles.length} active bundle(s) loaded.`);

          // Keep selected bundle state
          let selectedBundle = null;

          select.addEventListener("change", (e) => {
            const idx = e.target.value;
            if (idx === "") {
              selectedBundle = null;
              infoDiv.innerText = "Select a student to see details.";
              return;
            }
            selectedBundle = bundles[idx];
            const p = getProfileFromJoin(selectedBundle) || {};
            infoDiv.innerHTML = `
              <strong>${p.full_name || "N/A"}</strong><br>
              📧 ${p.email || "N/A"}<br>
              📱 ${p.phone || "N/A"}<br>
              🏫 ${p.school || "N/A"}<br>
              GPA: ${p.gpa ?? "N/A"} | SAT: ${p.sat_score ?? "N/A"} | ACT: ${p.act_score ?? "N/A"}<br>
              <small>Bundle: ${selectedBundle.bundle_ref} (${selectedBundle.status})</small>
            `;
          });

          injectBtn.addEventListener("click", async () => {
            if (!selectedBundle) {
              alert("Please select a student first.");
              return;
            }

            // Find active tab and send message to content script
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
              alert("No active tab found.");
              return;
            }

            const profile = getProfileFromJoin(selectedBundle) || {};

            chrome.tabs.sendMessage(
              tab.id,
              {
                type: "TXI_INJECT_STUDENT",
                student: profile,
                bundleRef: selectedBundle.bundle_ref,
              },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.error("Message send error:", chrome.runtime.lastError);
                  alert("Could not contact the page. Try refreshing the page where you want to inject.");
                } else {
                  infoDiv.innerText = `✅ Injected ${profile.full_name || "student"} data`;
                  setTimeout(() => window.close(), 1200);
                }
              }
            );
          });
        } catch (err) {
          console.error("Failed to load bundles:", err);
          setStatus("❌ Error loading bundles — see console.");
        }
      });
    } catch (err) {
      console.error("Unexpected error in popup main:", err);
      setStatus("❌ Unexpected popup error.");
    }
  })();
}
