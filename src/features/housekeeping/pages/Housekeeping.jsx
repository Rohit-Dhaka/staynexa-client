import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";

import useAuth from "../../../hooks/useAuth";
import { Skeleton, TableSkeleton } from "../../../components/common/Skeleton";
import ExportButtons from "../../../components/common/ExportButtons";
import { getTasks, getTasksSummary } from "../services/housekeeping.service";
import {
  MANAGEMENT_ROLES,
  PRIORITY_BADGE,
  PRIORITY_OPTIONS,
  STATUS_KEYS,
  STATUS_META,
  TASK_TYPE_OPTIONS,
  checklistProgress,
  formatDateTime,
  getErrorMessage,
  isOverdue,
  labelFor,
  shortTaskNumber,
} from "../housekeeping.utils";

const inputClass =
  "w-full min-w-0 rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:px-3.5 sm:py-2.5 sm:text-sm";

const primaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded bg-black px-3 py-2 text-xs font-semibold text-white transition sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm";

const getPayload = (response) => response?.data ?? response ?? {};

const getTaskRows = (payload) => {
  const rows = payload?.tasks ?? payload?.items ?? payload?.data?.tasks ?? [];
  return Array.isArray(rows) ? rows : [];
};

const getTaskTypeLabel = (value) =>
  labelFor(TASK_TYPE_OPTIONS, value) || value || "-";

const housekeepingExportColumns = [
  { header: "Task Number", value: (task) => shortTaskNumber(task?.taskNumber) || "-" },
  { header: "Task Type", value: (task) => getTaskTypeLabel(task?.taskType) },
  {
    header: "Location",
    value: (task) => task?.room ? `Room ${task.room.roomNumber ?? "-"}` : task?.area || "-",
  },
  { header: "Floor", value: (task) => task?.room?.floor ?? "-" },
  { header: "Priority", value: (task) => task?.priority || "-" },
  { header: "Status", value: (task) => STATUS_META[task?.status]?.label || task?.status || "-" },
  { header: "Assigned To", value: (task) => task?.assignedTo?.name || "Unassigned" },
  { header: "Assigned Email", value: (task) => task?.assignedTo?.email || "-" },
  { header: "Scheduled At", value: (task) => formatDateTime(task?.scheduledAt) },
  {
    header: "Checklist Progress",
    value: (task) => {
      const progress = checklistProgress(task);
      return progress.total ? `${progress.done}/${progress.total} (${progress.percent}%)` : "-";
    },
  },
  { header: "Overdue", value: (task) => (isOverdue(task) ? "Yes" : "No") },
];

const SummaryCards = ({ summary, activeStatus, onSelect }) => {
  const cards = [
    { key: "", label: "All Tasks", value: summary?.total },
    ...STATUS_KEYS.map((key) => ({
      key,
      label: STATUS_META[key]?.label || key,
      value: summary?.byStatus?.[key],
    })),
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
      {cards.map((card) => {
        const selected = activeStatus === card.key;
        return (
          <button
            key={card.key || "all"}
            type="button"
            onClick={() => onSelect(card.key)}
            aria-pressed={selected}
            className={`flex min-w-0 items-center justify-between gap-2 rounded border bg-white px-2.5 py-2.5 text-left transition sm:px-3 sm:py-3 ${
              selected ? "border-indigo-500 ring-2 ring-indigo-100" : "border-slate-200"
            }`}
          >
            <span className="min-w-0 truncate text-[11px] text-slate-500 sm:text-xs md:text-sm">
              {card.label}
            </span>
            {summary ? (
              <span className="shrink-0 text-xs font-bold text-slate-900 sm:text-sm">
                {card.value ?? 0}
              </span>
            ) : (
              <Skeleton className="h-4 w-7 shrink-0 sm:h-5 sm:w-8" />
            )}
          </button>
        );
      })}
    </div>
  );
};

const Pagination = ({ page, totalPages, total, onChange }) => {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <p className="text-[11px] text-slate-500 sm:text-xs">
        Page {page} of {totalPages} ({total} tasks)
      </p>
      <div className="flex gap-2 self-end sm:self-auto">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="rounded border border-slate-300 p-1.5 text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-40 sm:p-2"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="rounded border border-slate-300 p-1.5 text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-40 sm:p-2"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

const Housekeeping = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = MANAGEMENT_ROLES.includes(user?.role);

  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [taskType, setTaskType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const hasFilters = Boolean(status || priority || taskType || from || to);

  const buildTaskParams = useCallback(
    (requestedPage, limit = 10) => ({
      page: requestedPage,
      limit,
      status: status || undefined,
      priority: priority || undefined,
      taskType: taskType || undefined,
      from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
    }),
    [status, priority, taskType, from, to],
  );

  const loadSummary = useCallback(async () => {
    try {
      const response = await getTasksSummary();
      const payload = getPayload(response);
      setSummary(payload?.summary ?? payload);
    } catch {
      setSummary(null);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getTasks(buildTaskParams(page, 10));
      const payload = getPayload(response);
      const taskData = getTaskRows(payload);
      const safeTasks = taskData.filter((task) => task && (task._id || task.id));
      setTasks(safeTasks);
      setPagination(payload?.pagination ?? payload?.meta ?? {});
    } catch (error) {
      setTasks([]);
      setPagination({});
      toast.error(getErrorMessage(error, "Could not load tasks"));
    } finally {
      setLoading(false);
    }
  }, [buildTaskParams, page]);

  const getAllFilteredTasks = useCallback(async () => {
    const limit = 100;
    const allTasks = [];
    let currentPage = 1;
    let totalPages = 1;
    do {
      const response = await getTasks(buildTaskParams(currentPage, limit));
      const payload = getPayload(response);
      const pageTasks = getTaskRows(payload);
      allTasks.push(...pageTasks.filter((task) => task && (task._id || task.id)));
      const meta = payload?.pagination ?? payload?.meta ?? {};
      const reportedPages = Number(meta.totalPages ?? meta.pages ?? 1);
      totalPages = Number.isFinite(reportedPages) && reportedPages > 0 ? reportedPages : 1;
      currentPage += 1;
    } while (currentPage <= totalPages && currentPage <= 500);
    return allTasks;
  }, [buildTaskParams]);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => { loadSummary(); }, [loadSummary]);

  const changeFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  const selectStatus = (key) => {
    setStatus(key);
    setPage(1);
  };

  const clearFilters = () => {
    setStatus("");
    setPriority("");
    setTaskType("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const openNewTask = () => navigate("/housekeeping/new");
  const openTask = (task) => {
    const taskId = task?._id || task?.id;
    if (!taskId || taskId === "undefined" || taskId === "null") {
      toast.error("This task does not have a valid ID. Please refresh the list.");
      return;
    }
    navigate(`/housekeeping/${encodeURIComponent(taskId)}`);
  };

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-slate-900 sm:text-xl">Housekeeping</h1>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 sm:text-sm">
            {canManage
              ? "Create cleaning and maintenance tasks, assign them to staff and inspect the work."
              : "Your assigned cleaning and maintenance tasks."}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:self-auto">
          <ExportButtons
            title="Housekeeping Tasks"
            fileName="housekeeping-tasks"
            columns={housekeepingExportColumns}
            getRows={getAllFilteredTasks}
          />
          {canManage && (
            <button type="button" onClick={openNewTask} className={primaryButton}>
              <Plus size={16} />
              New Task
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5 sm:gap-3">
        <select value={priority} onChange={changeFilter(setPriority)} aria-label="Filter by priority" className={inputClass}>
          <option value="">All Priorities</option>
          {PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select value={taskType} onChange={changeFilter(setTaskType)} aria-label="Filter by task type" className={inputClass}>
          <option value="">All Task Types</option>
          {TASK_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <input type="date" value={from} max={to || undefined} onChange={changeFilter(setFrom)} aria-label="Scheduled from" className={inputClass} />
        <input type="date" value={to} min={from || undefined} onChange={changeFilter(setTo)} aria-label="Scheduled to" className={inputClass} />
        <button
          type="button"
          onClick={clearFilters}
          disabled={!hasFilters}
          className="rounded border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:py-2.5 sm:text-sm"
        >
          Clear Filters
        </button>
      </div>

      <SummaryCards summary={summary} activeStatus={status} onSelect={selectStatus} />

      <div className="min-w-0 overflow-hidden rounded border border-slate-200 bg-white">
        {loading ? (
          <div className="overflow-x-auto"><TableSkeleton rows={6} columns={8} /></div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-3 py-10 text-center sm:px-4 sm:py-16">
            <div className="rounded bg-slate-100 p-3 text-slate-500 sm:p-4"><ClipboardCheck size={26} /></div>
            <h3 className="text-sm font-semibold text-slate-800 sm:text-base">No tasks found</h3>
            <p className="max-w-sm text-xs leading-5 text-slate-500 sm:text-sm">
              {hasFilters
                ? "Try changing or clearing the filters."
                : canManage
                  ? "Create the first housekeeping task to get started."
                  : "No tasks have been assigned to you yet."}
            </p>
            {canManage && !hasFilters && (
              <button type="button" onClick={openNewTask} className={primaryButton}><Plus size={16} />New Task</button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs sm:min-w-[980px] sm:text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 sm:text-xs">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium sm:px-4 sm:py-3">Task</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium sm:px-4 sm:py-3">Location</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium sm:px-4 sm:py-3">Priority</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium sm:px-4 sm:py-3">Status</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium sm:px-4 sm:py-3">Assigned To</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium sm:px-4 sm:py-3">Scheduled</th>
                  <th className="whitespace-nowrap px-3 py-2.5 font-medium sm:px-4 sm:py-3">Checklist</th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium sm:px-4 sm:py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => {
                  const taskId = task._id || task.id;
                  const statusMeta = STATUS_META[task.status];
                  const progress = checklistProgress(task);
                  const overdue = isOverdue(task);
                  return (
                    <tr key={taskId} onClick={() => openTask(task)} className="cursor-pointer">
                      <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                        <p className="font-semibold text-slate-900">{labelFor(TASK_TYPE_OPTIONS, task.taskType)}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400 sm:text-xs">{shortTaskNumber(task.taskNumber)}</p>
                      </td>
                      <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                        {task.room ? <><p className="font-medium text-slate-800">Room {task.room.roomNumber ?? "-"}</p><p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">Floor {task.room.floor ?? "-"}</p></> : <p className="font-medium text-slate-800">{task.area || "-"}</p>}
                      </td>
                      <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                        <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-medium capitalize sm:px-3 sm:text-xs ${PRIORITY_BADGE[task.priority] || "bg-slate-100 text-slate-600"}`}>{task.priority || "-"}</span>
                      </td>
                      <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                        <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-medium sm:px-3 sm:text-xs ${statusMeta?.badge || "bg-slate-100 text-slate-600"}`}>{statusMeta?.label || task.status || "-"}</span>
                      </td>
                      <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                        {task.assignedTo ? <><p className="font-medium text-slate-800">{task.assignedTo.name || "-"}</p><p className="mt-0.5 max-w-[180px] truncate text-[10px] text-slate-500 sm:text-xs">{task.assignedTo.email || ""}</p></> : <span className="text-slate-400">Unassigned</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 sm:px-4 sm:py-3">
                        <p className="text-slate-700">{formatDateTime(task.scheduledAt)}</p>
                        {overdue && <p className="mt-0.5 text-[10px] font-medium text-rose-600 sm:text-xs">Overdue</p>}
                      </td>
                      <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                        {progress.total === 0 ? <span className="text-slate-400">-</span> : <div className="w-24 sm:w-28"><p className="text-[10px] text-slate-600 sm:text-xs">{progress.done}/{progress.total} done</p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress.percent}%` }} /></div></div>}
                      </td>
                      <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                        <div className="flex justify-end"><button type="button" onClick={(event) => { event.stopPropagation(); openTask(task); }} aria-label="View task" title="View task" className="rounded p-1.5 text-slate-500 transition  sm:p-2"><Eye size={16} /></button></div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tasks.length > 0 && (
          <Pagination page={pagination.page || page} totalPages={pagination.totalPages} total={pagination.total ?? tasks.length} onChange={setPage} />
        )}
      </div>
    </div>
  );
};

export default Housekeeping;
