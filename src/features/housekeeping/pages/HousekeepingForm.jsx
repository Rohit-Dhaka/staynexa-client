import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import toast from "react-hot-toast";

import { FormSkeleton } from "../../../components/common/Skeleton";
import { getRooms } from "../../rooms/services/rooms.service";
import {
  createTask,
  getAssignableStaff,
} from "../services/housekeeping.service";
import {
  PRIORITY_OPTIONS,
  TASK_TYPE_OPTIONS,
  getErrorMessage,
} from "../housekeeping.utils";

const BACK_PATH = "/housekeeping";
const MAX_CHECKLIST_ITEMS = 100;

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60";
const labelClass = "mb-1 block text-xs font-medium text-slate-700";

const CHECKLIST_TEMPLATES = {
  room_cleaning: [
    "Make the bed",
    "Dust all surfaces",
    "Vacuum or mop the floor",
    "Clean the bathroom",
    "Replace towels",
    "Refill toiletries and amenities",
    "Empty the bins",
  ],
  bathroom_cleaning: [
    "Clean the toilet and sink",
    "Clean the shower or bathtub",
    "Wipe mirrors and fittings",
    "Mop the floor",
    "Replace towels",
    "Refill toiletries",
  ],
  linen_change: [
    "Remove used bed linen",
    "Make the bed with fresh linen",
    "Replace pillow covers",
    "Send used linen to laundry",
  ],
  deep_cleaning: [
    "Move and clean behind furniture",
    "Clean windows and curtains",
    "Clean the AC filters",
    "Shampoo carpets or sofas",
    "Disinfect high-touch surfaces",
  ],
  maintenance: [
    "Inspect the reported issue",
    "Repair or replace the faulty part",
    "Test that everything works",
    "Clean up after the repair",
  ],
  restocking: [
    "Check the minibar",
    "Restock toiletries",
    "Restock tea and coffee supplies",
    "Restock towels and linen",
  ],
  laundry: [
    "Collect the laundry",
    "Sort the items",
    "Wash and dry",
    "Fold and deliver",
  ],
  public_area_cleaning: [
    "Sweep and mop the floor",
    "Dust furniture and fixtures",
    "Clean glass and mirrors",
    "Empty the bins",
  ],
  other: [],
};

const toLocalInput = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const emptyForm = () => ({
  taskType: "room_cleaning",
  priority: "normal",
  room: "",
  area: "",
  scheduledAt: toLocalInput(),
  assignedTo: "",
  notes: "",
  maintenanceDetails: "",
});

const getPayload = (response) => response?.data ?? response ?? {};

const Field = ({ label, htmlFor, required, children }) => (
  <div className="min-w-0">
    <label htmlFor={htmlFor} className={labelClass}>
      {label}
      {required && <span className="ml-1 text-rose-500">*</span>}
    </label>
    {children}
  </div>
);

const Section = ({ title, children, className = "" }) => (
  <section
    className={`rounded border border-slate-200 bg-white p-4 ${className}`}
  >
    <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
    {children}
  </section>
);

const HousekeepingForm = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [checklist, setChecklist] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [rooms, setRooms] = useState([]);
  const [staff, setStaff] = useState([]);
  const [roomsError, setRoomsError] = useState(false);
  const [staffError, setStaffError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isPublicArea = form.taskType === "public_area_cleaning";
  const isMaintenance = form.taskType === "maintenance";

  const suggestions = (CHECKLIST_TEMPLATES[form.taskType] || []).filter(
    (item) =>
      !checklist.some(
        (added) => added.toLowerCase() === item.toLowerCase()
      )
  );

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      const [roomsResult, staffResult] = await Promise.allSettled([
        getRooms({ isActive: true, limit: 100 }),
        getAssignableStaff(),
      ]);

      if (!active) return;

      if (roomsResult.status === "fulfilled") {
        const payload = getPayload(roomsResult.value);
        const roomList = Array.isArray(payload)
          ? payload
          : payload?.rooms ?? payload?.items ?? [];
        setRooms(Array.isArray(roomList) ? roomList : []);
        setRoomsError(false);
      } else {
        setRoomsError(true);
        toast.error("Could not load rooms");
      }

      if (staffResult.status === "fulfilled") {
        const payload = getPayload(staffResult.value);
        const staffList = Array.isArray(payload)
          ? payload
          : payload?.staff ?? payload?.users ?? [];
        setStaff(Array.isArray(staffList) ? staffList : []);
        setStaffError(false);
      } else {
        setStaffError(true);
      }

      setLoading(false);
    };

    loadOptions();

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => {
      const next = { ...previous, [name]: value };

      // Public-area tasks use an area name instead of a room ID.
      if (name === "taskType") {
        if (value === "public_area_cleaning") {
          next.room = "";
        } else {
          next.area = "";
        }
      }

      return next;
    });
  };

  const addItem = (title) => {
    const text = title.trim();

    if (!text) return;
    if (text.length > 200) {
      toast.error("A checklist item cannot exceed 200 characters");
      return;
    }
    if (checklist.length >= MAX_CHECKLIST_ITEMS) {
      toast.error(`A checklist cannot exceed ${MAX_CHECKLIST_ITEMS} items`);
      return;
    }
    if (
      checklist.some(
        (item) => item.toLowerCase() === text.toLowerCase()
      )
    ) {
      toast.error("This item is already in the checklist");
      return;
    }

    setChecklist((previous) => [...previous, text]);
  };

  const handleAddItem = () => {
    addItem(newItem);
    setNewItem("");
  };

  const handleAddAllSuggestions = () => {
    const remaining = MAX_CHECKLIST_ITEMS - checklist.length;

    if (remaining <= 0) {
      toast.error(`A checklist cannot exceed ${MAX_CHECKLIST_ITEMS} items`);
      return;
    }

    setChecklist((previous) => {
      const uniqueSuggestions = suggestions.filter(
        (item) =>
          !previous.some(
            (existing) =>
              existing.toLowerCase() === item.toLowerCase()
          )
      );

      if (uniqueSuggestions.length > remaining) {
        toast.error(`Only ${remaining} more checklist items can be added`);
      }

      return [...previous, ...uniqueSuggestions.slice(0, remaining)];
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    if (isPublicArea && !form.area.trim()) {
      toast.error("Enter the area name for a public area task");
      return;
    }

    if (!isPublicArea && !form.room) {
      toast.error("Select a room for this task");
      return;
    }

    const scheduled = new Date(form.scheduledAt);

    if (!form.scheduledAt || Number.isNaN(scheduled.getTime())) {
      toast.error("Enter a valid scheduled date and time");
      return;
    }

    const payload = {
      taskType: form.taskType,
      priority: form.priority,
      scheduledAt: scheduled.toISOString(),
      notes: form.notes.trim(),
      checklist: checklist.map((title) => ({ title })),
    };

    if (isPublicArea) {
      payload.area = form.area.trim();
    } else {
      payload.room = form.room;
    }

    if (form.assignedTo) {
      payload.assignedTo = form.assignedTo;
    }

    if (isMaintenance && form.maintenanceDetails.trim()) {
      payload.maintenanceDetails = form.maintenanceDetails.trim();
    }

    setSubmitting(true);

    try {
      // Create mode only: never call getTask(id) here because this route is
      // /housekeeping/new and it does not have a task ID.
      await createTask(payload);
      toast.success("Housekeeping task created successfully");
      navigate(BACK_PATH, { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not create housekeeping task"));
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 pb-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={BACK_PATH}
            aria-label="Back to housekeeping"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft size={17} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold leading-6 text-slate-900">
              New Housekeeping Task
            </h1>
            <p className="text-xs text-slate-500">
              Create, schedule and assign a task
            </p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="rounded border border-slate-200 bg-white p-4">
          <FormSkeleton fields={5} />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <Section title="Task Details">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Task Type" htmlFor="taskType" required>
                <select
                  id="taskType"
                  name="taskType"
                  value={form.taskType}
                  onChange={handleChange}
                  disabled={submitting}
                  className={inputClass}
                >
                  {TASK_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Priority" htmlFor="priority">
                <select
                  id="priority"
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  disabled={submitting}
                  className={inputClass}
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              {isPublicArea ? (
                <div className="sm:col-span-2">
                  <Field label="Area Name" htmlFor="area" required>
                    <input
                      id="area"
                      name="area"
                      value={form.area}
                      onChange={handleChange}
                      placeholder="e.g. Main Lobby, Reception"
                      maxLength={150}
                      required
                      disabled={submitting}
                      className={inputClass}
                    />
                  </Field>
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <Field label="Room" htmlFor="room" required>
                    <select
                      id="room"
                      name="room"
                      value={form.room}
                      onChange={handleChange}
                      required
                      disabled={submitting || roomsError || rooms.length === 0}
                      className={inputClass}
                    >
                      <option value="">Select room</option>
                      {rooms.map((room) => (
                        <option key={room._id || room.id} value={room._id || room.id}>
                          Room {room.roomNumber ?? room.number ?? "—"} · Floor{" "}
                          {room.floor ?? "—"}
                          {room.status
                            ? ` · ${String(room.status).replace(/_/g, " ")}`
                            : ""}
                        </option>
                      ))}
                    </select>
                    {roomsError ? (
                      <p className="mt-1 text-xs text-amber-600">
                        Could not load rooms. Refresh the page and try again.
                      </p>
                    ) : rooms.length === 0 ? (
                      <p className="mt-1 text-xs text-amber-600">
                        No rooms found. Add rooms first, or choose Public Area
                        Cleaning for an area task.
                      </p>
                    ) : null}
                  </Field>
                </div>
              )}

              {isMaintenance && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <Field label="Issue Details" htmlFor="maintenanceDetails">
                    <textarea
                      id="maintenanceDetails"
                      name="maintenanceDetails"
                      value={form.maintenanceDetails}
                      onChange={handleChange}
                      rows={2}
                      maxLength={2000}
                      placeholder="e.g. AC is not cooling, tap is leaking"
                      disabled={submitting}
                      className={inputClass}
                    />
                  </Field>
                </div>
              )}
            </div>
          </Section>

          <Section title="Schedule & Assignment">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Scheduled For" htmlFor="scheduledAt" required>
                <input
                  id="scheduledAt"
                  type="datetime-local"
                  name="scheduledAt"
                  value={form.scheduledAt}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                  className={inputClass}
                />
              </Field>

              <Field label="Assign To" htmlFor="assignedTo">
                <select
                  id="assignedTo"
                  name="assignedTo"
                  value={form.assignedTo}
                  onChange={handleChange}
                  disabled={submitting || staffError}
                  className={inputClass}
                >
                  <option value="">Unassigned</option>
                  {staff.map((member) => (
                    <option
                      key={member._id || member.id}
                      value={member._id || member.id}
                    >
                      {member.name || member.fullName || "Staff member"}
                      {member.designation ? ` · ${member.designation}` : ""}
                    </option>
                  ))}
                </select>
                {staffError && (
                  <p className="mt-1 text-xs text-amber-600">
                    Staff list unavailable. You can assign the task later.
                  </p>
                )}
              </Field>
            </div>
          </Section>

          <Section title={`Checklist${checklist.length ? ` (${checklist.length})` : ""}`}>
            {suggestions.length > 0 && (
              <div className="mb-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">Quick add</span>
                  <button
                    type="button"
                    onClick={handleAddAllSuggestions}
                    disabled={submitting}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                  >
                    Add all
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => addItem(item)}
                      disabled={submitting || checklist.length >= MAX_CHECKLIST_ITEMS}
                      className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50"
                    >
                      <Plus size={12} />
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <input
                value={newItem}
                onChange={(event) => setNewItem(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddItem();
                  }
                }}
                placeholder="Add a checklist step…"
                maxLength={200}
                disabled={submitting || checklist.length >= MAX_CHECKLIST_ITEMS}
                aria-label="New checklist item"
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleAddItem}
                disabled={submitting || !newItem.trim() || checklist.length >= MAX_CHECKLIST_ITEMS}
                className="inline-flex shrink-0 items-center gap-1 rounded bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                <Plus size={15} />
                Add
              </button>
            </div>

            {checklist.length > 0 && (
              <ol className="mt-3 grid grid-cols-1 gap-1.5 md:grid-cols-2">
                {checklist.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="flex min-w-0 items-center gap-2 rounded bg-slate-50 px-2.5 py-2"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-xs text-slate-700">
                      {item}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setChecklist((previous) =>
                          previous.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                      disabled={submitting}
                      aria-label={`Remove ${item}`}
                      className="shrink-0 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section title="Notes">
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              maxLength={2000}
              placeholder="Any special instructions for staff…"
              disabled={submitting}
              className={inputClass}
            />
          </Section>

          <div className="flex items-center justify-end gap-2 rounded border border-slate-200 bg-white p-3">
            <button
              type="button"
              onClick={() => navigate(BACK_PATH)}
              disabled={submitting}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loading}
              className="inline-flex items-center justify-center gap-2 rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              Create Task
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default HousekeepingForm;
