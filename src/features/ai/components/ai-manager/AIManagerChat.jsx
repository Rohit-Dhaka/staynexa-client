
import { useRef, useEffect, useState } from "react";
import {
  Bot,
  Send,
  User,
  Sparkles,
  RotateCcw,
  MessageCircle,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";

import { askAIHotelManager } from "../../services/ai-manager.service";

const SUGGESTED_QUESTIONS = [
  "How many check-outs are scheduled today?",
  "Give me today's hotel operations summary.",
  "What operational issues need attention?",
  "How can I improve hotel occupancy?",
];

const INITIAL_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! I'm your AI Hotel Manager. Ask me about hotel operations, bookings, room availability, revenue, or operational issues.",
  timestamp: new Date(),
};

const formatTime = (value) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getErrorMessage = (error) => {
  if (error?.status === 503) {
    return "The AI service is not configured yet. Please connect the backend AI integration and try again.";
  }

  if (error?.status === 401) {
    return "Your session may have expired. Please sign in again.";
  }

  if (error?.status === 403) {
    return "You do not have permission to access this information.";
  }

  return (
    error?.message ||
    "Unable to send your message. Please try again."
  );
};

export default function AIManagerChat() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isLoading]);

  const sendMessage = async (messageText = input) => {
    const question = messageText.trim();

    if (!question || isLoading) {
      return;
    }

    if (question.length > 2000) {
      setError("Your message must not exceed 2000 characters.");
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
      timestamp: new Date(),
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await askAIHotelManager(question);

      const reply =
        typeof response === "string"
          ? response
          : response?.reply ||
            response?.message ||
            response?.answer ||
            response?.content ||
            "";

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          typeof reply === "string" && reply.trim()
            ? reply.trim()
            : "The AI service returned no response. Please try again.",
        timestamp: new Date(),
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleClearChat = () => {
    if (isLoading) {
      return;
    }

    setMessages([
      {
        ...INITIAL_MESSAGE,
        timestamp: new Date(),
      },
    ]);

    setInput("");
    setError("");
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (question) => {
    sendMessage(question);
  };

  return (
    <section className="flex h-full min-h-[620px] flex-col overflow-hidden rounded border border-slate-200 bg-white">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-indigo-50 text-indigo-600">
            <Bot size={23} />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">
              AI Hotel Manager
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Hotel operations assistant
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClearChat}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Clear conversation"
        >
          <RotateCcw size={15} />
          <span>Clear chat</span>
        </button>
      </header>

      {/* Conversation */}
      <div
        className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                isUser ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded ${
                  isUser
                    ? "bg-slate-100 text-slate-600"
                    : "bg-indigo-50 text-indigo-600"
                }`}
              >
                {isUser ? (
                  <User size={18} />
                ) : (
                  <Bot size={18} />
                )}
              </div>

              <div
                className={`flex max-w-[85%] flex-col sm:max-w-[78%] ${
                  isUser ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`rounded px-4 py-3 text-sm leading-6 ${
                    isUser
                      ? "rounded-tr-md bg-indigo-600 text-white"
                      : "rounded-tl-md border border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </div>

                <span className="mt-1.5 px-1 text-[11px] text-slate-400">
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          );
        })}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-indigo-50 text-indigo-600">
              <Bot size={18} />
            </div>

            <div
              className="flex items-center gap-2 rounded rounded-tl-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
              role="status"
            >
              <LoaderCircle
                size={16}
                className="animate-spin"
              />
              <span>Analyzing your question...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions */}
      {messages.length === 1 && (
        <div className="border-t border-slate-100 px-4 py-4 sm:px-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Sparkles size={15} className="text-indigo-500" />
            Suggested questions
          </div>

          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => handleSuggestionClick(question)}
                disabled={isLoading}
                className="rounded border border-slate-200 px-3 py-2 text-left text-xs leading-5 text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          className="mx-4 mb-3 flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 sm:mx-6"
          role="alert"
        >
          <AlertCircle
            size={17}
            className="mt-0.5 shrink-0"
          />

          <p className="min-w-0 flex-1 break-words">
            {error}
          </p>

          <button
            type="button"
            onClick={() => setError("")}
            className="shrink-0 rounded px-2 py-1 text-xs font-medium hover:bg-red-100"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-200 bg-white p-4 sm:px-4 sm:py-3"
      >
  

        <div className="flex items-end gap-2 rounded-full border border-slate-300 bg-white p-2 transition-colors focus-within:border-indigo-400">
          <textarea
            ref={inputRef}
            id="ai-manager-message"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);

              if (error) {
                setError("");
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask about bookings, rooms, revenue, or hotel operations..."
            rows={1}
            maxLength={2000}
            disabled={isLoading}
            className="max-h-32 min-h-10 flex-1 resize-y rounded border-0 bg-transparent px-2 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            aria-label="Send message"
            title="Send message"
          >
            {isLoading ? (
              <LoaderCircle
                size={18}
                className="animate-spin"
              />
            ) : (
              <Send size={17} />
            )}
          </button>
        </div>

      
      </form>
    </section>
  );
}
