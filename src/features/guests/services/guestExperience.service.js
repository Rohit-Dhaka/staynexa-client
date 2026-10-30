import api from "../../../api/axiosInstance";

const unwrap = (promise) => promise.then((res) => res.data.data);

const list = (url, params = {}, key = "items") =>
  api.get(url, { params }).then((res) => {
    const data = res.data?.data;
    return { items: data?.[key] ?? data?.items ?? [], meta: data?.meta ?? null };
  });


export const getGuestList = (params) => list("/guests", params, "guests");
export const getGuestById = (id) => unwrap(api.get(`/guests/${id}`));
export const createGuest = (data) =>
  unwrap(api.post("/guests", data)).then((d) => d?.guest ?? d);
export const updateGuest = (id, data) =>
  unwrap(api.patch(`/guests/${id}`, data)).then((d) => d?.guest ?? d);

const setFlags = (id, data) =>
  unwrap(api.patch(`/guests/${id}/flags`, data)).then((d) => d?.guest ?? d);

export const setGuestVip = (id, isVip) => setFlags(id, { isVip });
export const setGuestBlacklist = (id, isBlacklisted, reason = "") =>
  setFlags(id, { isBlacklisted, blacklistReason: reason });

export const setGuestActive = (id, isActive) =>
  unwrap(api.patch(`/guests/${id}/status`, { isActive })).then((d) => d?.guest ?? d);

export const deleteGuest = (id) => unwrap(api.delete(`/guests/${id}`));


export const getRequestList = (params) => list("/guest-requests", params);
export const getRequestSummary = () => unwrap(api.get("/guest-requests/summary"));
export const createRequest = (data) => unwrap(api.post("/guest-requests", data));
export const updateRequest = (id, data) => unwrap(api.patch(`/guest-requests/${id}`, data));
export const setRequestStatus = (id, status) =>
  unwrap(api.patch(`/guest-requests/${id}/status`, { status }));
export const deleteRequest = (id) => unwrap(api.delete(`/guest-requests/${id}`));


export const getReviewList = (params) => list("/reviews", params);
export const getReviewSummary = () => unwrap(api.get("/reviews/summary"));
export const createReview = (data) => unwrap(api.post("/reviews", data));
export const replyToReview = (id, text) => unwrap(api.patch(`/reviews/${id}/reply`, { text }));
export const setReviewStatus = (id, status) =>
  unwrap(api.patch(`/reviews/${id}/status`, { status }));
export const deleteReview = (id) => unwrap(api.delete(`/reviews/${id}`));