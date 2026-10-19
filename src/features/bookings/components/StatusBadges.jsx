import { BOOKING_STATUS_META, PAYMENT_STATUS_META } from "../utils/bookingUi";

const base = "inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium";

export const BookingStatusBadge = ({ status }) => {
  const meta = BOOKING_STATUS_META[status];
  return (
    <span className={`${base} ${meta?.badge || "bg-slate-100 text-slate-600"}`}>
      {meta?.label || String(status || "-").replace(/_/g, " ")}
    </span>
  );
};

export const PaymentStatusBadge = ({ status }) => {
  const meta = PAYMENT_STATUS_META[status];
  return (
    <span className={`${base} ${meta?.badge || "bg-slate-100 text-slate-600"}`}>
      {meta?.label || String(status || "-").replace(/_/g, " ")}
    </span>
  );
};