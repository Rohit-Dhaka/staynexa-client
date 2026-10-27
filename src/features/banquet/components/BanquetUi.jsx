import { Loader2 } from "lucide-react";

import {PAYMENT_STATUS_META,STATUS_META,labelClass,outlineButton,primaryButton,} from "../../../utils/banquet.utils";

export const Field = ({ label, required = false, hint, htmlFor, children }) => (
  <div>
    <label htmlFor={htmlFor} className={labelClass}>
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
    {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
  </div>
);

export const Card = ({ title, description, action, children }) => (
  <section className="rounded border border-slate-200 bg-white p-5 sm:p-6">
    {(title || action) && (
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
          {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </section>
);

export const ModalActions = ({ onCancel, onConfirm, confirmText, busy = false, disabled = false, danger = false }) => (
  <>
    <button type="button" onClick={onCancel} disabled={busy} className={outlineButton}>
      Cancel
    </button>
    <button
      type="button"
      onClick={onConfirm}
      disabled={busy || disabled}
      className={
        danger
          ? "inline-flex items-center justify-center gap-2 rounded bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          : primaryButton
      }
    >
      {busy && <Loader2 size={16} className="animate-spin" />}
      {confirmText}
    </button>
  </>
);

const badgeBase = "inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium";

export const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status];
  return <span className={`${badgeBase} ${meta?.badge || "bg-slate-100 text-slate-600"}`}>{meta?.label || status}</span>;
};

export const PaymentBadge = ({ status }) => {
  const meta = PAYMENT_STATUS_META[status];
  return <span className={`${badgeBase} ${meta?.badge || "bg-slate-100 text-slate-600"}`}>{meta?.label || status}</span>;
};