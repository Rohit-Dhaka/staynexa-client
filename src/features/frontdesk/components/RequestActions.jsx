import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const MAX_REPLY_LENGTH = 1000;


export default function RequestActions({ request, onSetStatus, onReply }) {
  const [status, setStatus] = useState(request.status);
  const [reply, setReply] = useState(request.adminReply || "");
  const [savingStatus, setSavingStatus] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState("");

  
  useEffect(() => {
    setStatus(request.status);
  }, [request.status]);

  useEffect(() => {
    setReply(request.adminReply || "");
  }, [request.adminReply]);

  const handleStatusChange = async (event) => {
    const next = event.target.value;
    const previous = status;

    setStatus(next);
    setSavingStatus(true);

    try {
      await onSetStatus(request, next);
    } catch {
      // The parent already shows the error toast; just roll back.
      setStatus(previous);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSendReply = async () => {
    const text = reply.trim();

    if (!text) {
      setReplyError("Please write a reply first.");
      return;
    }

    setReplyError("");
    setSending(true);

    try {
      await onReply(request, text);
    } catch {
      // The parent already shows the error toast.
    } finally {
      setSending(false);
    }
  };

  const replyChanged = reply.trim() !== (request.adminReply || "").trim();

  return (
    <div className="mt-3 space-y-3 rounded border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={`status-${request._id}`}
          className="text-xs font-medium text-slate-600"
        >
          Status
        </label>

        <select
          id={`status-${request._id}`}
          value={status}
          onChange={handleStatusChange}
          disabled={savingStatus}
          className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-500 disabled:opacity-60"
        >
          {STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {savingStatus && (
          <Loader2 size={14} className="animate-spin text-slate-400" />
        )}
      </div>

      <div>
        <label
          htmlFor={`reply-${request._id}`}
          className="text-xs font-medium text-slate-600"
        >
          Reply to guest
        </label>

        <textarea
          id={`reply-${request._id}`}
          value={reply}
          onChange={(event) => {
            setReply(event.target.value);
            setReplyError("");
          }}
          rows={2}
          maxLength={MAX_REPLY_LENGTH}
          placeholder="Write a reply for the guest..."
          className="mt-1 w-full resize-y rounded border border-slate-300 bg-white p-2 text-sm text-slate-800 outline-none focus:border-slate-500"
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            {request.repliedAt
              ? `Last replied: ${new Date(request.repliedAt).toLocaleString(
                  "en-IN",
                )}`
              : "Not replied yet"}
          </div>

          <button
            type="button"
            onClick={handleSendReply}
            disabled={sending || !replyChanged}
            className="flex items-center gap-1.5 rounded bg-black px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            {request.adminReply ? "Update reply" : "Send reply"}
          </button>
        </div>

        {replyError && (
          <p className="mt-1 text-xs text-red-600">{replyError}</p>
        )}
      </div>
    </div>
  );
}