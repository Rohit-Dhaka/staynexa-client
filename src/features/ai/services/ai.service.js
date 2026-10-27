
import api from "../../../api/axiosInstance";

const MAX_MESSAGE_LENGTH = 5000;

/**
 * Convert API errors into readable messages.
 */
const getErrorMessage = (error) => {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message;

  if (serverMessage) {
    return serverMessage;
  }

  if (status === 400) {
    return "Your message is invalid. Please check it and try again.";
  }

  if (status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (status === 403) {
    return "You are not authorized to use this feature.";
  }

  if (status === 429) {
    return "The AI service is busy. Please try again later.";
  }

  if (status === 502) {
    return "The AI service could not process your request. Please try again.";
  }

  if (status === 503) {
    return "The AI service is currently unavailable.";
  }

  if (status === 504) {
    return "The AI response took too long. Please try again.";
  }

  if (error?.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }

  if (!error?.response) {
    return "Unable to connect to the server. Check your connection and try again.";
  }

  return error?.message || "Unable to connect to the AI assistant.";
};

/**
 * Send a message to the Hotel AI Assistant.
 *
 * Expected backend response:
 * {
 *   success: true,
 *   message: "AI response generated successfully.",
 *   data: {
 *     reply: "AI response text"
 *   }
 * }
 */
export const sendAIMessage = async (message) => {
  if (typeof message !== "string" || !message.trim()) {
    throw new Error("Please enter a message.");
  }

  const trimmedMessage = message.trim();

  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    throw new Error(
      `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`
    );
  }

  try {
    const response = await api.post("/ai/chat", {
      message: trimmedMessage,
    });

    const responseBody = response?.data;

    // Validate the API response.
    if (responseBody?.success === false) {
      throw new Error(
        responseBody.message || "The AI service could not process your request."
      );
    }

    const reply = responseBody?.data?.reply;

    if (typeof reply !== "string" || !reply.trim()) {
      console.error("[AI Service] Unexpected API response:", responseBody);

      throw new Error(
        "The AI service returned an invalid response. Please try again."
      );
    }

    return reply.trim();
  } catch (error) {
    console.error("[AI Service] Request failed:", {
      message: error?.message,
      status: error?.response?.status,
      response: error?.response?.data,
      url: error?.config?.url,
    });

    // Preserve validation errors generated above.
    if (
      error instanceof Error &&
      !error.response &&
      !error.request &&
      !error.config
    ) {
      throw error;
    }

    throw new Error(getErrorMessage(error));
  }
};
