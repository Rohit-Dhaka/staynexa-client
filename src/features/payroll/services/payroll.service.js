import api from "../../../api/axiosInstance";

const unwrap = (promise) => promise.then((res) => res.data.data);

export const listStructures = () => unwrap(api.get("/payroll/structures"));
export const getStructureHistory = (userId) => unwrap(api.get(`/payroll/structures/user/${userId}`));
export const createStructure = (data) => unwrap(api.post("/payroll/structures", data));
export const updateStructure = (id, data) => unwrap(api.put(`/payroll/structures/${id}`, data));
export const deleteStructure = (id) => unwrap(api.delete(`/payroll/structures/${id}`));

export const getPayrollSettings = () => unwrap(api.get("/payroll/settings"));
export const updatePayrollSettings = (data) => unwrap(api.put("/payroll/settings", data));

export const listAdvances = (params) => unwrap(api.get("/payroll/advances", { params }));
export const createAdvance = (data) => unwrap(api.post("/payroll/advances", data));
export const cancelAdvance = (id, reason) => unwrap(api.post(`/payroll/advances/${id}/cancel`, { reason }));
export const repayAdvance = (id, data) => unwrap(api.post(`/payroll/advances/${id}/repay`, data));

export const getPeriodSummary = (params) => unwrap(api.get("/payroll/summary", { params }));
export const generatePayroll = (data) => unwrap(api.post("/payroll/generate", data));
export const approvePeriod = (data) => unwrap(api.post("/payroll/approve-period", data));
export const payPeriod = (data) => unwrap(api.post("/payroll/pay-period", data));

export const listPayslips = (params) => unwrap(api.get("/payroll", { params }));
export const getPayslip = (id) => unwrap(api.get(`/payroll/${id}`));
export const addLine = (id, data) => unwrap(api.post(`/payroll/${id}/lines`, data));
export const removeLine = (id, lineId) => unwrap(api.delete(`/payroll/${id}/lines/${lineId}`));
export const approvePayslip = (id, data) => unwrap(api.post(`/payroll/${id}/approve`, data));
export const payPayslip = (id, data) => unwrap(api.post(`/payroll/${id}/pay`, data));
export const cancelPayslip = (id, reason) => unwrap(api.post(`/payroll/${id}/cancel`, { reason }));
export const reopenPayslip = (id) => unwrap(api.post(`/payroll/${id}/reopen`));