import api from "../../../api/axiosInstance";

const unwrap = (res) => res.data.data;

/*
 * The backend list endpoint returns:
 *   { success, message, data: [tasks], pagination: { total, page, limit, totalPages } }
 * so the list function returns both parts.
 */
export const getTasks = (params) =>
  api.get("/housekeeping", { params }).then((res) => ({
    tasks: res.data.data || [],
    pagination: res.data.pagination || {},
  }));

// { total, byStatus: { pending, assigned, ... }, byPriority: { low, ... } }
export const getTasksSummary = (params) =>
  api.get("/housekeeping/summary", { params }).then(unwrap);

export const getTask = (id) => api.get(`/housekeeping/${id}`).then(unwrap);

export const createTask = (data) =>
  api.post("/housekeeping", data).then(unwrap);

export const assignTask = (id, assignedTo) =>
  api.patch(`/housekeeping/${id}/assign`, { assignedTo }).then(unwrap);

// details: { notes, maintenanceDetails, cancellationReason }
export const updateTaskStatus = (id, status, details = {}) =>
  api.patch(`/housekeeping/${id}/status`, { status, ...details }).then(unwrap);

export const inspectTask = (id, inspectionNotes) =>
  api.patch(`/housekeeping/${id}/inspect`, { inspectionNotes }).then(unwrap);

export const updateChecklistItem = (id, itemId, isCompleted) =>
  api
    .patch(`/housekeeping/${id}/checklist/${itemId}`, { isCompleted })
    .then(unwrap);

// Needed by the assign dropdown. This endpoint must be added to the backend.
export const getAssignableStaff = () =>
  api.get("/housekeeping/staff").then(unwrap);