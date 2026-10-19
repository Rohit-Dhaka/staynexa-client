import api from "../../../api/axiosInstance";

const unwrap = (promise) => promise.then((res) => res.data.data);

export const getMyToday = () => unwrap(api.get("/attendance/me/today"));
export const clockIn = () => unwrap(api.post("/attendance/clock-in"));
export const clockOut = () => unwrap(api.post("/attendance/clock-out"));

export const getDailySheet = (params) => unwrap(api.get("/attendance/daily", { params }));
export const getMonthlySheet = (params) => unwrap(api.get("/attendance/monthly", { params }));
export const markAttendance = (data) => unwrap(api.post("/attendance/mark", data));
export const bulkMark = (data) => unwrap(api.post("/attendance/bulk", data));

export const getSettings = () => unwrap(api.get("/attendance/settings"));
export const updateSettings = (data) => unwrap(api.put("/attendance/settings", data));

export const listHolidays = (params) => unwrap(api.get("/attendance/holidays", { params }));
export const createHoliday = (data) => unwrap(api.post("/attendance/holidays", data));
export const deleteHoliday = (id) => unwrap(api.delete(`/attendance/holidays/${id}`));

export const lockMonth = (data) => unwrap(api.post("/attendance/lock", data));
export const unlockMonth = (data) => unwrap(api.post("/attendance/unlock", data));

export const listLeaves = (params) => unwrap(api.get("/attendance/leaves", { params }));
export const getLeave = (id) => unwrap(api.get(`/attendance/leaves/${id}`));
export const applyLeave = (data) => unwrap(api.post("/attendance/leaves", data));
export const reviewLeave = (id, data) => unwrap(api.post(`/attendance/leaves/${id}/review`, data));
export const cancelLeave = (id, data) => unwrap(api.post(`/attendance/leaves/${id}/cancel`, data));

export const getLeaveBalance = (params) => unwrap(api.get("/attendance/leave-balance", { params }));
export const listLeaveBalances = (params) => unwrap(api.get("/attendance/leave-balances", { params }));
export const adjustLeaveBalance = (data) => unwrap(api.put("/attendance/leave-balance", data));