
import { ATTENDANCE_META, LEAVE_STATUS_META } from "../../../utils/attendanceUi";

const base = "inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium";

export const StatusChip = ({ status }) => {
  const meta = ATTENDANCE_META[status] || ATTENDANCE_META.not_marked;
  return <span className={`${base} ${meta.chip}`}>{meta.label}</span>;
};

export const LeaveStatusChip = ({ status }) => {
  const meta = LEAVE_STATUS_META[status];
  return (
    <span className={`${base} ${meta?.chip || "bg-slate-100 text-slate-600"}`}>
      {meta?.label || String(status).replace(/_/g, " ")}
    </span>
  );
};