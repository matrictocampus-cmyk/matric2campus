// src/pages/Admin/Notifications.jsx
import { Bell, CheckCircle, AlertCircle, Info, Send } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function Notifications() {
  const [users, setUsers] = useState([]);
  const [recipientId, setRecipientId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");

  // Recent sent notifications log
  const [sentLog, setSentLog] = useState([]);

  useEffect(() => {
    // Load profiles for user selection
    supabase
      .from("profiles")
      .select("user_id, full_name, email, first_name, last_name")
      .order("full_name")
      .limit(200)
      .then(({ data }) => setUsers(data || []));

    // Load recently sent admin-initiated notifications
    supabase
      .from("notifications")
      .select("id, user_id, title, message, type, created_at")
      .eq("title", "Message from Matric2Campus Team")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setSentLog(data || []));
  }, []);

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    return !q
      || (u.full_name || "").toLowerCase().includes(q)
      || (u.email || "").toLowerCase().includes(q);
  });

  const handleSend = async () => {
    if (!recipientId || !title.trim() || !message.trim()) return;
    setSending(true); setSendError(""); setSent(false);
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: recipientId,
        title: title.trim(),
        message: message.trim(),
        type: "info",
      });
      if (error) throw error;
      setSent(true);
      setSentLog(prev => [{ id: Date.now(), user_id: recipientId, title, message, type: "info", created_at: new Date().toISOString() }, ...prev]);
      setTitle(""); setMessage(""); setRecipientId(""); setUserSearch("");
    } catch (err) {
      setSendError("Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const getIcon = (type) => {
    if (type === "success") return CheckCircle;
    if (type === "warning") return AlertCircle;
    return Info;
  };

  const getColor = (type) => {
    if (type === "success") return "text-green-600 bg-green-100";
    if (type === "warning") return "text-yellow-600 bg-yellow-100";
    return "text-blue-600 bg-blue-100";
  };

  const selectedUser = users.find(u => u.user_id === recipientId);

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Send Notification to Student</h1>
        <p className="text-gray-600 mt-1">Messages appear in the student's notification bell in real-time.</p>
      </div>

      {/* Compose form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl space-y-4">
        {/* Recipient search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Recipient student</label>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={userSearch}
            onChange={e => { setUserSearch(e.target.value); setRecipientId(""); }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {userSearch && !recipientId && filteredUsers.length > 0 && (
            <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-md max-h-48 overflow-y-auto">
              {filteredUsers.slice(0, 20).map(u => (
                <div
                  key={u.user_id}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                  onClick={() => { setRecipientId(u.user_id); setUserSearch(u.full_name || u.email || ""); }}
                >
                  <div className="font-medium">{u.full_name || "(no name)"}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </div>
              ))}
            </div>
          )}
          {selectedUser && (
            <p className="text-xs text-green-700 mt-1">✓ {selectedUser.full_name} &lt;{selectedUser.email}&gt;</p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            placeholder="e.g. Important Update"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            rows={4}
            placeholder="Type your message to the student…"
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {sendError && <p className="text-sm text-red-600">{sendError}</p>}
        {sent && <p className="text-sm text-green-700 font-medium">✅ Notification sent successfully!</p>}

        <button
          onClick={handleSend}
          disabled={!recipientId || !title.trim() || !message.trim() || sending}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          {sending ? "Sending…" : "Send Notification"}
        </button>
      </div>

      {/* Sent log */}
      {sentLog.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-w-2xl">
          <div className="px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-900">Recently Sent Messages</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {sentLog.map(n => {
              const Icon = getIcon(n.type);
              return (
                <div key={n.id} className="flex items-start gap-3 px-4 py-3">
                  <div className={`p-1.5 rounded-lg ${getColor(n.type)}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString("en-ZA")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
