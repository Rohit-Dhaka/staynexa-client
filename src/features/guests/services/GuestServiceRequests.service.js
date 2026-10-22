import api from "../../../api/axiosInstance";

const unwrap = (res) => {
  if (!res) {
    throw new Error("API returned an empty response.");
  }

  return res.data?.data ?? res.data;
};

export const getMyGuestRequests = () =>
  api.get("/guest-requests/guest/my").then(unwrap);

export const createMyGuestRequest = (data) =>
  api.post("/guest-requests/guest", data).then(unwrap);

export const cancelMyGuestRequest = (id) =>
  api.post(`/guest-requests/guest/${id}/cancel`).then(unwrap);