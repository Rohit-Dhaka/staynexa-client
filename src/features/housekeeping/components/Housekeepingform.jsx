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
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60";

const labelClass = "mb-1.5 block text-xs font-medium text-slate-700";

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

// Value for a <input type="datetime-local"> in the user's own time zone.
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

const SectionCard = ({ title, description, children }) => (
  <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
    <div className="mb-5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {description && (
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      )}
    </div>
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
  const [staffError, setStaffError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isPublicArea = form.taskType === "public_area_cleaning";
  const isMaintenance = form.taskType === "maintenance";
  const suggestions = (CHECKLIST_TEMPLATES[form.taskType] || []).filter(
    (item) =>
      !checklist.some((added) => added.toLowerCase() === item.toLowerCase())
  );

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      getRooms({ isActive: true, limit: 100 }),
      getAssignableStaff(),
    ]).then(([roomsResult, staffResult]) => {
      if (!active) return;

      if (roomsResult.status === "fulfilled") {
        setRooms(roomsResult.value?.rooms || []);
      } else {
        toast.error("Could not load rooms");
      }

      if (staffResult.status === "fulfilled") {
        const value = staffResult.value;
        setStaff(Array.isArray(value) ? value : value?.staff || []);
      } else {
        // The task can still be created and assigned later.
        setStaffError(true);
      }

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => {
      const next = { ...previous, [name]: value };

      // A public-area task has no room; every other task has no area name.
      if (name === "taskType") {
        if (value === "public_area_cleaning") next.room = "";
        else next.area = "";
      }

      return next;
    });
  };

  /* ------------------------------ Checklist ------------------------------ */

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

    if (checklist.some((item) => item.toLowerCase() === text.toLowerCase())) {
      toast.error("This item is already in the checklist");
      return;
    }

    setChecklist((previous) => [...previous, text]);
  };

  const handleAddItem = () => {
    addItem(newItem);
    setNewItem("");
  };

  const handleItemKey = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddItem();
    }
  };

  const addAllSuggestions = () => {
    setChecklist((previous) =>
      [...previous, ...suggestions].slice(0, MAX_CHECKLIST_ITEMS)
    );
  };

  const removeItem = (index) =>
    setChecklist((previous) => previous.filter((_, i) => i !== index));

  /* ------------------------------- Submit ------------------------------- */

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
    if (Number.isNaN(scheduled.getTime())) {
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

    if (isPublicArea) payload.area = form.area.trim();
    else payload.room = form.room;

    if (form.assignedTo) payload.assignedTo = form.assignedTo;

    if (isMaintenance && form.maintenanceDetails.trim()) {
      payload.maintenanceDetails = form.maintenanceDetails.trim();
    }

    setSubmitting(true);

    try {
      await createTask(payload);
      toast.success("Housekeeping task created successfully");
      navigate(BACK_PATH);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setSubmitting(false);
    }
  };

  return (
    <div className=" space-y-3  ">
      <div>
        <Link
          to={BACK_PATH}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Housekeeping
        </Link>
        <h1 className="mt-3 text-xl font-bold text-slate-900">New Task</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a cleaning or maintenance task and optionally assign it to a
          staff member.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <FormSkeleton fields={6} />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Task details */}
          <SectionCard
            title="Task Details"
            description="What needs to be done, and where."
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="taskType" className={labelClass}>
                  Task Type <span className="text-rose-500">*</span>
                </label>
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
              </div>

              <div>
                <label htmlFor="priority" className={labelClass}>
                  Priority
                </label>
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
              </div>

              {isPublicArea ? (
                <div className="sm:col-span-2">
                  <label htmlFor="area" className={labelClass}>
                    Area Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="area"
                    name="area"
                    value={form.area}
                    onChange={handleChange}
                    placeholder="e.g. Main Lobby, Reception, Corridor 2nd Floor"
                    maxLength={150}
                    disabled={submitting}
                    className={inputClass}
                  />
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <label htmlFor="room" className={labelClass}>
                    Room <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="room"
                    name="room"
                    value={form.room}
                    onChange={handleChange}
                    disabled={submitting}
                    className={inputClass}
                  >
                    <option value="">Select a room</option>
                    {rooms.map((room) => (
                      <option key={room._id} value={room._id}>
                        Room {room.roomNumber} - Floor {room.floor ?? "-"}
                        {room.status
                          ? ` (${String(room.status).replace(/_/g, " ")})`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {rooms.length === 0 && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      No rooms found. Add rooms before creating room tasks.
                    </p>
                  )}
                </div>
              )}

              {isMaintenance && (
                <div className="sm:col-span-2">
                  <label htmlFor="maintenanceDetails" className={labelClass}>
                    Maintenance Details
                  </label>
                  <textarea
                    id="maintenanceDetails"
                    name="maintenanceDetails"
                    value={form.maintenanceDetails}
                    onChange={handleChange}
                    rows={3}
                    maxLength={2000}
                    placeholder="Describe the issue, e.g. AC is not cooling, tap is leaking"
                    disabled={submitting}
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          </SectionCard>

          {/* Schedule and assignment */}
          <SectionCard
            title="Schedule & Assignment"
            description="When the task should be done, and who will do it."
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="scheduledAt" className={labelClass}>
                  Scheduled For
                </label>
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
              </div>

              <div>
                <label htmlFor="assignedTo" className={labelClass}>
                  Assign To (optional)
                </label>
                <select
                  id="assignedTo"
                  name="assignedTo"
                  value={form.assignedTo}
                  onChange={handleChange}
                  disabled={submitting || staffError}
                  className={inputClass}
                >
                  <option value="">Leave unassigned</option>
                  {staff.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name}
                      {member.designation ? ` - ${member.designation}` : ""}
                    </option>
                  ))}
                </select>
                {staffError ? (
                  <p className="mt-1.5 text-xs text-amber-600">
                    Could not load the staff list. You can create the task now
                    and assign it later.
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-500">
                    {form.assignedTo
                      ? "The task will be created as Assigned."
                      : "The task will be created as Pending."}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Checklist */}
          <SectionCard
            title="Checklist"
            description="Steps the staff member must tick off. A task cannot be completed until every step is done."
          >
            {suggestions.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-slate-600">
                    Suggested steps
                  </p>
                  <button
                    type="button"
                    onClick={addAllSuggestions}
                    disabled={submitting}
                    className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-800 disabled:opacity-50"
                  >
                    Add all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => addItem(item)}
                      disabled={submitting}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
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
                onKeyDown={handleItemKey}
                placeholder="Type a step and press Enter"
                maxLength={200}
                disabled={submitting}
                aria-label="New checklist item"
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleAddItem}
                disabled={submitting || !newItem.trim()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={15} />
                Add
              </button>
            </div>

            {checklist.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No steps added yet. The task can be completed without a
                checklist.
              </p>
            ) : (
              <ol className="mt-4 space-y-2">
                {checklist.map((item, index) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-sm text-slate-800">
                      {item}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={submitting}
                      aria-label={`Remove ${item}`}
                      className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>

          {/* Notes */}
          <SectionCard
            title="Notes"
            description="Anything the staff member should know before starting."
          >
            <label htmlFor="notes" className="sr-only">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={4}
              maxLength={2000}
              placeholder="e.g. Guest has a late check-in, use hypoallergenic pillows"
              disabled={submitting}
              className={inputClass}
            />
            <p className="mt-1.5 text-right text-xs text-slate-400">
              {form.notes.length}/2000
            </p>
          </SectionCard>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              <span className="text-rose-500">*</span> Required fields
            </p>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate(BACK_PATH)}
                disabled={submitting}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Create Task
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default HousekeepingForm;