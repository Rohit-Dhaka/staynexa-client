import { Loader2 } from "lucide-react";

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
  </label>
);

export const ErrorBox = ({ message }) =>
  message ? <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{message}</p> : null;

export const NoteBox = ({ tone = "info", children }) => {
  const tones = {
    info: "bg-sky-50 text-sky-700",
    warn: "bg-amber-50 text-amber-700",
    danger: "bg-rose-50 text-rose-600",
  };
  return <div className={`mb-4 rounded-lg px-3 py-2.5 text-sm ${tones[tone]}`}>{children}</div>;
};

export const SectionTitle = ({ children, hint }) => (
  <div className="mb-3 mt-6 first:mt-0">
    <h4 className="text-sm font-semibold text-slate-900">{children}</h4>
    {hint && <p className="text-xs text-slate-500">{hint}</p>}
  </div>
);

export const ModalFooter = ({
  onCancel,
  onConfirm,
  confirmText = "Confirm",
  busy = false,
  disabled = false,
  danger = false,
}) => (
  <>
    <button
      type="button"
      onClick={onCancel}
      disabled={busy}
      className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
    >
      Cancel
    </button>
    <button
      type="button"
      onClick={onConfirm}
      disabled={busy || disabled}
      className={`flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
        danger ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"
      }`}
    >
      {busy && <Loader2 size={16} className="animate-spin" />}
      {confirmText}
    </button>
  </>
);