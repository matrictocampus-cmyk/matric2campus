// Listen for the custom event from the dashboard to store admin ID
window.addEventListener("TXI_ADMIN_SESSION", (event) => {
  const adminId = event.detail?.id;
  if (adminId) {
    chrome.storage.local.set({ TXI_ADMIN_ID: adminId }, () => {
      console.log("Admin ID saved to chrome.storage:", adminId);
    });
  }
});

// Listen for injection messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "TXI_INJECT_STUDENT") {
    const student = request.student;
    let filledCount = 0;

    // Common field mappings – add more selectors as needed
    const fields = [
      { sel: 'input[name*="first"]', val: student.full_name?.split(" ")[0] || "" },
      { sel: 'input[name*="last"]', val: student.full_name?.split(" ").slice(1).join(" ") || "" },
      { sel: 'input[name*="fullname"], input[name*="name"]', val: student.full_name || "" },
      { sel: 'input[type="email"], input[name*="email"]', val: student.email || "" },
      { sel: 'input[type="tel"], input[name*="phone"]', val: student.phone || "" },
      { sel: 'input[name*="school"], input[name*="university"]', val: student.school || "" },
      { sel: 'input[name*="gpa"]', val: student.gpa || "" },
      { sel: 'input[name*="sat"]', val: student.sat_score || "" },
      { sel: 'input[name*="act"]', val: student.act_score || "" },
    ];

    fields.forEach(({ sel, val }) => {
      if (!val) return;
      document.querySelectorAll(sel).forEach((el) => {
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
          el.value = val;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          filledCount++;
        }
      });
    });

    // Show a small notification
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 9999;
      font-family: sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    notification.innerText = `✅ Injected ${student.full_name || "student"} data (${filledCount} fields)`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);

    sendResponse({ success: true, filled: filledCount });
  }
  return true; // Keep the message channel open for async response
});

console.log("TXI content script loaded");