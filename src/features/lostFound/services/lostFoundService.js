
import api from "../../../api/axiosInstance";

const BASE_URL = "/lost-found";

const unwrap = (response) => response.data?.data ?? response.data;

const lostFoundService = {
  

  getMyReports: async (params = {}) => {
    const response = await api.get(`${BASE_URL}/guest/reports`, { params });
    return unwrap(response);
  },

  getMyReport: async (id) => {
    const response = await api.get(`${BASE_URL}/guest/reports/${id}`);
    return unwrap(response);
  },

  createMyReport: async (data) => {
    const response = await api.post(`${BASE_URL}/guest/reports`, data);
    return unwrap(response);
  },

  cancelMyReport: async (id) => {
    const response = await api.post(
      `${BASE_URL}/guest/reports/${id}/cancel`
    );
    return unwrap(response);
  },

  

  getSummary: async (params = {}) => {
    const response = await api.get(`${BASE_URL}/summary`, { params });
    return unwrap(response);
  },

  

  getReports: async (params = {}) => {
    const response = await api.get(`${BASE_URL}/reports`, { params });
    return unwrap(response);
  },

  getReport: async (id) => {
    const response = await api.get(`${BASE_URL}/reports/${id}`);
    return unwrap(response);
  },

  createReport: async (data) => {
    const response = await api.post(`${BASE_URL}/reports`, data);
    return unwrap(response);
  },

  updateReport: async (id, data) => {
    const response = await api.patch(`${BASE_URL}/reports/${id}`, data);
    return unwrap(response);
  },

  setReportStatus: async (id, data) => {
    const response = await api.patch(
      `${BASE_URL}/reports/${id}/status`,
      data
    );
    return unwrap(response);
  },

  getReportMatches: async (id, params = {}) => {
    const response = await api.get(
      `${BASE_URL}/reports/${id}/matches`,
      { params }
    );
    return unwrap(response);
  },

  linkMatch: async (id, data) => {
    const response = await api.post(
      `${BASE_URL}/reports/${id}/match`,
      data
    );
    return unwrap(response);
  },

  markReady: async (id, data = {}) => {
    const response = await api.post(
      `${BASE_URL}/reports/${id}/ready`,
      data
    );
    return unwrap(response);
  },

  handover: async (id, data) => {
    const response = await api.post(
      `${BASE_URL}/reports/${id}/handover`,
      data
    );
    return unwrap(response);
  },

  

  getFoundItems: async (params = {}) => {
    const response = await api.get(`${BASE_URL}/found`, { params });
    return unwrap(response);
  },

  getFoundItem: async (id) => {
    const response = await api.get(`${BASE_URL}/found/${id}`);
    return unwrap(response);
  },

  createFoundItem: async (data) => {
    const response = await api.post(`${BASE_URL}/found`, data);
    return unwrap(response);
  },

  updateFoundItem: async (id, data) => {
    const response = await api.patch(`${BASE_URL}/found/${id}`, data);
    return unwrap(response);
  },

  getFoundItemMatches: async (id, params = {}) => {
    const response = await api.get(
      `${BASE_URL}/found/${id}/matches`,
      { params }
    );
    return unwrap(response);
  },

  disposeFoundItem: async (id, data = {}) => {
    const response = await api.post(
      `${BASE_URL}/found/${id}/dispose`,
      data
    );
    return unwrap(response);
  },
};

export default lostFoundService;