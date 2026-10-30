import api from "../../../api/axiosInstance";

const unwrap = (res) => {
  if (!res) {
    throw new Error("API returned an empty response.");
  }

  return res.data?.data ?? res.data;
};


export const lookupGuest = (phone) =>
  api.get("/guests/lookup", { params: { phone } }).then(unwrap);


export const suggestGuests = (q) =>
  api.get("/guests/suggest", { params: { q } }).then(unwrap);


export const getGuests = (params) =>
  api.get("/guests", { params }).then(unwrap);


export const getGuest = (id) => api.get(`/guests/${id}`).then(unwrap);

export const updateGuest = (id, data) =>
  api.patch(`/guests/${id}`, data).then(unwrap);


export const updateGuestFlags = (id, data) =>
  api.patch(`/guests/${id}/flags`, data).then(unwrap);


export const getMyGuestProfile = () =>
  api.get("/guests/me").then(unwrap);










export const getRequestList = (params) =>
  api.get("/guest-requests", { params }).then((res) => {
    const data = res.data?.data;

    return {
      items: Array.isArray(data)
        ? data
        : (data?.items ?? data?.requests ?? []),
      meta: data?.meta ?? null,
    };
  });

export const setRequestStatus = (id, status) =>
  api.patch(`/guest-requests/${id}/status`, { status }).then(unwrap);

export const replyToRequest = (id, reply) =>
  api.patch(`/guest-requests/${id}/reply`, { reply }).then(unwrap);