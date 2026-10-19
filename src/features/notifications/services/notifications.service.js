import api from "../../../api/axiosInstance";

const unwrap = (response) => response.data?.data;
export const getNotifications = (params = {}) => api.get("/notifications", { params }).then(unwrap);
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`).then(unwrap);
export const markAllNotificationsRead = () => api.patch("/notifications/read-all").then(unwrap);
export const deleteNotification = (id) => api.delete(`/notifications/${id}`).then(unwrap);
export const clearReadNotifications = () => api.delete("/notifications/read").then(unwrap);
