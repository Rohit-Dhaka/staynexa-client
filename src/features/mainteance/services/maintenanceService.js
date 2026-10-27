
import api from "../../../api/axiosInstance";

/**
 * Maintenance Service
 * Handles all maintenance-related API requests.
 */

const BASE_URL = "/maintenance";

/**
 * Extract data from the API response.
 */
const unwrap = (promise) =>
  promise.then((response) => {
    const body = response?.data;

    if (body?.success === false) {
      throw new Error(body.message || "Request failed.");
    }

    return body?.data ?? body;
  });

/**
 * Build query parameters.
 */
const buildParams = (params = {}) => {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== undefined && value !== null && value !== ""
    )
  );
};

/* =====================================================
   DASHBOARD
===================================================== */

/**
 * Get maintenance dashboard statistics.
 * GET /api/maintenance/dashboard
 */
export const getDashboard = () =>
  unwrap(api.get(`${BASE_URL}/dashboard`));

/**
 * Get maintenance analytics.
 * GET /api/maintenance/analytics
 */
export const getAnalytics = (params = {}) =>
  unwrap(
    api.get(`${BASE_URL}/analytics`, {
      params: buildParams(params),
    })
  );

/* =====================================================
   EQUIPMENT
===================================================== */

/**
 * Get equipment list.
 * GET /api/maintenance
 */
export const getEquipmentList = (params = {}) =>
  unwrap(
    api.get(BASE_URL, {
      params: buildParams(params),
    })
  );

/**
 * Get equipment details.
 * GET /api/maintenance/:id
 */
export const getEquipmentById = (id) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(api.get(`${BASE_URL}/${id}`));
};

/**
 * Create equipment.
 * POST /api/maintenance
 */
export const createEquipment = (payload) =>
  unwrap(api.post(BASE_URL, payload));

/**
 * Update equipment.
 * PUT /api/maintenance/:id
 */
export const updateEquipment = (id, payload) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(api.put(`${BASE_URL}/${id}`, payload));
};

/**
 * Deactivate equipment.
 * PATCH /api/maintenance/:id/deactivate
 */
export const deactivateEquipment = (id) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(
    api.patch(`${BASE_URL}/${id}/deactivate`)
  );
};

/* =====================================================
   ISSUE REPORTING
===================================================== */

/**
 * Report a maintenance issue.
 * POST /api/maintenance/:id/issues
 */
export const reportIssue = (id, payload) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(
    api.post(`${BASE_URL}/${id}/issues`, payload)
  );
};

/* =====================================================
   TECHNICIAN ASSIGNMENT
===================================================== */

/**
 * Assign a technician.
 * PATCH /api/maintenance/:id/assign-technician
 */
export const assignTechnician = (id, payload) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(
    api.patch(
      `${BASE_URL}/${id}/assign-technician`,
      payload
    )
  );
};

/* =====================================================
   MAINTENANCE STATUS
===================================================== */

/**
 * Update maintenance status.
 * PATCH /api/maintenance/:id/status
 */
export const updateMaintenanceStatus = (id, payload) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(
    api.patch(`${BASE_URL}/${id}/status`, payload)
  );
};

/* =====================================================
   REPAIR RECORDS
===================================================== */

/**
 * Add a repair record.
 * POST /api/maintenance/:id/repairs
 */
export const addRepairRecord = (id, payload) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(
    api.post(`${BASE_URL}/${id}/repairs`, payload)
  );
};

/**
 * Complete maintenance.
 * POST /api/maintenance/:id/complete
 */
export const completeMaintenance = (id, payload = {}) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(
    api.post(`${BASE_URL}/${id}/complete`, payload)
  );
};

/* =====================================================
   MAINTENANCE HISTORY
===================================================== */

/**
 * Get maintenance history for equipment.
 * GET /api/maintenance/:id/history
 */
export const getMaintenanceHistory = (id) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(
    api.get(`${BASE_URL}/${id}/history`)
  );
};

/* =====================================================
   REPLACEMENT ANALYSIS
===================================================== */

/**
 * Get equipment replacement analysis.
 * GET /api/maintenance/:id/replacement-analysis
 */
export const getReplacementAnalysis = (id) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(
    api.get(`${BASE_URL}/${id}/replacement-analysis`)
  );
};

/* =====================================================
   WARRANTY INFORMATION
===================================================== */

/**
 * Get equipment warranty information.
 * GET /api/maintenance/:id/warranty
 */
export const getWarrantyInformation = (id) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(
    api.get(`${BASE_URL}/${id}/warranty`)
  );
};


/**
 * Get maintenance history across all equipment.
 */
const getAllMaintenanceHistory = (params = {}) => {
  return api
    .get("/maintenance/history", { params })
    .then((res) => res.data.data);
};

/* =====================================================
   DEFAULT EXPORT
===================================================== */

const maintenanceService = {
  getDashboard,
  getAnalytics,

  getEquipmentList,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deactivateEquipment,

  reportIssue,
  assignTechnician,
  updateMaintenanceStatus,

  addRepairRecord,
  completeMaintenance,

  getMaintenanceHistory,
  getReplacementAnalysis,
  getWarrantyInformation,
  getAllMaintenanceHistory
};

export default maintenanceService;

