import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import toast from "react-hot-toast";

import { FormSkeleton } from "../../../components/common/Skeleton";
import { getRooms } from "../../rooms/services/rooms.service";
import { createTask, getAssignableStaff } from "../services/housekeeping.service";
import {
  PRIORITY_OPTIONS,
  TASK_TYPE_OPTIONS,
  getErrorMessage,
} from "../housekeeping.utils";

const BACK_PATH = "/housekeeping";
const MAX_CHECKLIST_ITEMS = 100;

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 disabled:opacity-60";
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
  <section className="rounded border border-slate-200 bg-white p-4 sm:p-6">
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
    (item) => !checklist.some((added) => added.toLowerCase() === item.toLowerCase())
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
      if (name === "taskType") {
        if (value === "public_area_cleaning") next.room = "";
        else next.area = "";
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
    setChecklist((previous) => {
      const unique = suggestions.filter(
        (item) => !previous.some((added) => added.toLowerCase() === item.toLowerCase())
      );
      return [...previous, ...unique].slice(0, MAX_CHECKLIST_ITEMS);
    });
  };

  const removeItem = (index) =>
    setChecklist((previous) => previous.filter((_, i) => i !== index));

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
    <div className="space-y-4">
      <header>
        <Link
          to={BACK_PATH}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600"
        >
          <ArrowLeft size={16} />
          Back to Housekeeping
        </Link>
        <h1 className="mt-3 text-xl font-bold text-slate-900">New Task</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
          Create a cleaning or maintenance task and optionally assign it to a staff member.
        </p>
      </header>

      {loading ? (
        <div className="rounded border border-slate-200 bg-white p-4 sm:p-6">
          <FormSkeleton fields={6} />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <SectionCard title="Task Details" description="What needs to be done, and where.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              <div>
                <label htmlFor="taskType" className={labelClass}>
                  Task Type <span className="text-rose-500">*</span>
                </label>
                <select id="taskType" name="taskType" value={form.taskType} onChange={handleChange} disabled={submitting} className={inputClass}>
                  {TASK_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="priority" className={labelClass}>Priority</label>
                <select id="priority" name="priority" value={form.priority} onChange={handleChange} disabled={submitting} className={inputClass}>
                  {PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              {isPublicArea ? (
                <div className="sm:col-span-2">
                  <label htmlFor="area" className={labelClass}>Area Name <span className="text-rose-500">*</span></label>
                  <input id="area" name="area" value={form.area} onChange={handleChange} placeholder="e.g. Main Lobby, Reception, Corridor 2nd Floor" maxLength={150} disabled={submitting} className={inputClass} />
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <label htmlFor="room" className={labelClass}>Room <span className="text-rose-500">*</span></label>
                  <select id="room" name="room" value={form.room} onChange={handleChange} disabled={submitting} className={inputClass}>
                    <option value="">Select a room</option>
                    {rooms.map((room) => (
                      <option key={room._id} value={room._id}>
                        Room {room.roomNumber} - Floor {room.floor ?? "-"}{room.status ? ` (${String(room.status).replace(/_/g, " ")})` : ""}
                      </option>
                    ))}
                  </select>
                  {rooms.length === 0 && <p className="mt-1.5 text-xs text-amber-700">No rooms found. Add rooms before creating room tasks.</p>}
                </div>
              )}
              {isMaintenance && (
                <div className="sm:col-span-2">
                  <label htmlFor="maintenanceDetails" className={labelClass}>Maintenance Details</label>
                  <textarea id="maintenanceDetails" name="maintenanceDetails" value={form.maintenanceDetails} onChange={handleChange} rows={3} maxLength={2000} placeholder="Describe the issue, e.g. AC is not cooling, tap is leaking" disabled={submitting} className={inputClass} />
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Schedule & Assignment" description="When the task should be done, and who will do it.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              <div>
                <label htmlFor="scheduledAt" className={labelClass}>Scheduled For</label>
                <input id="scheduledAt" type="datetime-local" name="scheduledAt" value={form.scheduledAt} onChange={handleChange} required disabled={submitting} className={inputClass} />
              </div>
              <div>
                <label htmlFor="assignedTo" className={labelClass}>Assign To (optional)</label>
                <select id="assignedTo" name="assignedTo" value={form.assignedTo} onChange={handleChange} disabled={submitting || staffError} className={inputClass}>
                  <option value="">Leave unassigned</option>
                  {staff.map((member) => <option key={member._id} value={member._id}>{member.name}{member.designation ? ` - ${member.designation}` : ""}</option>)}
                </select>
                {staffError ? (
                  <p className="mt-1.5 text-xs text-amber-700">Could not load the staff list. You can create the task now and assign it later.</p>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-500">{form.assignedTo ? "The task will be created as Assigned." : "The task will be created as Pending."}</p>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Checklist" description="Steps the staff member must tick off. A task cannot be completed until every step is done.">
            {suggestions.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-slate-600">Suggested steps</p>
                  <button type="button" onClick={addAllSuggestions} disabled={submitting || checklist.length >= MAX_CHECKLIST_ITEMS} className="rounded px-2 py-1 text-xs font-semibold text-indigo-700 disabled:opacity-50">Add all</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((item) => (
                    <button key={item} type="button" onClick={() => addItem(item)} disabled={submitting || checklist.length >= MAX_CHECKLIST_ITEMS} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs text-slate-700 disabled:opacity-50">
                      <Plus size={12} />{item}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={newItem} onChange={(event) => setNewItem(event.target.value)} onKeyDown={handleItemKey} placeholder="Type a step and press Enter" maxLength={200} disabled={submitting || checklist.length >= MAX_CHECKLIST_ITEMS} aria-label="New checklist item" className={inputClass} />
              <button type="button" onClick={handleAddItem} disabled={submitting || !newItem.trim() || checklist.length >= MAX_CHECKLIST_ITEMS} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                <Plus size={15} />Add
              </button>
            </div>
            {checklist.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-slate-500">No steps added yet. The task can be completed without a checklist.</p>
            ) : (
              <ol className="mt-4 space-y-2">
                {checklist.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex min-w-0 items-center gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-500">{index + 1}</span>
                    <span className="min-w-0 flex-1 break-words text-sm text-slate-800">{item}</span>
                    <button type="button" onClick={() => removeItem(index)} disabled={submitting} aria-label={`Remove ${item}`} className="rounded p-1.5 text-slate-500 disabled:opacity-50">
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-3 text-right text-xs text-slate-400">{checklist.length}/{MAX_CHECKLIST_ITEMS} steps</p>
          </SectionCard>

          <SectionCard title="Notes" description="Anything the staff member should know before starting.">
            <label htmlFor="notes" className="sr-only">Notes</label>
            <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} rows={4} maxLength={2000} placeholder="e.g. Guest has a late check-in, use hypoallergenic pillows" disabled={submitting} className={inputClass} />
            <p className="mt-1.5 text-right text-xs text-slate-400">{form.notes.length}/2000</p>
          </SectionCard>

          <div className="flex flex-col gap-4 rounded border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <p className="text-xs text-slate-500"><span className="text-rose-500">*</span> Required fields</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
              <button type="button" onClick={() => navigate(BACK_PATH)} disabled={submitting} className="rounded border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-60">Cancel</button>
              <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded bg-black px-6 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70">
                {submitting && <Loader2 size={16} />}
                {submitting ? "Creating Task..." : "Create Task"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default HousekeepingForm;
