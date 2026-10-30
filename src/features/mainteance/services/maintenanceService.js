
import api from "../../../api/axiosInstance";



const BASE_URL = "/maintenance";


const unwrap = (promise) =>
  promise.then((response) => {
    const body = response?.data;

    if (body?.success === false) {
      throw new Error(body.message || "Request failed.");
    }

    return body?.data ?? body;
  });


const buildParams = (params = {}) => {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== undefined && value !== null && value !== ""
    )
  );
};




export const getDashboard = () =>
  unwrap(api.get(`${BASE_URL}/dashboard`));


export const getAnalytics = (params = {}) =>
  unwrap(
    api.get(`${BASE_URL}/analytics`, {
      params: buildParams(params),
    })
  );




export const getEquipmentList = (params = {}) =>
  unwrap(
    api.get(BASE_URL, {
      params: buildParams(params),
    })
  );


export const getEquipmentById = (id) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(api.get(`${BASE_URL}/${id}`));
};


export const createEquipment = (payload) =>
  unwrap(api.post(BASE_URL, payload));


export const updateEquipment = (id, payload) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(api.put(`${BASE_URL}/${id}`, payload));
};


export const deactivateEquipment = (id) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(
    api.patch(`${BASE_URL}/${id}/deactivate`)
  );
};


export const reportIssue = (id, payload) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(
    api.post(`${BASE_URL}/${id}/issues`, payload)
  );
};

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

export const updateMaintenanceStatus = (id, payload) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(
    api.patch(`${BASE_URL}/${id}/status`, payload)
  );
};

export const addRepairRecord = (id, payload) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(
    api.post(`${BASE_URL}/${id}/repairs`, payload)
  );
};


export const completeMaintenance = (id, payload = {}) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(
    api.post(`${BASE_URL}/${id}/complete`, payload)
  );
};


export const getMaintenanceHistory = (id) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(
    api.get(`${BASE_URL}/${id}/history`)
  );
};


export const getReplacementAnalysis = (id) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(
    api.get(`${BASE_URL}/${id}/replacement-analysis`)
  );
};

export const getWarrantyInformation = (id) => {
  if (!id) {
    return Promise.reject(new Error("Equipment ID is required."));
  }

  return unwrap(
    api.get(`${BASE_URL}/${id}/warranty`)
  );
};



const getAllMaintenanceHistory = (params = {}) => {
  return api
    .get("/maintenance/history", { params })
    .then((res) => res.data.data);
};


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

