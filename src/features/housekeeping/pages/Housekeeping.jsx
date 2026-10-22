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
  "rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700";

const getPayload = (response) => response?.data ?? response ?? {};

const getTaskRows = (payload) => {
  const rows = payload?.tasks ?? payload?.items ?? payload?.data?.tasks ?? [];
  return Array.isArray(rows) ? rows : [];
};

const getTaskTypeLabel = (value) =>
  labelFor(TASK_TYPE_OPTIONS, value) || value || "-";

const housekeepingExportColumns = [
  {
    header: "Task Number",
    value: (task) => shortTaskNumber(task?.taskNumber) || "-",
  },
  {
    header: "Task Type",
    value: (task) => getTaskTypeLabel(task?.taskType),
  },
  {
    header: "Location",
    value: (task) =>
      task?.room
        ? `Room ${task.room.roomNumber ?? "-"}`
        : task?.area || "-",
  },
  {
    header: "Floor",
    value: (task) => task?.room?.floor ?? "-",
  },
  {
    header: "Priority",
    value: (task) => task?.priority || "-",
  },
  {
    header: "Status",
    value: (task) => STATUS_META[task?.status]?.label || task?.status || "-",
  },
  {
    header: "Assigned To",
    value: (task) => task?.assignedTo?.name || "Unassigned",
  },
  {
    header: "Assigned Email",
    value: (task) => task?.assignedTo?.email || "-",
  },
  {
    header: "Scheduled At",
    value: (task) => formatDateTime(task?.scheduledAt),
  },
  {
    header: "Checklist Progress",
    value: (task) => {
      const progress = checklistProgress(task);
      return progress.total ? `${progress.done}/${progress.total} (${progress.percent}%)` : "-";
    },
  },
  {
    header: "Overdue",
    value: (task) => (isOverdue(task) ? "Yes" : "No"),
  },
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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {cards.map((card) => {
        const selected = activeStatus === card.key;

        return (
          <button
            key={card.key || "all"}
            type="button"
            onClick={() => onSelect(card.key)}
            aria-pressed={selected}
            className={`flex items-center justify-center gap-2 rounded border bg-white px-2 py-3 text-left transition hover:border-slate-300 ${
              selected
                ? "border-indigo-500 ring-2 ring-indigo-100"
                : "border-slate-200"
            }`}
          >
            <span className="text-sm text-slate-500">{card.label}</span>
            {summary ? (
              <span className="text-sm font-bold text-slate-900">
                {card.value ?? 0}
              </span>
            ) : (
              <Skeleton className="h-5 w-8" />
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
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
      <p className="text-xs text-slate-500">
        Page {page} of {totalPages} ({total} tasks)
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="rounded border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="rounded border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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

  // Export every page matching the current filters, not only the visible page.
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

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

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
    <div className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Housekeeping</h1>
          <p className="mt-1 text-sm text-slate-500">
            {canManage
              ? "Create cleaning and maintenance tasks, assign them to staff and inspect the work."
              : "Your assigned cleaning and maintenance tasks."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          <ExportButtons
            title="Housekeeping Tasks"
            fileName="housekeeping-tasks"
            columns={housekeepingExportColumns}
            getRows={getAllFilteredTasks}
          />
          {canManage && (
            <button
              type="button"
              onClick={openNewTask}
              className={primaryButton}
            >
              <Plus size={16} />
              New Task
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <select
          value={priority}
          onChange={changeFilter(setPriority)}
          aria-label="Filter by priority"
          className={inputClass}
        >
          <option value="">All Priorities</option>
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={taskType}
          onChange={changeFilter(setTaskType)}
          aria-label="Filter by task type"
          className={inputClass}
        >
          <option value="">All Task Types</option>
          {TASK_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={changeFilter(setFrom)}
          aria-label="Scheduled from"
          className={inputClass}
        />

        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={changeFilter(setTo)}
          aria-label="Scheduled to"
          className={inputClass}
        />

        <button
          type="button"
          onClick={clearFilters}
          disabled={!hasFilters}
          className="rounded border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear Filters
        </button>
      </div>

      <SummaryCards
        summary={summary}
        activeStatus={status}
        onSelect={selectStatus}
      />

      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        {loading ? (
          <TableSkeleton rows={6} columns={8} />
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
            <div className="rounded bg-slate-100 p-4 text-slate-500">
              <ClipboardCheck size={28} />
            </div>
            <h3 className="font-semibold text-slate-800">No tasks found</h3>
            <p className="max-w-sm text-sm text-slate-500">
              {hasFilters
                ? "Try changing or clearing the filters."
                : canManage
                  ? "Create the first housekeeping task to get started."
                  : "No tasks have been assigned to you yet."}
            </p>
            {canManage && !hasFilters && (
              <button
                type="button"
                onClick={openNewTask}
                className={primaryButton}
              >
                <Plus size={16} />
                New Task
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Task</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Assigned To</th>
                  <th className="px-4 py-3 font-medium">Scheduled</th>
                  <th className="px-4 py-3 font-medium">Checklist</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => {
                  const taskId = task._id || task.id;
                  const statusMeta = STATUS_META[task.status];
                  const progress = checklistProgress(task);
                  const overdue = isOverdue(task);

                  return (
                    <tr
                      key={taskId}
                      onClick={() => openTask(task)}
                      className="cursor-pointer hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {labelFor(TASK_TYPE_OPTIONS, task.taskType)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {shortTaskNumber(task.taskNumber)}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        {task.room ? (
                          <>
                            <p className="font-medium text-slate-800">
                              Room {task.room.roomNumber ?? "-"}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              Floor {task.room.floor ?? "-"}
                            </p>
                          </>
                        ) : (
                          <p className="font-medium text-slate-800">
                            {task.area || "-"}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${
                            PRIORITY_BADGE[task.priority] ||
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {task.priority || "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                            statusMeta?.badge || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {statusMeta?.label || task.status || "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {task.assignedTo ? (
                          <>
                            <p className="font-medium text-slate-800">
                              {task.assignedTo.name || "-"}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {task.assignedTo.email || ""}
                            </p>
                          </>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="text-slate-700">
                          {formatDateTime(task.scheduledAt)}
                        </p>
                        {overdue && (
                          <p className="mt-0.5 text-xs font-medium text-rose-600">
                            Overdue
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {progress.total === 0 ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <div className="w-28">
                            <p className="text-xs text-slate-600">
                              {progress.done}/{progress.total} done
                            </p>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-all"
                                style={{ width: `${progress.percent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openTask(task);
                            }}
                            aria-label="View task"
                            title="View task"
                            className="rounded p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tasks.length > 0 && (
          <Pagination
            page={pagination.page || page}
            totalPages={pagination.totalPages}
            total={pagination.total ?? tasks.length}
            onChange={setPage}
          />
        )}
      </div>
    </div>
  );
};

export default Housekeeping;
