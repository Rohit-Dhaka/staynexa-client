import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import Modal from "../../../components/common/Modal";
import ExportButtons from "../../../components/common/ExportButtons";
import { cancelLeave, listLeaves } from "../services/attendance.service";
import { LeaveStatusChip } from "../components/AttendanceChip";
import LeaveApplyModal from "../components/LeaveApplyModal";
import LeaveReviewModal from "../components/LeaveReviewModal";
import { ErrorBox, ModalFooter, inputClass } from "../../bookings/components/formUi";
import {
  formatDay,
  formatUnits,
  getErrorMessage,
  leaveTypeLabel,
} from "../../../utils/attendanceUi";
import { fetchAllPages } from "../../../utils/exportUtils";

const Leaves = () => {
  const { user } = useAuth();
  const myId = String(user?._id || user?.id);
  const isManager = [ROLES.SUPER_ADMIN, ROLES.MANAGER].includes(user?.role);

  const [status, setStatus] = useState(isManager ? "pending" : "");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({
    items: [],
    total: 0,
    page: 1,
    pages: 1,
    counts: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const [applying, setApplying] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const params = { page, limit: 15 };
    if (status) params.status = status;

    listLeaves(params)
      .then((res) => {
        if (!cancelled) {
          setData({
            items: Array.isArray(res?.items) ? res.items : [],
            total: Number(res?.total || 0),
            page: Number(res?.page || page),
            pages: Math.max(1, Number(res?.pages || 1)),
            counts: res?.counts || {},
          });
        }
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [status, page, reload]);

  const refresh = () => setReload((n) => n + 1);

  const getExportRows = async () => {
    const params = {};
    if (status) params.status = status;

    return fetchAllPages(
      ({ page: exportPage, limit }) =>
        listLeaves({ ...params, page: exportPage, limit }),
      { limit: 100 }
    );
  };

  const exportColumns = [
    { header: "Request ID", value: (item) => item.requestNumber || item._id || "-" },
    ...(isManager
      ? [{ header: "Staff Member", value: (item) => item.user?.name || "-" }]
      : []),
    { header: "Leave Type", value: (item) => leaveTypeLabel(item.requestedType) },
    { header: "From Date", value: (item) => formatDay(item.fromDateKey) },
    { header: "To Date", value: (item) => formatDay(item.toDateKey) },
    { header: "Duration", value: (item) => formatUnits(item.totalUnits) },
    { header: "Approved Units", value: (item) => formatUnits(item.approvedUnits ?? 0) },
    { header: "Paid Units", value: (item) => formatUnits(item.paidUnits ?? 0) },
    { header: "Unpaid Units", value: (item) => formatUnits(item.unpaidUnits ?? 0) },
    { header: "Status", value: (item) => item.status || "-" },
    { header: "Reason", value: (item) => item.reason || "-" },
    { header: "Review Remarks", value: (item) => item.reviewRemarks || item.managerRemarks || "-" },
  ];

  const canCancel = (item) => {
    const owner = String(item.user?._id || item.user) === myId;
    if (item.status === "pending") return owner || isManager;
    if (["approved", "partially_approved"].includes(item.status)) return isManager;
    return false;
  };

  const submitCancel = async () => {
    if (!cancelling) return;
    const needsReason = cancelling.status !== "pending";
    if (needsReason && !cancelReason.trim()) {
      setCancelError("Enter a cancellation reason.");
      return;
    }

    setCancelBusy(true);
    setCancelError("");
    try {
      await cancelLeave(cancelling._id, { reason: cancelReason.trim() });
      setCancelling(null);
      setCancelReason("");
      refresh();
    } catch (err) {
      setCancelError(getErrorMessage(err));
    } finally {
      setCancelBusy(false);
    }
  };

  const tabs = [
    { value: "pending", label: "Pending", count: data.counts?.pending },
    { value: "", label: "All Requests" },
    { value: "approved,partially_approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const renderActions = (item, mobile = false) => (
    <div className={`flex gap-2 ${mobile ? "w-full flex-col sm:flex-row" : "justify-end"}`}>
      <button
        type="button"
        onClick={() => setViewing(item)}
        className="rounded border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
      >
        {isManager && item.status === "pending" ? "Review Request" : "View Details"}
      </button>
      {canCancel(item) && (
        <button
          type="button"
          onClick={() => {
            setCancelling(item);
            setCancelReason("");
            setCancelError("");
          }}
          className="rounded border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600"
        >
          Cancel Request
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-slate-900">Leave Management</h2>
          <p className="mt-1 text-sm text-slate-500">
            {isManager
              ? "Review, approve, or reject leave requests."
              : "View and manage your leave requests."}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {!isManager && (
            <button
              type="button"
              onClick={() => setApplying(true)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus size={16} />
              Apply for Leave
            </button>
          )}
          <ExportButtons
            title="Leave Management"
            fileName="leave-requests"
            columns={exportColumns}
            getRows={getExportRows}
          />
        </div>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {tabs.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => {
              setStatus(t.value);
              setPage(1);
            }}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
              status === t.value
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {t.label}
            {isManager && t.count > 0 ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      )}

      {loading && (
        <div className="flex justify-center rounded border border-slate-200 bg-white py-12 text-slate-400">
          <Loader2 size={22} />
        </div>
      )}

      {!loading && data.items.length === 0 && (
        <div className="rounded border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
          No leave requests found.
        </div>
      )}

      {!loading && data.items.length > 0 && (
        <>
          
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {data.items.map((item) => (
              <article key={item._id} className="min-w-0 rounded border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-900">
                      {item.requestNumber || "Leave Request"}
                    </p>
                    {isManager && (
                      <p className="mt-1 truncate text-sm text-slate-600">{item.user?.name || "Unknown staff member"}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <LeaveStatusChip status={item.status} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Leave Type</p>
                    <p className="mt-1 break-words text-sm font-medium text-slate-800">{leaveTypeLabel(item.requestedType)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Duration</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{formatUnits(item.totalUnits)}</p>
                    {item.approvedUnits > 0 && (
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Paid: {formatUnits(item.paidUnits)} · Unpaid: {formatUnits(item.unpaidUnits)}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2 min-w-0">
                    <p className="text-xs text-slate-500">Dates</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {formatDay(item.fromDateKey)}
                      {item.toDateKey !== item.fromDateKey && ` to ${formatDay(item.toDateKey)}`}
                    </p>
                  </div>
                  {item.reason && (
                    <div className="col-span-2 min-w-0">
                      <p className="text-xs text-slate-500">Reason</p>
                      <p className="mt-1 break-words text-sm text-slate-700">{item.reason}</p>
                    </div>
                  )}
                  {(item.reviewRemarks || item.managerRemarks) && (
                    <div className="col-span-2 min-w-0">
                      <p className="text-xs text-slate-500">Review Remarks</p>
                      <p className="mt-1 break-words text-sm text-slate-700">{item.reviewRemarks || item.managerRemarks}</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  {renderActions(item, true)}
                </div>
              </article>
            ))}
          </div>

          
          <div className="hidden overflow-x-auto rounded border border-slate-200 bg-white lg:block">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Request ID</th>
                  {isManager && <th className="px-4 py-3">Staff Member</th>}
                  <th className="px-4 py-3">Leave Type</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item._id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{item.requestNumber}</p>
                      <p className="max-w-[200px] truncate text-xs text-slate-500">{item.reason}</p>
                    </td>
                    {isManager && <td className="px-4 py-3">{item.user?.name || "-"}</td>}
                    <td className="px-4 py-3">{leaveTypeLabel(item.requestedType)}</td>
                    <td className="px-4 py-3">
                      {formatDay(item.fromDateKey)}
                      {item.toDateKey !== item.fromDateKey && <span className="text-slate-400"> to </span>}
                      {item.toDateKey !== item.fromDateKey && formatDay(item.toDateKey)}
                    </td>
                    <td className="px-4 py-3">
                      {formatUnits(item.totalUnits)}
                      {item.approvedUnits > 0 && (
                        <p className="text-xs text-slate-500">
                          Paid: {formatUnits(item.paidUnits)}, Unpaid: {formatUnits(item.unpaidUnits)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3"><LeaveStatusChip status={item.status} /></td>
                    <td className="px-4 py-3">{renderActions(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex flex-col gap-3 rounded border border-slate-200 bg-white p-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-center sm:text-left">
          Page {data.page} of {data.pages} ({data.total} requests)
        </span>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            className="inline-flex items-center justify-center gap-1 rounded border border-slate-300 bg-white px-3 py-2 disabled:opacity-40"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <button
            type="button"
            disabled={page >= data.pages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center justify-center gap-1 rounded border border-slate-300 bg-white px-3 py-2 disabled:opacity-40"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {applying && (
        <LeaveApplyModal
          onClose={() => setApplying(false)}
          onDone={() => {
            setApplying(false);
            refresh();
          }}
        />
      )}

      {viewing && (
        <LeaveReviewModal
          leaveId={viewing._id}
          canReview={isManager}
          onClose={() => setViewing(null)}
          onDone={() => {
            setViewing(null);
            refresh();
          }}
        />
      )}

      <Modal
        open={Boolean(cancelling)}
        size="sm"
        title="Cancel Leave Request"
        subtitle={cancelling?.requestNumber}
        onClose={() => setCancelling(null)}
        busy={cancelBusy}
        footer={
          <ModalFooter
            onCancel={() => setCancelling(null)}
            onConfirm={submitCancel}
            confirmText="Confirm Cancellation"
            busy={cancelBusy}
            danger
          />
        }
      >
        <ErrorBox message={cancelError} />
        {cancelling && cancelling.status !== "pending" && (
          <p className="mb-3 text-sm text-slate-500">
            Cancelling this request will restore the leave balance and remove attendance records for the affected days.
          </p>
        )}
        <textarea
          rows="3"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder={cancelling?.status === "pending" ? "Enter a reason (optional)" : "Enter a reason (required)"}
          className={inputClass}
        />
      </Modal>
    </div>
  );
};

export default Leaves;
