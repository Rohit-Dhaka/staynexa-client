import api from "../../../api/axiosInstance";

const unwrap = (res) => res.data.data;



export const getRoomTypes = (params) =>
  api.get("/rooms/types", { params }).then(unwrap);

export const getRoomType = (id) => api.get(`/rooms/types/${id}`).then(unwrap);


const multipart = { headers: { "Content-Type": "multipart/form-data" } };

export const createRoomType = (data) =>
  api.post("/rooms/types", data, multipart).then(unwrap);

export const updateRoomType = (id, data) =>
  api.patch(`/rooms/types/${id}`, data, multipart).then(unwrap);

export const deleteRoomType = (id) =>
  api.delete(`/rooms/types/${id}`).then(unwrap);



export const getRooms = (params) => api.get("/rooms", { params }).then(unwrap);

export const getRoomsSummary = () => api.get("/rooms/summary").then(unwrap);

export const getRoom = (id) => api.get(`/rooms/${id}`).then(unwrap);

export const createRoom = (data) => api.post("/rooms", data).then(unwrap);

export const updateRoom = (id, data) =>
  api.patch(`/rooms/${id}`, data).then(unwrap);

export const updateRoomStatus = (id, status) =>
  api.patch(`/rooms/${id}/status`, { status }).then(unwrap);

export const deleteRoom = (id) => api.delete(`/rooms/${id}`).then(unwrap);



export const getRoomById = getRoom;
export const getRoomTypeById = getRoomType;