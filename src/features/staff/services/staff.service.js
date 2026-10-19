import api from "../../../api/axiosInstance";

// Change this if your backend mounts the staff routes on a different path.
const BASE = "/staff";

export const getStaffList = async (params = {}) => {
  const res = await api.get(BASE, { params });

  const data = res.data?.data;

  return {
    items: data?.items ?? data?.staff ?? [],
    meta: data?.meta ?? null,
  };
};

export const getStaffById = async (id) => {
  const res = await api.get(`${BASE}/${id}`);

  const data = res.data?.data;
  return data?.staff ?? data;
};

export const createStaff = async (data) => {
  const res = await api.post(BASE, data);

  return res.data.data;
};

export const updateStaff = async (id, data) => {
  const res = await api.patch(`${BASE}/${id}`, data);

  return res.data.data;
};

export const activateStaff = async (id) => {
  const res = await api.patch(`${BASE}/${id}/status`, { isActive: true });

  return res.data.data;
};

export const deactivateStaff = async (id) => {
  const res = await api.patch(`${BASE}/${id}/status`, { isActive: false });

  return res.data.data;
};

export const resetStaffPassword = async (id, newPassword) => {
  const res = await api.patch(`${BASE}/${id}/password`, {
    password: newPassword,
  });

  return res.data;
};

export const deleteStaff = async (id) => {
  const res = await api.delete(`${BASE}/${id}`);

  return res.data;
};