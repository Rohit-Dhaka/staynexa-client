import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Play,
  ShieldCheck,
  UserPlus,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import useAuth from "../../../hooks/useAuth";
import Modal from "../../../components/common/Modal";
import { Skeleton } from "../../../components/common/Skeleton";
import {
  assignTask,
  getAssignableStaff,
  getTask,
  inspectTask,
  updateChecklistItem,
  updateTaskStatus,
} from "../services/housekeeping.service";
import {
  MANAGEMENT_ROLES,
  PRIORITY_BADGE,
  STATUS_META,
  TASK_TYPE_OPTIONS,
  checklistProgress,
  formatDateTime,
  getErrorMessage,
  isOverdue,
  labelFor,
  shortTaskNumber,
} from "../housekeeping.utils";

const BACK_PATH = "/housekeeping";

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60";

const labelClass = "mb-1.5 block text-xs font-medium text-slate-700";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded bg-[#1a1a1a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60";

const outlineButton =
  "inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

const dangerButton =
  "inline-flex items-center justify-center gap-2 rounded border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60";

const ModalActions = ({
  onCancel,
  onConfirm,
  confirmText,
  busy,
  disabled = false,
  danger = false,
}) => (
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

const Card = ({ title, children }) => (
  <section className="rounded border border-slate-200 bg-white p-5">
    <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
    {children}
  </section>
);

const DetailRow = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4 py-2 text-sm">
    <dt className="shrink-0 text-slate-500">{label}</dt>
    <dd className="min-w-0 break-words text-right font-medium text-slate-900">
      {children || "-"}
    </dd>
  </div>
);

const NoteBlock = ({ title, text }) =>
  text ? (
    <Card title={title}>
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{text}</p>
    </Card>
  ) : null;

const DetailSkeleton = () => (
  <div className="max-w-6xl space-y-6">
    <Skeleton className="h-4 w-40" />
    <Skeleton className="h-8 w-72" />
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Skeleton className="h-72 lg:col-span-2" />
      <Skeleton className="h-72" />
    </div>
  </div>
);

const HousekeepingDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const canManage = MANAGEMENT_ROLES.includes(user?.role);
  const myId = String(user?._id || user?.id || "");

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [busy, setBusy] = useState("");
  const [togglingId, setTogglingId] = useState("");
  const [modal, setModal] = useState(null);

  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState(false);
  const [assignedTo, setAssignedTo] = useState("");

  const [cancelReason, setCancelReason] = useState("");
  const [completeNotes, setCompleteNotes] = useState("");
  const [maintenanceDetails, setMaintenanceDetails] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState("");

  const load = useCallback(
    async ({ silent = false } = {}) => {
      
      if (!id || id === "undefined" || id === "new") {
        setTask(null);
        setLoadError("Invalid task ID. Please open a valid housekeeping task.");
        setLoading(false);
        return;
      }

      if (!silent) setLoading(true);

      try {
        const data = await getTask(id);
        setTask(data?.task || data);
        setLoadError("");
      } catch (error) {
        if (silent) {
          toast.error(getErrorMessage(error, "Could not refresh the task"));
        } else {
          setLoadError(getErrorMessage(error, "Could not load this task"));
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  const run = async (key, action, successMessage) => {
    setBusy(key);

    try {
      await action();
      toast.success(successMessage);
      setModal(null);
      await load({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy("");
    }
  };

  const handleStart = () =>
    run("start", () => updateTaskStatus(task._id, "in_progress"), "Task started");

  const openAssign = async () => {
    setAssignedTo(task.assignedTo?._id || "");
    setModal("assign");

    if (staffList.length > 0 || staffLoading) return;

    setStaffLoading(true);
    try {
      const value = await getAssignableStaff();
      setStaffList(Array.isArray(value) ? value : value?.staff || []);
      setStaffError(false);
    } catch {
      setStaffError(true);
    } finally {
      setStaffLoading(false);
    }
  };

  const handleAssign = () => {
    if (!assignedTo) {
      toast.error("Select a staff member");
      return;
    }
    run("assign", () => assignTask(task._id, assignedTo), "Task assigned");
  };

  const openCancel = () => {
    setCancelReason("");
    setModal("cancel");
  };

  const handleCancel = () => {
    if (!cancelReason.trim()) {
      toast.error("Enter a reason for cancelling this task");
      return;
    }
    run(
      "cancel",
      () => updateTaskStatus(task._id, "cancelled", { cancellationReason: cancelReason.trim() }),
      "Task cancelled"
    );
  };

  const openComplete = () => {
    setCompleteNotes("");
    setMaintenanceDetails(task.maintenanceDetails || "");
    setModal("complete");
  };

  const handleComplete = () => {
    const details = {};
    if (completeNotes.trim()) details.notes = completeNotes.trim();
    if (task.taskType === "maintenance" && maintenanceDetails.trim()) {
      details.maintenanceDetails = maintenanceDetails.trim();
    }
    run("complete", () => updateTaskStatus(task._id, "completed", details), "Task marked as completed");
  };

  const openInspect = () => {
    setInspectionNotes("");
    setModal("inspect");
  };

  const handleInspect = () =>
    run("inspect", () => inspectTask(task._id, inspectionNotes.trim()), "Task inspected");

  const toggleItem = async (item) => {
    if (togglingId) return;

    setTogglingId(item._id);
    try {
      await updateChecklistItem(task._id, item._id, !item.isCompleted);
      await load({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setTogglingId("");
    }
  };

  if (loading) return <DetailSkeleton />;

  if (loadError || !task) {
    return (
      <div className="max-w-xl space-y-4">
        <Link
          to={BACK_PATH}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Housekeeping
        </Link>
        <p className="rounded bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {loadError || "Task not found"}
        </p>
      </div>
    );
  }

  const statusMeta = STATUS_META[task.status];
  const progress = checklistProgress(task);
  const overdue = isOverdue(task);
  const checklist = task.checklist || [];

  const isAssignee = Boolean(task.assignedTo) && String(task.assignedTo._id) === myId;
  const canWork = isAssignee || canManage;
  const checklistDone = progress.total === 0 || progress.done === progress.total;

  const canAssign = canManage && ["pending", "assigned"].includes(task.status);
  const canStart = canWork && task.status === "assigned";
  const canComplete = canWork && task.status === "in_progress";
  const canInspect = canManage && task.status === "completed";
  const canCancel = canManage && !["completed", "inspected", "cancelled"].includes(task.status);
  const canTick = canWork && task.status === "in_progress";
  const hasActions = canAssign || canStart || canComplete || canInspect || canCancel;

  const timeline = [
    { label: "Created", value: task.createdAt },
    { label: "Assigned", value: task.assignedAt },
    { label: "Started", value: task.startedAt },
    { label: "Completed", value: task.completedAt },
    { label: "Inspected", value: task.inspectedAt },
    { label: "Cancelled", value: task.cancelledAt },
  ].filter((entry) => entry.value);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link
          to={BACK_PATH}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Housekeeping
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900">
            {labelFor(TASK_TYPE_OPTIONS, task.taskType)}
          </h1>
          <span
            className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
              statusMeta?.badge || "bg-slate-100 text-slate-600"
            }`}
          >
            {statusMeta?.label || task.status}
          </span>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${
              PRIORITY_BADGE[task.priority] || "bg-slate-100 text-slate-600"
            }`}
          >
            {task.priority} priority
          </span>
          {overdue && (
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
              Overdue
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">{shortTaskNumber(task.taskNumber)}</p>
      </div>

      {hasActions && (
        <div className="flex flex-wrap gap-2">
          {canStart && (
            <button type="button" onClick={handleStart} disabled={busy === "start"} className={primaryButton}>
              {busy === "start" ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              Start Task
            </button>
          )}

          {canComplete && (
            <button
              type="button"
              onClick={openComplete}
              disabled={!checklistDone}
              title={checklistDone ? "" : "Complete every checklist step first"}
              className={primaryButton}
            >
              <CheckCircle2 size={16} />
              Mark as Completed
            </button>
          )}

          {canInspect && (
            <button type="button" onClick={openInspect} className={primaryButton}>
              <ShieldCheck size={16} />
              Inspect Task
            </button>
          )}

          {canAssign && (
            <button type="button" onClick={openAssign} className={outlineButton}>
              <UserPlus size={16} />
              {task.assignedTo ? "Reassign" : "Assign Staff"}
            </button>
          )}

          {canCancel && (
            <button type="button" onClick={openCancel} className={dangerButton}>
              <XCircle size={16} />
              Cancel Task
            </button>
          )}
        </div>
      )}

      {canComplete && !checklistDone && (
        <p className="rounded bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Complete every checklist step before marking this task as completed.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Checklist">
            {checklist.length === 0 ? (
              <p className="text-sm text-slate-500">This task has no checklist steps.</p>
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>
                      {progress.done} of {progress.total} steps done
                    </span>
                    <span>{progress.percent}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>

                <ul className="space-y-2">
                  {checklist.map((item) => (
                    <li key={item._id}>
                      <label
                        className={`flex items-center gap-3 rounded border px-3 py-2.5 text-sm transition ${
                          item.isCompleted
                            ? "border-emerald-200 bg-emerald-50/60"
                            : "border-slate-200 bg-white"
                        } ${canTick ? "cursor-pointer hover:border-slate-300" : "cursor-default"}`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(item.isCompleted)}
                          disabled={!canTick || togglingId === item._id}
                          onChange={() => toggleItem(item)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span
                          className={`min-w-0 flex-1 break-words ${
                            item.isCompleted ? "text-slate-500 line-through" : "text-slate-800"
                          }`}
                        >
                          {item.title}
                        </span>
                        {togglingId === item._id && (
                          <Loader2 size={14} className="animate-spin text-slate-400" />
                        )}
                      </label>
                    </li>
                  ))}
                </ul>

                {!canTick && task.status === "assigned" && (
                  <p className="mt-3 text-xs text-slate-500">
                    Start the task to tick off the checklist steps.
                  </p>
                )}
              </>
            )}
          </Card>

          <NoteBlock title="Notes" text={task.notes} />
          <NoteBlock title="Maintenance Details" text={task.maintenanceDetails} />
          <NoteBlock title="Inspection Notes" text={task.inspectionNotes} />
          <NoteBlock title="Cancellation Reason" text={task.cancellationReason} />
        </div>

        <div className="space-y-5">
          <Card title="Details">
            <dl className="divide-y divide-slate-100">
              <DetailRow label="Location">
                {task.room ? `Room ${task.room.roomNumber} (Floor ${task.room.floor ?? "-"})` : task.area}
              </DetailRow>
              <DetailRow label="Scheduled">{formatDateTime(task.scheduledAt)}</DetailRow>
              <DetailRow label="Assigned to">
                {task.assignedTo ? (
                  <span>
                    {task.assignedTo.name}
                    {task.assignedTo.email && (
                      <span className="block text-xs font-normal text-slate-500">{task.assignedTo.email}</span>
                    )}
                  </span>
                ) : (
                  <span className="font-normal text-slate-400">Unassigned</span>
                )}
              </DetailRow>
              <DetailRow label="Created by">{task.createdBy?.name}</DetailRow>
              {task.inspectedBy?.name && <DetailRow label="Inspected by">{task.inspectedBy.name}</DetailRow>}
            </dl>
          </Card>

          <Card title="Timeline">
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-500">No activity yet.</p>
            ) : (
              <ol className="space-y-3">
                {timeline.map((entry) => (
                  <li key={entry.label} className="flex items-start gap-3 text-sm">
                    <ClipboardCheck size={16} className="mt-0.5 shrink-0 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-800">{entry.label}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(entry.value)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={modal === "assign"}
        size="sm"
        title={task.assignedTo ? "Reassign Task" : "Assign Task"}
        subtitle={shortTaskNumber(task.taskNumber)}
        onClose={() => setModal(null)}
        busy={busy === "assign"}
        footer={
          <ModalActions
            onCancel={() => setModal(null)}
            onConfirm={handleAssign}
            confirmText="Assign"
            busy={busy === "assign"}
            disabled={staffLoading || staffError}
          />
        }
      >
        {staffLoading ? (
          <div className="flex justify-center py-6 text-slate-400">
            <Loader2 className="animate-spin" />
          </div>
        ) : staffError ? (
          <p className="rounded bg-rose-50 px-3 py-2 text-sm text-rose-600">
            Could not load the staff list. Please try again.
          </p>
        ) : (
          <div>
            <label htmlFor="assignedTo" className={labelClass}>
              Staff member <span className="text-rose-500">*</span>
            </label>
            <select
              id="assignedTo"
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
              className={inputClass}
            >
              <option value="">Select a staff member</option>
              {staffList.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name}
                  {member.designation ? ` - ${member.designation}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </Modal>

      <Modal
        open={modal === "cancel"}
        size="sm"
        title="Cancel Task"
        subtitle={shortTaskNumber(task.taskNumber)}
        onClose={() => setModal(null)}
        busy={busy === "cancel"}
        footer={
          <ModalActions
            onCancel={() => setModal(null)}
            onConfirm={handleCancel}
            confirmText="Cancel Task"
            busy={busy === "cancel"}
            danger
          />
        }
      >
        <label htmlFor="cancelReason" className={labelClass}>
          Reason <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="cancelReason"
          rows={3}
          maxLength={500}
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          placeholder="Why is this task being cancelled?"
          className={inputClass}
        />
      </Modal>

      <Modal
        open={modal === "complete"}
        size="md"
        title="Mark as Completed"
        subtitle={shortTaskNumber(task.taskNumber)}
        onClose={() => setModal(null)}
        busy={busy === "complete"}
        footer={
          <ModalActions
            onCancel={() => setModal(null)}
            onConfirm={handleComplete}
            confirmText="Mark as Completed"
            busy={busy === "complete"}
          />
        }
      >
        <div className="space-y-4">
          {task.taskType === "maintenance" && (
            <div>
              <label htmlFor="maintenanceDetails" className={labelClass}>
                Work done
              </label>
              <textarea
                id="maintenanceDetails"
                rows={3}
                maxLength={2000}
                value={maintenanceDetails}
                onChange={(event) => setMaintenanceDetails(event.target.value)}
                placeholder="Describe the repair that was carried out"
                className={inputClass}
              />
            </div>
          )}
          <div>
            <label htmlFor="completeNotes" className={labelClass}>
              Notes (optional)
            </label>
            <textarea
              id="completeNotes"
              rows={3}
              maxLength={2000}
              value={completeNotes}
              onChange={(event) => setCompleteNotes(event.target.value)}
              placeholder="Anything the inspector should know"
              className={inputClass}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={modal === "inspect"}
        size="sm"
        title="Inspect Task"
        subtitle={shortTaskNumber(task.taskNumber)}
        onClose={() => setModal(null)}
        busy={busy === "inspect"}
        footer={
          <ModalActions
            onCancel={() => setModal(null)}
            onConfirm={handleInspect}
            confirmText="Approve Inspection"
            busy={busy === "inspect"}
          />
        }
      >
        <label htmlFor="inspectionNotes" className={labelClass}>
          Inspection notes (optional)
        </label>
        <textarea
          id="inspectionNotes"
          rows={3}
          maxLength={2000}
          value={inspectionNotes}
          onChange={(event) => setInspectionNotes(event.target.value)}
          placeholder="e.g. Room is clean and ready for the next guest"
          className={inputClass}
        />
      </Modal>
    </div>
  );
};

export default HousekeepingDetail;