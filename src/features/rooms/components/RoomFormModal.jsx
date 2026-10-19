
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BedDouble,
  Building2,
  CheckCircle2,
  ClipboardList,
  DoorOpen,
  Hash,
  IndianRupee,
  Loader2,
  Save,
  Sparkles,
  Wrench,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  createRoom,
  getRoomById,
  getRoomTypes,
  updateRoom,
} from "../services/rooms.service";
import { FormSkeleton } from "../../../components/common/Skeleton";

const CREATE_STATUSES = [
  { value: "available", label: "Available", color: "emerald" },
  { value: "cleaning", label: "Cleaning", color: "amber" },
  { value: "maintenance", label: "Maintenance", color: "blue" },
  { value: "out_of_order", label: "Out of Order", color: "rose" },
];

const emptyForm = {
  roomNumber: "",
  floor: "",
  roomType: "",
  status: "available",
  priceOverride: "",
  notes: "",
};

const toForm = (room) => ({
  roomNumber: room.roomNumber || "",
  floor: room.floor ?? "",
  roomType: room.roomType?._id || room.roomType || "",
  status: room.status || "available",
  priceOverride: room.priceOverride ?? "",
  notes: room.notes || "",
});

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70";

const labelClass =
  "mb-2 block text-sm font-semibold text-slate-700";

const RoomForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);

      try {
        const [typesData, roomData] = await Promise.all([
          getRoomTypes({ isActive: true, limit: 100 }),
          isEdit ? getRoomById(id) : Promise.resolve(null),
        ]);

        if (!active) return;

        const list = [...(typesData.roomTypes || [])];
        const room = roomData ? roomData.room || roomData : null;
        const current = room?.roomType;

        if (
          current?._id &&
          !list.some((item) => item._id === current._id)
        ) {
          list.push(current);
        }

        setRoomTypes(list);

        if (room) {
          setForm(toForm(room));
        }
      } catch (error) {
        if (!active) return;

        toast.error(
          error.response?.data?.message ||
            "Could not load room details"
        );

        navigate("/rooms", { replace: true });
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [id, isEdit, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    const payload = {
      roomNumber: form.roomNumber.trim(),
      floor: Number(form.floor),
      roomType: form.roomType,
      priceOverride:
        form.priceOverride === ""
          ? null
          : Number(form.priceOverride),
      notes: form.notes.trim(),
    };

    if (!isEdit) {
      payload.status = form.status;
    }

    setSubmitting(true);

    try {
      if (isEdit) {
        await updateRoom(id, payload);
        toast.success("Room updated successfully");
      } else {
        await createRoom(payload);
        toast.success("Room created successfully");
      }

      navigate("/rooms");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Something went wrong"
      );

      setSubmitting(false);
    }
  };

  const selectedStatus =
    CREATE_STATUSES.find(
      (item) => item.value === form.status
    ) || CREATE_STATUSES[0];

  return (
    <div className="min-h-[calc(100vh-2rem)] w-full bg-slate-50/80">
      {/* Page Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="flex flex-col gap-5 px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div>
            <Link
              to="/rooms"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600"
            >
              <ArrowLeft size={17} />
              Back to Rooms
            </Link>

            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <BedDouble size={27} strokeWidth={1.8} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    {isEdit ? "Edit Room" : "Add New Room"}
                  </h1>

                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    <Sparkles size={13} />
                    {isEdit ? "Update Details" : "Room Setup"}
                  </span>
                </div>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  {isEdit
                    ? "Manage room information, pricing and property details."
                    : "Configure a new room and add it to your property's inventory."}
                </p>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:flex">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">
                Property Management
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-800">
                Room Configuration
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10">
            <FormSkeleton fields={6} />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              {/* Form Sections */}
              <div className="min-w-0 space-y-6">
                {/* Basic Information */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-7">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <DoorOpen size={22} />
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Basic Information
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Enter the room identification and category.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:gap-6 sm:p-7">
                    <div>
                      <label
                        htmlFor="roomNumber"
                        className={labelClass}
                      >
                        Room Number <span className="text-rose-500">*</span>
                      </label>

                      <div className="relative">
                        <Hash
                          size={17}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          id="roomNumber"
                          name="roomNumber"
                          value={form.roomNumber}
                          onChange={handleChange}
                          placeholder="e.g. 101"
                          required
                          disabled={submitting}
                          className={`${fieldClass} pl-11`}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        Use a unique room number.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="floor" className={labelClass}>
                        Floor Number <span className="text-rose-500">*</span>
                      </label>

                      <div className="relative">
                        <Building2
                          size={17}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          id="floor"
                          type="number"
                          min="0"
                          name="floor"
                          value={form.floor}
                          onChange={handleChange}
                          placeholder="e.g. 1"
                          required
                          disabled={submitting}
                          className={`${fieldClass} pl-11`}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        Enter the floor where the room is located.
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="roomType" className={labelClass}>
                        Room Type <span className="text-rose-500">*</span>
                      </label>

                      <select
                        id="roomType"
                        name="roomType"
                        value={form.roomType}
                        onChange={handleChange}
                        required
                        disabled={submitting}
                        className={fieldClass}
                      >
                        <option value="">Select a room type</option>
                        {roomTypes.map((type) => (
                          <option key={type._id} value={type._id}>
                            {type.name}
                          </option>
                        ))}
                      </select>

                      {roomTypes.length === 0 && (
                        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm text-amber-800">
                            No room types are available yet.
                          </p>

                          <Link
                            to="/rooms/types/new"
                            className="inline-flex items-center gap-1 text-sm font-bold text-amber-900 underline underline-offset-4"
                          >
                            Create room type
                            <ArrowLeft
                              size={14}
                              className="rotate-180"
                            />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Pricing & Status */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-7">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <IndianRupee size={22} />
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Pricing & Availability
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Set an optional room-specific price and initial status.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6 p-5 sm:p-7">
                    <div>
                      <label
                        htmlFor="priceOverride"
                        className={labelClass}
                      >
                        Custom Price
                        <span className="ml-2 font-normal text-slate-400">
                          (Optional)
                        </span>
                      </label>

                      <div className="relative">
                        <IndianRupee
                          size={17}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          id="priceOverride"
                          type="number"
                          min="0"
                          name="priceOverride"
                          value={form.priceOverride}
                          onChange={handleChange}
                          placeholder="Enter custom room price"
                          disabled={submitting}
                          className={`${fieldClass} pl-11`}
                        />
                      </div>

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Leave empty to use the room type's base price.
                      </p>
                    </div>

                    {!isEdit && (
                      <div>
                        <label className={labelClass}>
                          Initial Room Status
                        </label>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {CREATE_STATUSES.map((item) => {
                            const active = form.status === item.value;

                            const colors = {
                              emerald: active
                                ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/10"
                                : "border-slate-200 hover:border-emerald-300",
                              amber: active
                                ? "border-amber-500 bg-amber-50 ring-2 ring-amber-500/10"
                                : "border-slate-200 hover:border-amber-300",
                              blue: active
                                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/10"
                                : "border-slate-200 hover:border-blue-300",
                              rose: active
                                ? "border-rose-500 bg-rose-50 ring-2 ring-rose-500/10"
                                : "border-slate-200 hover:border-rose-300",
                            };

                            const dotColors = {
                              emerald: "bg-emerald-500",
                              amber: "bg-amber-500",
                              blue: "bg-blue-500",
                              rose: "bg-rose-500",
                            };

                            return (
                              <button
                                key={item.value}
                                type="button"
                                disabled={submitting}
                                onClick={() =>
                                  setForm((prev) => ({
                                    ...prev,
                                    status: item.value,
                                  }))
                                }
                                className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${colors[item.color]}`}
                              >
                                <span className="flex items-center gap-3">
                                  <span
                                    className={`h-2.5 w-2.5 rounded-full ${dotColors[item.color]}`}
                                  />
                                  <span className="text-sm font-semibold text-slate-700">
                                    {item.label}
                                  </span>
                                </span>

                                {active && (
                                  <CheckCircle2
                                    size={18}
                                    className="text-slate-700"
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Notes */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-7">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                      <ClipboardList size={22} />
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Additional Notes
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Add helpful information for your hotel staff.
                      </p>
                    </div>
                  </div>

                  <div className="p-5 sm:p-7">
                    <label htmlFor="notes" className={labelClass}>
                      Room Notes
                      <span className="ml-2 font-normal text-slate-400">
                        (Optional)
                      </span>
                    </label>

                    <textarea
                      id="notes"
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      rows={5}
                      placeholder="e.g. Sea view, near the elevator, extra bed available..."
                      disabled={submitting}
                      className={`${fieldClass} resize-y`}
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      Include any room-specific details that your team should know.
                    </p>
                  </div>
                </section>
              </div>

              {/* Right Summary Panel */}
              <aside className="space-y-5">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40 xl:sticky xl:top-6">
                  <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-6 text-white">
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
                        <BedDouble size={25} />
                      </div>

                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100">
                        Room Preview
                      </span>
                    </div>

                    <p className="text-sm text-slate-300">
                      {isEdit ? "Editing room" : "New room"}
                    </p>

                    <h2 className="mt-2 break-words text-3xl font-bold tracking-tight">
                      {form.roomNumber.trim() || "Room Number"}
                    </h2>

                    <p className="mt-2 text-sm text-slate-300">
                      {form.roomType
                        ? roomTypes.find(
                            (type) => type._id === form.roomType
                          )?.name || "Selected room type"
                        : "No room type selected"}
                    </p>
                  </div>

                  <div className="space-y-5 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-500">
                        Floor
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {form.floor !== "" ? form.floor : "—"}
                      </span>
                    </div>

                    <div className="h-px bg-slate-100" />

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-500">
                        Room Type
                      </span>
                      <span className="max-w-[60%] text-right text-sm font-bold text-slate-800">
                        {roomTypes.find(
                          (type) => type._id === form.roomType
                        )?.name || "Not selected"}
                      </span>
                    </div>

                    <div className="h-px bg-slate-100" />

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-500">
                        Custom Price
                      </span>
                      <span className="text-sm font-bold text-slate-800">
                        {form.priceOverride !== ""
                          ? `₹${Number(form.priceOverride).toLocaleString("en-IN")}`
                          : "Base price"}
                      </span>
                    </div>

                    <div className="h-px bg-slate-100" />

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-500">
                        Initial Status
                      </span>

                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            selectedStatus.color === "emerald"
                              ? "bg-emerald-500"
                              : selectedStatus.color === "amber"
                                ? "bg-amber-500"
                                : selectedStatus.color === "blue"
                                  ? "bg-blue-500"
                                  : "bg-rose-500"
                          }`}
                        />
                        {isEdit
                          ? "Existing room"
                          : selectedStatus.label}
                      </span>
                    </div>

                    <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                      <div className="flex gap-3">
                        <div className="mt-0.5 text-blue-600">
                          <Wrench size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            Before you save
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            Verify the room number, floor and room type before submitting.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </div>

            {/* Sticky Action Bar */}
            <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="hidden text-sm text-slate-500 sm:block">
                  <span className="text-rose-500">*</span>{" "}
                  Required fields must be completed.
                </p>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => navigate("/rooms")}
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ArrowLeft size={16} />
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting || roomTypes.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-blue-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <Save size={17} />
                    )}

                    {submitting
                      ? "Saving..."
                      : isEdit
                        ? "Update Room"
                        : "Create Room"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default RoomForm;
