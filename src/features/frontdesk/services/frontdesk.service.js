import api from "../../../api/axiosInstance";

const unwrap = (res) => res.data.data;

export const getOverview = () => api.get("/front-desk/overview").then(unwrap);

export const checkIn = (id) => api.post(`/front-desk/${id}/check-in`, {}).then(unwrap);

export const checkOut = (id, settleDue = false) =>
  api.post(`/front-desk/${id}/check-out`, { settleDue }).then(unwrap);