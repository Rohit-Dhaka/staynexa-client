import { useEffect, useRef, useState } from "react";
import {
  Bot,
  X,
  Send,
  MessageCircle,
  LoaderCircle,
  Sparkles,
  RotateCcw,
  AlertCircle,
  Clock3,
  Maximize2,
  Minimize2,
} from "lucide-react";

import { sendAIMessage } from "../services/ai.service";

import AIMessage from "../../../components/common/AIMessage";

const MAX_MESSAGE_LENGTH = 5000;
const POSITION_STORAGE_KEY = "stay-nexa-ai-chat-position";

const CHAT_WIDTH = 400;
const CHAT_HEIGHT = 720;
const EDGE_GAP = 12;


const SIDE_PADDING = "px-[max(1rem,calc((100%-60rem)/2))]";

const SUGGESTED_QUESTIONS = [
  {
    label: "Today's bookings",
  },
  {
    label: "Room availability",
  },
  {
    label: "Today's checkouts",
  },
  {
    label: "Monthly revenue",
  },
  {
    label: "Today's check-ins",
  },
  {
    label: "Pending payments",
  },
  {
    label: "Currently occupied rooms",
  },
  {
    label: "Available rooms",
  },
  {
    label: "Booking cancellations",
  },
  {
    label: "Upcoming reservations",
  },
  {
    label: "Today's cab bookings",
  },
  {
    label: "Today's food orders",
  },
  {
    label: "Staff attendance today",
  },
  {
    label: "Pending housekeeping tasks",
  },
  {
    label: "Rooms under maintenance",
  },
  {
    label: "Outstanding guest bills",
  },
  {
    label: "Total guests staying today",
  },
  {
    label: "Weekly revenue summary",
  },
  {
    label: "Top performing room types",
  },
  {
    label: "Hotel performance summary",
  },
];

const createInitialMessage = () => ({
  id: "initial-assistant-message",
  role: "assistant",
  content: "Hi! Welcome to Stay Nexa. How can I help you?",
  timestamp: new Date().toISOString(),
});

const formatTime = (timestamp) => {
  if (!timestamp) return "";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getDefaultPosition = () => ({
  x: Math.max(
    EDGE_GAP,
    window.innerWidth - Math.min(CHAT_WIDTH, window.innerWidth - 24) - 20,
  ),
  y: Math.max(
    EDGE_GAP,
    window.innerHeight - Math.min(CHAT_HEIGHT, window.innerHeight - 24) - 20,
  ),
});

const clampPosition = (position) => {
  const width = Math.min(CHAT_WIDTH, window.innerWidth - EDGE_GAP * 2);
  const height = Math.min(CHAT_HEIGHT, window.innerHeight - EDGE_GAP * 2);

  return {
    x: Math.max(
      EDGE_GAP,
      Math.min(position.x, window.innerWidth - width - EDGE_GAP),
    ),
    y: Math.max(
      EDGE_GAP,
      Math.min(position.y, window.innerHeight - height - EDGE_GAP),
    ),
  };
};

const loadSavedPosition = () => {
  try {
    const saved = localStorage.getItem(POSITION_STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
        return clampPosition(parsed);
      }
    }
  } catch {
    // Use the default position if saved data is invalid.
  }

  return getDefaultPosition();
};

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([createInitialMessage()]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") {
      return { x: 20, y: 20 };
    }

    return loadSavedPosition();
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);
  const requestInProgressRef = useRef(false);

  const dragRef = useRef({
    active: false,
    pointerId: null,
    offsetX: 0,
    offsetY: 0,
  });

  useEffect(() => {
    try {
      localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
    } catch {
      // The chat remains usable if localStorage is unavailable.
    }
  }, [position]);

  useEffect(() => {
    if (!isOpen) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && isOpen) {        
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          setIsOpen(false);
        }
      }
    };

    const handleResize = () => {
      setPosition((previous) => clampPosition(previous));
    };

    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, isFullscreen]);

  const handleDragStart = (event) => {
    if (isFullscreen) return;

    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    if (event.target.closest("button")) {
      return;
    }

    const rect = event.currentTarget
      .closest("[data-ai-chat-window]")
      ?.getBoundingClientRect();

    if (!rect) return;

    event.preventDefault();

    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleDragMove = (event) => {
    if (
      !dragRef.current.active ||
      dragRef.current.pointerId !== event.pointerId
    ) {
      return;
    }

    const nextPosition = clampPosition({
      x: event.clientX - dragRef.current.offsetX,
      y: event.clientY - dragRef.current.offsetY,
    });

    setPosition(nextPosition);
  };

  const handleDragEnd = (event) => {
    if (
      dragRef.current.pointerId !== null &&
      event.pointerId !== dragRef.current.pointerId
    ) {
      return;
    }

    dragRef.current = {
      active: false,
      pointerId: null,
      offsetX: 0,
      offsetY: 0,
    };
  };

  const handleInputChange = (event) => {
    const value = event.target.value.slice(0, MAX_MESSAGE_LENGTH);

    setInput(value);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        112,
      )}px`;
    }
  };

  const handleSendMessage = async (messageOverride) => {
    const message = (
      typeof messageOverride === "string" ? messageOverride : input
    ).trim();

    if (
      !message ||
      message.length > MAX_MESSAGE_LENGTH ||
      requestInProgressRef.current
    ) {
      return;
    }

    requestInProgressRef.current = true;
    setIsLoading(true);

    setMessages((previous) => [
      ...previous,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      },
    ]);

    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const reply = await sendAIMessage(message);

      if (typeof reply !== "string" || !reply.trim()) {
        throw new Error("The AI returned an empty response. Please try again.");
      }

      setMessages((previous) => [
        ...previous,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: reply.trim(),
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          id: `error-${Date.now()}`,
          role: "error",
          content:
            error?.message ||
            "Unable to connect to the AI assistant. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      requestInProgressRef.current = false;
      setIsLoading(false);

      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSendMessage();
  };

  const handleReset = () => {
    if (requestInProgressRef.current) return;

    setMessages([createInitialMessage()]);
    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    inputRef.current?.focus();
  };

  const chatWidth = Math.min(CHAT_WIDTH, window.innerWidth - EDGE_GAP * 2);

  const chatHeight = Math.min(CHAT_HEIGHT, window.innerHeight - EDGE_GAP * 2);

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Assistant"
          title="Open AI Assistant"
          style={{
            position: "fixed",
            right: "20px",
            bottom: "20px",
          }}
          className="z-50 flex h-14 w-14 items-center justify-center rounded-full border border-blue-700 bg-blue-600 text-white transition-colors  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <MessageCircle size={25} />
        </button>
      )}

      {isOpen && (
        <section
          data-ai-chat-window
          aria-label="Hotel AI Assistant"
          style={
            isFullscreen
              ? {
                  position: "fixed",
                  inset: 0,
                  width: "100vw",
                  height: "100dvh",
                }
              : {
                  position: "fixed",
                  left: position.x,
                  top: position.y,
                  width: chatWidth,
                  height: chatHeight,
                  maxWidth: `calc(100vw - ${EDGE_GAP * 2}px)`,
                  maxHeight: `calc(100dvh - ${EDGE_GAP * 2}px)`,
                }
          }
          className={`z-50 flex flex-col overflow-hidden border border-gray-200 bg-white ${
            isFullscreen ? "" : "rounded"
          }`}
        >
          <header
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
            className={`flex touch-none items-center justify-between border-b border-gray-200 bg-black px-4 py-4 ${
              isFullscreen ? "" : "cursor-grab active:cursor-grabbing"
            }`}
            title={
              isFullscreen ? "Hotel AI Assistant" : "Drag to move the assistant"
            }
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-blue-100 bg-blue-50 text-blue-700">
                <Bot size={24} />
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-white">
                  Stay Nexa
                </h2>

                <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Hotel AI Assistant
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setIsFullscreen((value) => !value)}
                aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
                aria-pressed={isFullscreen}
                title={isFullscreen ? "Exit full screen" : "Full screen"}
                className="flex h-9 w-9 items-center justify-center rounded border border-transparent text-gray-500 transition-colors "
              >
                {isFullscreen ? (
                  <Minimize2 size={17} />
                ) : (
                  <Maximize2 size={17} />
                )}
              </button>

              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={handleReset}
                disabled={isLoading}
                aria-label="Start a new conversation"
                title="New conversation"
                className="flex h-9 w-9 items-center justify-center rounded border border-transparent text-gray-500 transition-colors  disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw size={17} />
              </button>

              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => {
                  setIsFullscreen(false);
                  setIsOpen(false);
                }}
                aria-label="Close AI Assistant"
                title="Close assistant"
                className="flex h-9 w-9 items-center justify-center rounded border border-transparent text-gray-500 transition-colors "
              >
                <X size={20} />
              </button>
            </div>
          </header>

          <div
            className={`flex-1 space-y-5 overflow-y-auto bg-gray-50/70 p-4 ${
              isFullscreen ? SIDE_PADDING : ""
            }`}
            aria-live="polite"
            aria-relevant="additions text"
          >
            {messages.map((message) => {
              const isUser = message.role === "user";
              const isError = message.role === "error";

              return (
                <div
                  key={message.id}
                  className={`flex items-end gap-2 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
            

                  <div
                    className={`flex min-w-0 flex-col ${
                      isUser
                        ? "max-w-[84%] items-end"
                        : "max-w-[92%] items-start"
                    }`}
                  >
                    <div
                      className={`min-w-0 max-w-full rounded-3xl px-3.5 py-2 text-sm leading-6 ${
                        isUser
                          ? "rounded-br-md bg-blue-600 text-white"
                          : isError
                            ? "rounded-bl-md border border-red-200 bg-red-50 text-red-700"
                            : "rounded-bl-md border border-gray-200 bg-white text-gray-800"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <AIMessage text={message.content} />
                      ) : (
                        <p className="whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      )}
                    </div>

                    {message.timestamp && (
                      <span className="mt-1 flex items-center gap-1 px-1 text-[10px] text-gray-400">
                        <Clock3 size={10} />
                        {formatTime(message.timestamp)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-end gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-blue-100 bg-blue-50 text-blue-700">
                  <Bot size={17} />
                </div>

                <div
                  className="flex items-center gap-2 rounded-full rounded-bl-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500"
                  role="status"
                  aria-label="Assistant is thinking"
                >
                  <LoaderCircle size={16} className="animate-spin" />
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          
          <div
            className={`shrink-0 border-t border-gray-200 bg-white px-3 py-1.5 ${
              isFullscreen ? SIDE_PADDING : ""
            }`}
          >
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-700">
              <Sparkles size={15} className="text-blue-600" />
              Suggested questions
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {SUGGESTED_QUESTIONS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleSendMessage(item.label)}
                  disabled={isLoading}
                  className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-2 text-left transition-colors  disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="block whitespace-nowrap text-xs font-medium text-gray-800">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className={`border-t border-gray-200 bg-white p-3 sm:p-2 ${
              isFullscreen ? SIDE_PADDING : ""
            }`}
          >
           
<div className="flex items-end gap-2 rounded-full border border-gray-300 bg-white py-1  pe-1 ps-3">
  <textarea
    ref={(element) => {
      textareaRef.current = element;
      inputRef.current = element;
    }}
    value={input}
    onChange={handleInputChange}
    onKeyDown={(event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.nativeEvent.isComposing
      ) {
        event.preventDefault();
        handleSubmit(event);
      }
    }}
    placeholder="Ask about your hotel..."
    aria-label="Message"
    rows={1}
    className="min-h-9 max-h-32 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2 text-sm leading-5 text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
  />

  <button
    type="submit"
    disabled={!input.trim() || isLoading}
    aria-label="Send message"
    title="Send message"
    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white transition-colors disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
  >
    {isLoading ? (
      <LoaderCircle size={17} className="animate-spin" />
    ) : (
      <Send size={17} />
    )}
  </button>
</div>

          </form>
        </section>
      )}
    </>
  );
}
