
import api from "../../../api/axiosInstance.js";

const BASE_URL = "/expenses";

const handleError = (error) => {
  throw new Error(
    error.response?.data?.message ||
      error.message ||
      "Something went wrong"
  );
};

export const getExpenses = async (params = {}) => {
  try {
    const response = await api.get(BASE_URL, { params });

    return {
      expenses: response.data.data || [],
      pagination: response.data.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    };
  } catch (error) {
    handleError(error);
  }
};

export const getExpenseById = async (id) => {
  try {
    const response = await api.get(`${BASE_URL}/${id}`);
    return response.data.data;
  } catch (error) {
    handleError(error);
  }
};

export const createExpense = async (data) => {
  try {
    const response = await api.post(BASE_URL, data);
    return response.data.data;
  } catch (error) {
    handleError(error);
  }
};

export const updateExpense = async (id, data) => {
  try {
    const response = await api.patch(`${BASE_URL}/${id}`, data);
    return response.data.data;
  } catch (error) {
    handleError(error);
  }
};

export const deleteExpense = async (id) => {
  try {
    const response = await api.delete(`${BASE_URL}/${id}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};
