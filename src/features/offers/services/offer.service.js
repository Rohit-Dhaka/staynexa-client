
import api from "../../../api/axiosInstance"


const unwrap = async (request) => {
  const response = await request;
  return response.data?.data ?? response.data;
};

export const getOffers = (params = {}) =>
  unwrap(api.get("/offers", { params }));

export const getOffer = (id) =>
  unwrap(api.get(`/offers/${id}`));

export const createOffer = (data) =>
  unwrap(api.post("/offers", data));

export const updateOffer = (id, data) =>
  unwrap(api.patch(`/offers/${id}`, data));

export const updateOfferStatus = (id, status) =>
  unwrap(api.patch(`/offers/${id}/status`, { status }));

export const deleteOffer = (id) =>
  unwrap(api.delete(`/offers/${id}`));

export const validateCoupon = (data) =>
  unwrap(api.post("/offers/validate", data));
