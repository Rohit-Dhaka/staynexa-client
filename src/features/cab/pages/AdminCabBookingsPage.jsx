import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
  MapPin,
  Phone,
  Play,
  RefreshCw,
  Search,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { Skeleton, TableSkeleton } from "../../../components/common/Skeleton";
import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import {
  acceptCabBooking,
  assignCabResources,
  completeCabTrip,
  getAvailableCabResources,
  getCabBookings,
  rejectCabBooking,
  startCabTrip,
} from "../services/cab.service";

/* --------------------------------- Config --------------------------------- */

const LIMIT = 10;

const TABS = [
  { key: "pending", label: "New requests", params: { view: "pending" } },
  { key: "today", label: "Today", params: { view: "today" } },
  { key: "upcoming", label: "Upcoming", params: { view: "upcoming" } },
  { key: "past", label: "Past", params: { view: "past" } },
  { key: "all", label: "All", params: {} },
];

const STATUS_META = {
  requested: { label: "New request", badge: "bg-amber-50 text-amber-700" },
  confirmed: { label: "Accepted", badge: "bg-black text-indigo-700" },
  assigned: { label: "Driver assigned", badge: "bg-sky-50 text-sky-700" },
  in_progress: { label: "On trip", badge: "bg-emerald-50 text-emerald-700" },
  completed: { label: "Completed", badge: "bg-slate-100 text-slate-600" },
  cancelled: { label: "Cancelled", badge: "bg-rose-50 text-rose-700" },
  rejected: { label: "Rejected", badge: "bg-rose-50 text-rose-700" },
};

const TRIP_LABELS = {
  airport_pickup: "Airport pickup",
  airport_drop: "Airport drop",
  local: "Local trip",
  outstation: "Outstation",
  point_to_point: "Point to point",
};

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded bg-[#1a1a1a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

/* -------------------------------- Helpers --------------------------------- */

const getList = (data) => data?.cabs || data?.items || data?.bookings || [];

const errorText = (error, fallback) => error?.response?.data?.message || fallback;

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const useDebounce = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

const getTotalPages = (meta) =>
  meta?.totalPages ||
  Math.ceil((meta?.total || 0) / (meta?.limit || LIMIT)) ||
  1;

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status];

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
        meta?.badge || "bg-slate-100 text-slate-600"
      }`}
    >
      {meta?.label || status}
    </span>
  );
};

/* ------------------------- Action panel: reject --------------------------- */

const RejectPanel = ({ cab, busy, onSubmit, onClose }) => {
  const [reason, setReason] = useState("");

  const submit = (event) => {
    event.preventDefault();
    if (!reason.trim()) return toast.error("Enter a reason for rejecting this request");
    onSubmit(reason.trim());
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Reject request {cab.cabNumber}
        </h2>
        <p className="text-sm text-slate-500">
          The guest will see this reason in their notification.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-700">
          Reason <span className="text-rose-600">*</span>
        </label>
        <textarea
          rows={3}
          maxLength={300}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="For example: No cab is available at that time"
          className={inputClass}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onClose} disabled={busy} className={secondaryButton}>
          Close
        </button>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          Reject request
        </button>
      </div>
    </form>
  );
};

/* ------------------------- Action panel: assign --------------------------- */

const PickList = ({ title, items, value, onChange, renderLine, empty }) => (
  <div>
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {title}
    </p>

    {items.length === 0 ? (
      <p className="rounded border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">
        {empty}
      </p>
    ) : (
      <div className="space-y-2">
        {items.map((item) => (
          <label
            key={item._id}
            className={`flex cursor-pointer items-start gap-3 rounded border px-3 py-2.5 text-sm transition ${
              item.available
                ? value === item._id
                  ? "border-indigo-500 bg-black/50"
                  : "border-slate-200 hover:bg-slate-50"
                : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
            }`}
          >
            <input
              type="radio"
              name={title}
              disabled={!item.available}
              checked={value === item._id}
              onChange={() => onChange(item._id)}
              className="mt-1"
            />
            <span className="min-w-0 flex-1">
              {renderLine(item)}
              {!item.available && item.reason && (
                <span className="mt-0.5 block text-xs text-rose-600">{item.reason}</span>
              )}
            </span>
          </label>
        ))}
      </div>
    )}
  </div>
);

const AssignPanel = ({ cab, busy, onSubmit, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState({ drivers: [], vehicles: [] });
  const [driver, setDriver] = useState("");
  const [vehicle, setVehicle] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await getAvailableCabResources(cab._id);
        if (!active) return;

        setResources({ drivers: data?.drivers || [], vehicles: data?.vehicles || [] });

        // Keep the current driver and vehicle selected when re-assigning.
        const currentDriver = cab.driver?._id;
        const currentVehicle = cab.vehicle?._id;
        const driverOk = data?.drivers?.find((d) => d._id === currentDriver && d.available);
        const vehicleOk = data?.vehicles?.find((v) => v._id === currentVehicle && v.available);
        if (driverOk) setDriver(currentDriver);
        if (vehicleOk) setVehicle(currentVehicle);
      } catch (error) {
        if (active) toast.error(errorText(error, "Could not load drivers and vehicles"));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [cab]);

  const submit = (event) => {
    event.preventDefault();
    if (!driver) return toast.error("Select a driver");
    if (!vehicle) return toast.error("Select a vehicle");
    onSubmit({ driver, vehicle });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Assign driver and vehicle for {cab.cabNumber}
        </h2>
        <p className="text-sm text-slate-500">
          {formatDateTime(cab.pickupAt)} · {cab.passengers} passenger
          {cab.passengers === 1 ? "" : "s"} · {String(cab.vehicleType).replace("_", " ")}
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <PickList
            title="Driver"
            items={resources.drivers}
            value={driver}
            onChange={setDriver}
            empty="No drivers added yet"
            renderLine={(item) => (
              <>
                <span className="font-semibold text-slate-900">{item.name}</span>
                <span className="block text-xs text-slate-500">{item.phone}</span>
              </>
            )}
          />

          <PickList
            title="Vehicle"
            items={resources.vehicles}
            value={vehicle}
            onChange={setVehicle}
            empty="No vehicles found. Add a vehicle in the fleet, and make sure it is not marked inactive."
            renderLine={(item) => (
              <>
                <span className="font-semibold text-slate-900">
                  {item.registrationNumber}
                </span>
                <span className="block text-xs text-slate-500">
                  {[item.make, item.model].filter(Boolean).join(" ") || "Vehicle"} ·{" "}
                  <span className="capitalize">{String(item.type).replace("_", " ")}</span> ·{" "}
                  {item.seats} seats
                </span>
                {item.sameType === false && item.available && (
                  <span className="mt-0.5 block text-xs text-amber-700">
                    Guest booked a {String(cab.vehicleType).replace("_", " ")}
                  </span>
                )}
              </>
            )}
          />
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onClose} disabled={busy} className={secondaryButton}>
          Close
        </button>
        <button type="submit" disabled={busy || loading} className={primaryButton}>
          {busy && <Loader2 size={16} className="animate-spin" />}
          Assign
        </button>
      </div>
    </form>
  );
};

/* ------------------------ Action panel: complete -------------------------- */

const CompletePanel = ({ cab, canEditAmount, busy, onSubmit, onClose }) => {
  const estimate = cab.estimate || {};
  const needsFare = cab.tripType === "point_to_point" && !estimate.distanceKm;

  const [form, setForm] = useState({
    distanceKm: String(estimate.distanceKm ?? 0),
    fare: String(estimate.fare ?? 0),
    extras: "0",
  });

  const taxPercent = estimate.taxPercent ?? 0;
  const base = (Number(form.fare) || 0) + (Number(form.extras) || 0);
  const total = base + (base * taxPercent) / 100;

  const set = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();

    if (!canEditAmount) {
      if (needsFare) {
        return toast.error("A manager must confirm the final fare for this trip");
      }
      return onSubmit({});
    }

    if ((Number(form.fare) || 0) < 0 || (Number(form.extras) || 0) < 0) {
      return toast.error("Amounts cannot be negative");
    }

    onSubmit({
      fare: Number(form.fare) || 0,
      extras: Number(form.extras) || 0,
      distanceKm: Number(form.distanceKm) || 0,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Complete trip {cab.cabNumber}
        </h2>
        <p className="text-sm text-slate-500">
          {canEditAmount
            ? "Check the final amount. Tolls, parking and waiting go in extra charges."
            : "The estimated amount will be used as the final amount."}
        </p>
      </div>

      {needsFare && !canEditAmount && (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This trip has no distance, so a manager must confirm the final fare.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">Distance (km)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={form.distanceKm}
            onChange={set("distanceKm")}
            disabled={!canEditAmount}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">Fare (₹)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={form.fare}
            onChange={set("fare")}
            disabled={!canEditAmount}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">
            Extra charges (₹)
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={form.extras}
            onChange={set("extras")}
            disabled={!canEditAmount}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded bg-slate-50 px-4 py-3 text-sm">
        <span className="text-slate-600">
          Total with {taxPercent}% GST
        </span>
        <span className="text-lg font-bold text-slate-900">
          {money(canEditAmount ? total : estimate.total)}
        </span>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onClose} disabled={busy} className={secondaryButton}>
          Close
        </button>
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy && <Loader2 size={16} className="animate-spin" />}
          Complete trip
        </button>
      </div>
    </form>
  );
};

/* ------------------------------ Details row ------------------------------- */

const DetailsRow = ({ cab }) => (
  <div className="grid gap-5 bg-slate-50/70 px-4 py-4 text-sm md:grid-cols-3">
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trip</p>
      <p className="flex items-start gap-1.5 text-slate-700">
        <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
        <span>
          {cab.pickup?.location || "-"}
          {cab.drop?.location ? ` → ${cab.drop.location}` : ""}
        </span>
      </p>
      <p className="text-slate-600">
        {cab.passengers} passenger{cab.passengers === 1 ? "" : "s"}, {cab.luggage || 0} bag
        {cab.luggage === 1 ? "" : "s"}
      </p>
      {cab.room?.roomNumber && (
        <p className="text-slate-600">Room {cab.room.roomNumber}</p>
      )}
      {cab.notes && <p className="text-slate-600">Guest note: {cab.notes}</p>}
      {cab.cancelReason && <p className="text-rose-600">Cancelled: {cab.cancelReason}</p>}
      {cab.rejectReason && <p className="text-rose-600">Rejected: {cab.rejectReason}</p>}
    </div>

    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</p>
      <p className="text-slate-700">
        Estimate: <span className="font-semibold">{money(cab.estimate?.total)}</span>
      </p>
      {cab.status === "completed" && (
        <p className="text-slate-700">
          Final: <span className="font-semibold">{money(cab.final?.total)}</span>
        </p>
      )}
      <p className="text-slate-600">
        Payment: {String(cab.paymentMode || "").replace("_", " ")} ·{" "}
        {cab.paymentStatus}
      </p>
      {cab.rating?.stars && (
        <p className="text-slate-600">
          Guest rating: {cab.rating.stars}/5
          {cab.rating.comment ? ` · ${cab.rating.comment}` : ""}
        </p>
      )}
    </div>

    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        History
      </p>
      <ol className="space-y-1.5">
        {(cab.history || []).map((entry, index) => (
          <li key={index} className="text-xs text-slate-600">
            <span className="font-semibold text-slate-800">
              {STATUS_META[entry.status]?.label || entry.status}
            </span>{" "}
            · {formatDateTime(entry.at)}
            {entry.note && <span className="block text-slate-500">{entry.note}</span>}
          </li>
        ))}
      </ol>
    </div>
  </div>
);

/* --------------------------------- Page ----------------------------------- */

const AdminCabBookingsPage = () => {
  const { user } = useAuth();
  const canEditAmount = [ROLES.SUPER_ADMIN, ROLES.MANAGER].includes(user?.role);

  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput.trim());

  const [cabs, setCabs] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [openId, setOpenId] = useState(null);
  const [panel, setPanel] = useState(null); // { type: "reject" | "assign" | "complete", cab }
  const [acceptTarget, setAcceptTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const params = useMemo(
    () => TABS.find((item) => item.key === tab)?.params || {},
    [tab]
  );

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const data = await getCabBookings({
          page,
          limit: LIMIT,
          ...params,
          ...(search ? { search } : {}),
        });
        setCabs(getList(data));
        setMeta(data?.meta || {});
      } catch (error) {
        toast.error(errorText(error, "Failed to load cab bookings"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, params, search]
  );

  useEffect(() => {
    load();
  }, [load]);

  const changeTab = (key) => {
    setTab(key);
    setPage(1);
    setOpenId(null);
    setPanel(null);
  };

  const onSearch = (event) => {
    setSearchInput(event.target.value);
    setPage(1);
  };

  /* ------------------------------- Actions -------------------------------- */

  // Runs a service call, then shows a message and reloads the list.
  const runAction = async (task, successMessage) => {
    setBusy(true);
    try {
      const result = await task();
      toast.success(successMessage);

      if (result?.billingWarning) {
        toast(`Not added to the room bill: ${result.billingWarning}`, { icon: "⚠️", duration: 6000 });
      }

      setPanel(null);
      setAcceptTarget(null);
      await load({ silent: true });
    } catch (error) {
      toast.error(errorText(error, "Something went wrong. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const confirmAccept = () =>
    runAction(() => acceptCabBooking(acceptTarget._id, {}), "Cab request accepted");

  const submitReject = (reason) =>
    runAction(() => rejectCabBooking(panel.cab._id, reason), "Cab request rejected");

  const submitAssign = (payload) =>
    runAction(() => assignCabResources(panel.cab._id, payload), "Driver and vehicle assigned");

  const startTrip = (cab) => runAction(() => startCabTrip(cab._id), "Trip started");

  const submitComplete = (payload) =>
    runAction(() => completeCabTrip(panel.cab._id, payload), "Trip completed");

  const openPanel = (type, cab) => {
    setPanel({ type, cab });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ------------------------------ Row buttons ----------------------------- */

  const actionButton =
    "inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-semibold transition";

  const renderActions = (cab) => {
    const buttons = [];

    if (cab.status === "requested") {
      buttons.push(
        <button
          key="accept"
          type="button"
          onClick={() => setAcceptTarget(cab)}
          className={`${actionButton} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}
        >
          <CheckCircle2 size={14} /> Accept
        </button>
      );
    }

    if (["requested", "confirmed", "assigned"].includes(cab.status)) {
      buttons.push(
        <button
          key="assign"
          type="button"
          onClick={() => openPanel("assign", cab)}
          className={`${actionButton} border-slate-300 text-slate-700 hover:bg-slate-50`}
        >
          <UserCheck size={14} /> {cab.status === "assigned" ? "Reassign" : "Assign"}
        </button>
      );
    }

    if (cab.status === "assigned") {
      buttons.push(
        <button
          key="start"
          type="button"
          onClick={() => startTrip(cab)}
          disabled={busy}
          className={`${actionButton} border-sky-200 text-sky-700 hover:bg-sky-50 disabled:opacity-50`}
        >
          <Play size={14} /> Start
        </button>
      );
    }

    if (cab.status === "in_progress") {
      buttons.push(
        <button
          key="complete"
          type="button"
          onClick={() => openPanel("complete", cab)}
          className={`${actionButton} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}
        >
          <Flag size={14} /> Complete
        </button>
      );
    }

    if (["requested", "confirmed"].includes(cab.status)) {
      buttons.push(
        <button
          key="reject"
          type="button"
          onClick={() => openPanel("reject", cab)}
          className={`${actionButton} border-rose-200 text-rose-600 hover:bg-rose-50`}
        >
          <XCircle size={14} /> Reject
        </button>
      );
    }

    return buttons.length ? (
      <div className="flex flex-wrap gap-1.5">{buttons}</div>
    ) : (
      <span className="text-xs text-slate-400">-</span>
    );
  };

  /* -------------------------------- Render -------------------------------- */

  const totalPages = getTotalPages(meta);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cab Bookings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Accept or reject guest requests, assign a driver and run the trip
          </p>
        </div>

        <button
          type="button"
          onClick={() => load({ silent: true })}
          disabled={refreshing || loading}
          className={secondaryButton}
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Action panel */}
      {panel && (
        <div className="rounded border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setPanel(null)}
              disabled={busy}
              aria-label="Close panel"
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>

          {panel.type === "reject" && (
            <RejectPanel
              cab={panel.cab}
              busy={busy}
              onSubmit={submitReject}
              onClose={() => setPanel(null)}
            />
          )}

          {panel.type === "assign" && (
            <AssignPanel
              cab={panel.cab}
              busy={busy}
              onSubmit={submitAssign}
              onClose={() => setPanel(null)}
            />
          )}

          {panel.type === "complete" && (
            <CompletePanel
              cab={panel.cab}
              canEditAmount={canEditAmount}
              busy={busy}
              onSubmit={submitComplete}
              onClose={() => setPanel(null)}
            />
          )}
        </div>
      )}

      {/* Tabs and search */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => changeTab(item.key)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                tab === item.key
                  ? "bg-[#1a1a1a] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={searchInput}
            onChange={onSearch}
            placeholder="Search cab no, name or phone"
            className={`${inputClass} pl-10`}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        {loading ? (
          <TableSkeleton rows={6} columns={7} />
        ) : cabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
            <div className="rounded bg-slate-100 p-4 text-slate-500">
              <Car size={26} />
            </div>
            <h3 className="font-semibold text-slate-800">No cab bookings found</h3>
            <p className="max-w-sm text-sm text-slate-500">
              {tab === "pending"
                ? "There are no new requests right now."
                : "Nothing matches this filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Cab</th>
                  <th className="px-4 py-3 font-semibold">Passenger</th>
                  <th className="px-4 py-3 font-semibold">Trip</th>
                  <th className="px-4 py-3 font-semibold">Pickup</th>
                  <th className="px-4 py-3 font-semibold">Driver / Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {cabs.map((cab) => (
                  <Fragment key={cab._id}>
                    <tr className="align-top hover:bg-slate-50/60">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{cab.cabNumber}</p>
                        <p className="text-xs text-slate-500">
                          {money(cab.status === "completed" ? cab.final?.total : cab.estimate?.total)}
                        </p>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-900">{cab.passenger?.name}</p>
                        <a
                          href={`tel:${cab.passenger?.phone}`}
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600"
                        >
                          <Phone size={12} /> {cab.passenger?.phone}
                        </a>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-800">
                          {TRIP_LABELS[cab.tripType] || cab.tripType}
                        </p>
                        <p className="text-xs capitalize text-slate-500">
                          {String(cab.vehicleType).replace("_", " ")}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">
                        {formatDateTime(cab.pickupAt)}
                      </td>

                      <td className="px-4 py-3.5">
                        {cab.driver ? (
                          <>
                            <p className="font-medium text-slate-800">{cab.driver.name}</p>
                            <p className="text-xs text-slate-500">
                              {cab.vehicle?.registrationNumber}
                            </p>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">Not assigned</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <StatusBadge status={cab.status} />
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-2">
                          {renderActions(cab)}
                          <button
                            type="button"
                            onClick={() => setOpenId(openId === cab._id ? null : cab._id)}
                            aria-label="Show details"
                            aria-expanded={openId === cab._id}
                            className="rounded border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                          >
                            <ChevronDown
                              size={14}
                              className={`transition ${openId === cab._id ? "rotate-180" : ""}`}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {openId === cab._id && (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <DetailsRow cab={cab} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && cabs.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">
              {meta.total ?? cabs.length} booking(s) · Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page"
                className="rounded border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
                className="rounded border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(acceptTarget)}
        tone="success"
        icon={CheckCircle2}
        title="Accept this cab request?"
        message={
          acceptTarget
            ? `${acceptTarget.passenger?.name} will be told that cab ${acceptTarget.cabNumber} for ${formatDateTime(
                acceptTarget.pickupAt
              )} is accepted. You can assign a driver next.`
            : ""
        }
        confirmText="Accept request"
        loading={busy}
        onConfirm={confirmAccept}
        onCancel={() => setAcceptTarget(null)}
      />
    </div>
  );
};

export default AdminCabBookingsPage;


// import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
// import {
//   Car,
//   CheckCircle2,
//   ChevronDown,
//   ChevronLeft,
//   ChevronRight,
//   Flag,
//   Loader2,
//   MapPin,
//   Phone,
//   Play,
//   RefreshCw,
//   Search,
//   UserCheck,
//   X,
//   XCircle,
// } from "lucide-react";
// import toast from "react-hot-toast";

// import ConfirmDialog from "../../../components/common/ConfirmDialog";
// import { Skeleton, TableSkeleton } from "../../../components/common/Skeleton";
// import useAuth from "../../../hooks/useAuth";
// import { ROLES } from "../../../constants/roles";
// import * as cabApi from "../services/cab.service";

// /* ------------------------------------------------------------------------ *
//  * Service functions. The three dispatch functions below are the ones in your
//  * cab.service.js. The others are looked up by their usual names, so the page
//  * still loads if one of them is named a little differently.
//  * ------------------------------------------------------------------------ */
// const pick = (...names) => names.map((name) => cabApi[name]).find(Boolean);

// const getAvailableCabResources = cabApi.getAvailableCabResources;
// const acceptCabBooking = cabApi.acceptCabBooking;
// const rejectCabBooking = cabApi.rejectCabBooking;

// const listCabBookings = pick(
//   "listCabBookings",
//   "getCabBookings",
//   "getCabBookingList",
//   "fetchCabBookings"
// );
// const assignCabBooking = pick("assignCabBooking", "assignCab");
// const startCabBooking = pick("startCabBooking", "startCab");
// const completeCabBooking = pick("completeCabBooking", "completeCab");

// /* --------------------------------- Config --------------------------------- */

// const LIMIT = 10;

// const TABS = [
//   { key: "pending", label: "New requests", params: { view: "pending" } },
//   { key: "today", label: "Today", params: { view: "today" } },
//   { key: "upcoming", label: "Upcoming", params: { view: "upcoming" } },
//   { key: "past", label: "Past", params: { view: "past" } },
//   { key: "all", label: "All", params: {} },
// ];

// const STATUS_META = {
//   requested: { label: "New request", badge: "bg-amber-50 text-amber-700" },
//   confirmed: { label: "Accepted", badge: "bg-black text-indigo-700" },
//   assigned: { label: "Driver assigned", badge: "bg-sky-50 text-sky-700" },
//   in_progress: { label: "On trip", badge: "bg-emerald-50 text-emerald-700" },
//   completed: { label: "Completed", badge: "bg-slate-100 text-slate-600" },
//   cancelled: { label: "Cancelled", badge: "bg-rose-50 text-rose-700" },
//   rejected: { label: "Rejected", badge: "bg-rose-50 text-rose-700" },
// };

// const TRIP_LABELS = {
//   airport_pickup: "Airport pickup",
//   airport_drop: "Airport drop",
//   local: "Local trip",
//   outstation: "Outstation",
//   point_to_point: "Point to point",
// };

// const inputClass =
//   "w-full rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60";

// const primaryButton =
//   "inline-flex items-center justify-center gap-2 rounded bg-[#1a1a1a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60";

// const secondaryButton =
//   "inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

// /* -------------------------------- Helpers --------------------------------- */

// const getList = (data) => data?.cabs || data?.items || data?.bookings || [];

// const errorText = (error, fallback) => error?.response?.data?.message || fallback;

// const money = (value) =>
//   `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// const formatDateTime = (value) =>
//   value
//     ? new Date(value).toLocaleString("en-IN", {
//         timeZone: "Asia/Kolkata",
//         day: "2-digit",
//         month: "short",
//         year: "numeric",
//         hour: "2-digit",
//         minute: "2-digit",
//       })
//     : "-";

// const useDebounce = (value, delay = 400) => {
//   const [debounced, setDebounced] = useState(value);

//   useEffect(() => {
//     const timer = setTimeout(() => setDebounced(value), delay);
//     return () => clearTimeout(timer);
//   }, [value, delay]);

//   return debounced;
// };

// const getTotalPages = (meta) =>
//   meta?.totalPages ||
//   Math.ceil((meta?.total || 0) / (meta?.limit || LIMIT)) ||
//   1;

// const StatusBadge = ({ status }) => {
//   const meta = STATUS_META[status];

//   return (
//     <span
//       className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
//         meta?.badge || "bg-slate-100 text-slate-600"
//       }`}
//     >
//       {meta?.label || status}
//     </span>
//   );
// };

// /* ------------------------- Action panel: reject --------------------------- */

// const RejectPanel = ({ cab, busy, onSubmit, onClose }) => {
//   const [reason, setReason] = useState("");

//   const submit = (event) => {
//     event.preventDefault();
//     if (!reason.trim()) return toast.error("Enter a reason for rejecting this request");
//     onSubmit(reason.trim());
//   };

//   return (
//     <form onSubmit={submit} className="space-y-4">
//       <div>
//         <h2 className="text-base font-semibold text-slate-900">
//           Reject request {cab.cabNumber}
//         </h2>
//         <p className="text-sm text-slate-500">
//           The guest will see this reason in their notification.
//         </p>
//       </div>

//       <div>
//         <label className="mb-1.5 block text-xs font-medium text-slate-700">
//           Reason <span className="text-rose-600">*</span>
//         </label>
//         <textarea
//           rows={3}
//           maxLength={300}
//           value={reason}
//           onChange={(event) => setReason(event.target.value)}
//           placeholder="For example: No cab is available at that time"
//           className={inputClass}
//         />
//       </div>

//       <div className="flex flex-wrap justify-end gap-3">
//         <button type="button" onClick={onClose} disabled={busy} className={secondaryButton}>
//           Close
//         </button>
//         <button
//           type="submit"
//           disabled={busy}
//           className="inline-flex items-center justify-center gap-2 rounded bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
//         >
//           {busy && <Loader2 size={16} className="animate-spin" />}
//           Reject request
//         </button>
//       </div>
//     </form>
//   );
// };

// /* ------------------------- Action panel: assign --------------------------- */

// const PickList = ({ title, items, value, onChange, renderLine, empty }) => (
//   <div>
//     <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
//       {title}
//     </p>

//     {items.length === 0 ? (
//       <p className="rounded border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500">
//         {empty}
//       </p>
//     ) : (
//       <div className="space-y-2">
//         {items.map((item) => (
//           <label
//             key={item._id}
//             className={`flex cursor-pointer items-start gap-3 rounded border px-3 py-2.5 text-sm transition ${
//               item.available
//                 ? value === item._id
//                   ? "border-indigo-500 bg-black/50"
//                   : "border-slate-200 hover:bg-slate-50"
//                 : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
//             }`}
//           >
//             <input
//               type="radio"
//               name={title}
//               disabled={!item.available}
//               checked={value === item._id}
//               onChange={() => onChange(item._id)}
//               className="mt-1"
//             />
//             <span className="min-w-0 flex-1">
//               {renderLine(item)}
//               {!item.available && item.reason && (
//                 <span className="mt-0.5 block text-xs text-rose-600">{item.reason}</span>
//               )}
//             </span>
//           </label>
//         ))}
//       </div>
//     )}
//   </div>
// );

// const AssignPanel = ({ cab, busy, onSubmit, onClose }) => {
//   const [loading, setLoading] = useState(true);
//   const [resources, setResources] = useState({ drivers: [], vehicles: [] });
//   const [driver, setDriver] = useState("");
//   const [vehicle, setVehicle] = useState("");

//   useEffect(() => {
//     let active = true;

//     (async () => {
//       try {
//         const data = await getAvailableCabResources(cab._id);
//         if (!active) return;

//         setResources({ drivers: data?.drivers || [], vehicles: data?.vehicles || [] });

//         // Keep the current driver and vehicle selected when re-assigning.
//         const currentDriver = cab.driver?._id;
//         const currentVehicle = cab.vehicle?._id;
//         const driverOk = data?.drivers?.find((d) => d._id === currentDriver && d.available);
//         const vehicleOk = data?.vehicles?.find((v) => v._id === currentVehicle && v.available);
//         if (driverOk) setDriver(currentDriver);
//         if (vehicleOk) setVehicle(currentVehicle);
//       } catch (error) {
//         if (active) toast.error(errorText(error, "Could not load drivers and vehicles"));
//       } finally {
//         if (active) setLoading(false);
//       }
//     })();

//     return () => {
//       active = false;
//     };
//   }, [cab]);

//   const submit = (event) => {
//     event.preventDefault();
//     if (!driver) return toast.error("Select a driver");
//     if (!vehicle) return toast.error("Select a vehicle");
//     onSubmit({ driver, vehicle });
//   };

//   return (
//     <form onSubmit={submit} className="space-y-5">
//       <div>
//         <h2 className="text-base font-semibold text-slate-900">
//           Assign driver and vehicle for {cab.cabNumber}
//         </h2>
//         <p className="text-sm text-slate-500">
//           {formatDateTime(cab.pickupAt)} · {cab.passengers} passenger
//           {cab.passengers === 1 ? "" : "s"} · {String(cab.vehicleType).replace("_", " ")}
//         </p>
//       </div>

//       {loading ? (
//         <div className="grid gap-4 md:grid-cols-2">
//           <Skeleton className="h-40 w-full" />
//           <Skeleton className="h-40 w-full" />
//         </div>
//       ) : (
//         <div className="grid gap-5 md:grid-cols-2">
//           <PickList
//             title="Driver"
//             items={resources.drivers}
//             value={driver}
//             onChange={setDriver}
//             empty="No drivers added yet"
//             renderLine={(item) => (
//               <>
//                 <span className="font-semibold text-slate-900">{item.name}</span>
//                 <span className="block text-xs text-slate-500">{item.phone}</span>
//               </>
//             )}
//           />

//           <PickList
//             title="Vehicle"
//             items={resources.vehicles}
//             value={vehicle}
//             onChange={setVehicle}
//             empty="No vehicle of this type has been added"
//             renderLine={(item) => (
//               <>
//                 <span className="font-semibold text-slate-900">
//                   {item.registrationNumber}
//                 </span>
//                 <span className="block text-xs text-slate-500">
//                   {[item.make, item.model].filter(Boolean).join(" ") || item.type} ·{" "}
//                   {item.seats} seats
//                 </span>
//               </>
//             )}
//           />
//         </div>
//       )}

//       <div className="flex flex-wrap justify-end gap-3">
//         <button type="button" onClick={onClose} disabled={busy} className={secondaryButton}>
//           Close
//         </button>
//         <button type="submit" disabled={busy || loading} className={primaryButton}>
//           {busy && <Loader2 size={16} className="animate-spin" />}
//           Assign
//         </button>
//       </div>
//     </form>
//   );
// };

// /* ------------------------ Action panel: complete -------------------------- */

// const CompletePanel = ({ cab, canEditAmount, busy, onSubmit, onClose }) => {
//   const estimate = cab.estimate || {};
//   const needsFare = cab.tripType === "point_to_point" && !estimate.distanceKm;

//   const [form, setForm] = useState({
//     distanceKm: String(estimate.distanceKm ?? 0),
//     fare: String(estimate.fare ?? 0),
//     extras: "0",
//   });

//   const taxPercent = estimate.taxPercent ?? 0;
//   const base = (Number(form.fare) || 0) + (Number(form.extras) || 0);
//   const total = base + (base * taxPercent) / 100;

//   const set = (key) => (event) =>
//     setForm((prev) => ({ ...prev, [key]: event.target.value }));

//   const submit = (event) => {
//     event.preventDefault();

//     if (!canEditAmount) {
//       if (needsFare) {
//         return toast.error("A manager must confirm the final fare for this trip");
//       }
//       return onSubmit({});
//     }

//     if ((Number(form.fare) || 0) < 0 || (Number(form.extras) || 0) < 0) {
//       return toast.error("Amounts cannot be negative");
//     }

//     onSubmit({
//       fare: Number(form.fare) || 0,
//       extras: Number(form.extras) || 0,
//       distanceKm: Number(form.distanceKm) || 0,
//     });
//   };

//   return (
//     <form onSubmit={submit} className="space-y-5">
//       <div>
//         <h2 className="text-base font-semibold text-slate-900">
//           Complete trip {cab.cabNumber}
//         </h2>
//         <p className="text-sm text-slate-500">
//           {canEditAmount
//             ? "Check the final amount. Tolls, parking and waiting go in extra charges."
//             : "The estimated amount will be used as the final amount."}
//         </p>
//       </div>

//       {needsFare && !canEditAmount && (
//         <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
//           This trip has no distance, so a manager must confirm the final fare.
//         </p>
//       )}

//       <div className="grid gap-4 sm:grid-cols-3">
//         <div>
//           <label className="mb-1.5 block text-xs font-medium text-slate-700">Distance (km)</label>
//           <input
//             type="number"
//             min="0"
//             step="0.1"
//             value={form.distanceKm}
//             onChange={set("distanceKm")}
//             disabled={!canEditAmount}
//             className={inputClass}
//           />
//         </div>
//         <div>
//           <label className="mb-1.5 block text-xs font-medium text-slate-700">Fare (₹)</label>
//           <input
//             type="number"
//             min="0"
//             step="1"
//             value={form.fare}
//             onChange={set("fare")}
//             disabled={!canEditAmount}
//             className={inputClass}
//           />
//         </div>
//         <div>
//           <label className="mb-1.5 block text-xs font-medium text-slate-700">
//             Extra charges (₹)
//           </label>
//           <input
//             type="number"
//             min="0"
//             step="1"
//             value={form.extras}
//             onChange={set("extras")}
//             disabled={!canEditAmount}
//             className={inputClass}
//           />
//         </div>
//       </div>

//       <div className="flex items-center justify-between rounded bg-slate-50 px-4 py-3 text-sm">
//         <span className="text-slate-600">
//           Total with {taxPercent}% GST
//         </span>
//         <span className="text-lg font-bold text-slate-900">
//           {money(canEditAmount ? total : estimate.total)}
//         </span>
//       </div>

//       <div className="flex flex-wrap justify-end gap-3">
//         <button type="button" onClick={onClose} disabled={busy} className={secondaryButton}>
//           Close
//         </button>
//         <button type="submit" disabled={busy} className={primaryButton}>
//           {busy && <Loader2 size={16} className="animate-spin" />}
//           Complete trip
//         </button>
//       </div>
//     </form>
//   );
// };

// /* ------------------------------ Details row ------------------------------- */

// const DetailsRow = ({ cab }) => (
//   <div className="grid gap-5 bg-slate-50/70 px-4 py-4 text-sm md:grid-cols-3">
//     <div className="space-y-1.5">
//       <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trip</p>
//       <p className="flex items-start gap-1.5 text-slate-700">
//         <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
//         <span>
//           {cab.pickup?.location || "-"}
//           {cab.drop?.location ? ` → ${cab.drop.location}` : ""}
//         </span>
//       </p>
//       <p className="text-slate-600">
//         {cab.passengers} passenger{cab.passengers === 1 ? "" : "s"}, {cab.luggage || 0} bag
//         {cab.luggage === 1 ? "" : "s"}
//       </p>
//       {cab.room?.roomNumber && (
//         <p className="text-slate-600">Room {cab.room.roomNumber}</p>
//       )}
//       {cab.notes && <p className="text-slate-600">Guest note: {cab.notes}</p>}
//       {cab.cancelReason && <p className="text-rose-600">Cancelled: {cab.cancelReason}</p>}
//       {cab.rejectReason && <p className="text-rose-600">Rejected: {cab.rejectReason}</p>}
//     </div>

//     <div className="space-y-1.5">
//       <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</p>
//       <p className="text-slate-700">
//         Estimate: <span className="font-semibold">{money(cab.estimate?.total)}</span>
//       </p>
//       {cab.status === "completed" && (
//         <p className="text-slate-700">
//           Final: <span className="font-semibold">{money(cab.final?.total)}</span>
//         </p>
//       )}
//       <p className="text-slate-600">
//         Payment: {String(cab.paymentMode || "").replace("_", " ")} ·{" "}
//         {cab.paymentStatus}
//       </p>
//       {cab.rating?.stars && (
//         <p className="text-slate-600">
//           Guest rating: {cab.rating.stars}/5
//           {cab.rating.comment ? ` · ${cab.rating.comment}` : ""}
//         </p>
//       )}
//     </div>

//     <div>
//       <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
//         History
//       </p>
//       <ol className="space-y-1.5">
//         {(cab.history || []).map((entry, index) => (
//           <li key={index} className="text-xs text-slate-600">
//             <span className="font-semibold text-slate-800">
//               {STATUS_META[entry.status]?.label || entry.status}
//             </span>{" "}
//             · {formatDateTime(entry.at)}
//             {entry.note && <span className="block text-slate-500">{entry.note}</span>}
//           </li>
//         ))}
//       </ol>
//     </div>
//   </div>
// );

// /* --------------------------------- Page ----------------------------------- */

// const AdminCabBookingsPage = () => {
//   const { user } = useAuth();
//   const canEditAmount = [ROLES.SUPER_ADMIN, ROLES.MANAGER].includes(user?.role);

//   const [tab, setTab] = useState("pending");
//   const [page, setPage] = useState(1);
//   const [searchInput, setSearchInput] = useState("");
//   const search = useDebounce(searchInput.trim());

//   const [cabs, setCabs] = useState([]);
//   const [meta, setMeta] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);

//   const [openId, setOpenId] = useState(null);
//   const [panel, setPanel] = useState(null); // { type: "reject" | "assign" | "complete", cab }
//   const [acceptTarget, setAcceptTarget] = useState(null);
//   const [busy, setBusy] = useState(false);

//   const params = useMemo(
//     () => TABS.find((item) => item.key === tab)?.params || {},
//     [tab]
//   );

//   const load = useCallback(
//     async ({ silent = false } = {}) => {
//       if (!listCabBookings) {
//         setLoading(false);
//         toast.error("The cab list function is missing in cab.service.js");
//         return;
//       }

//       if (silent) setRefreshing(true);
//       else setLoading(true);

//       try {
//         const data = await listCabBookings({
//           page,
//           limit: LIMIT,
//           ...params,
//           ...(search ? { search } : {}),
//         });
//         setCabs(getList(data));
//         setMeta(data?.meta || {});
//       } catch (error) {
//         toast.error(errorText(error, "Failed to load cab bookings"));
//       } finally {
//         setLoading(false);
//         setRefreshing(false);
//       }
//     },
//     [page, params, search]
//   );

//   useEffect(() => {
//     load();
//   }, [load]);

//   const changeTab = (key) => {
//     setTab(key);
//     setPage(1);
//     setOpenId(null);
//     setPanel(null);
//   };

//   const onSearch = (event) => {
//     setSearchInput(event.target.value);
//     setPage(1);
//   };

//   /* ------------------------------- Actions -------------------------------- */

//   // Runs a service call, then shows a message and reloads the list.
//   const runAction = async (task, successMessage) => {
//     setBusy(true);
//     try {
//       const result = await task();
//       toast.success(successMessage);

//       if (result?.billingWarning) {
//         toast(`Not added to the room bill: ${result.billingWarning}`, { icon: "⚠️", duration: 6000 });
//       }

//       setPanel(null);
//       setAcceptTarget(null);
//       await load({ silent: true });
//     } catch (error) {
//       toast.error(errorText(error, "Something went wrong. Please try again."));
//     } finally {
//       setBusy(false);
//     }
//   };

//   const confirmAccept = () =>
//     runAction(() => acceptCabBooking(acceptTarget._id, {}), "Cab request accepted");

//   const submitReject = (reason) =>
//     runAction(() => rejectCabBooking(panel.cab._id, reason), "Cab request rejected");

//   const submitAssign = (payload) => {
//     if (!assignCabBooking) return toast.error("assignCabBooking is missing in cab.service.js");
//     return runAction(() => assignCabBooking(panel.cab._id, payload), "Driver and vehicle assigned");
//   };

//   const startTrip = (cab) => {
//     if (!startCabBooking) return toast.error("startCabBooking is missing in cab.service.js");
//     return runAction(() => startCabBooking(cab._id), "Trip started");
//   };

//   const submitComplete = (payload) => {
//     if (!completeCabBooking) {
//       return toast.error("completeCabBooking is missing in cab.service.js");
//     }
//     return runAction(() => completeCabBooking(panel.cab._id, payload), "Trip completed");
//   };

//   const openPanel = (type, cab) => {
//     setPanel({ type, cab });
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };

//   /* ------------------------------ Row buttons ----------------------------- */

//   const actionButton =
//     "inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-semibold transition";

//   const renderActions = (cab) => {
//     const buttons = [];

//     if (cab.status === "requested") {
//       buttons.push(
//         <button
//           key="accept"
//           type="button"
//           onClick={() => setAcceptTarget(cab)}
//           className={`${actionButton} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}
//         >
//           <CheckCircle2 size={14} /> Accept
//         </button>
//       );
//     }

//     if (["requested", "confirmed", "assigned"].includes(cab.status)) {
//       buttons.push(
//         <button
//           key="assign"
//           type="button"
//           onClick={() => openPanel("assign", cab)}
//           className={`${actionButton} border-slate-300 text-slate-700 hover:bg-slate-50`}
//         >
//           <UserCheck size={14} /> {cab.status === "assigned" ? "Reassign" : "Assign"}
//         </button>
//       );
//     }

//     if (cab.status === "assigned") {
//       buttons.push(
//         <button
//           key="start"
//           type="button"
//           onClick={() => startTrip(cab)}
//           disabled={busy}
//           className={`${actionButton} border-sky-200 text-sky-700 hover:bg-sky-50 disabled:opacity-50`}
//         >
//           <Play size={14} /> Start
//         </button>
//       );
//     }

//     if (cab.status === "in_progress") {
//       buttons.push(
//         <button
//           key="complete"
//           type="button"
//           onClick={() => openPanel("complete", cab)}
//           className={`${actionButton} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}
//         >
//           <Flag size={14} /> Complete
//         </button>
//       );
//     }

//     if (["requested", "confirmed"].includes(cab.status)) {
//       buttons.push(
//         <button
//           key="reject"
//           type="button"
//           onClick={() => openPanel("reject", cab)}
//           className={`${actionButton} border-rose-200 text-rose-600 hover:bg-rose-50`}
//         >
//           <XCircle size={14} /> Reject
//         </button>
//       );
//     }

//     return buttons.length ? (
//       <div className="flex flex-wrap gap-1.5">{buttons}</div>
//     ) : (
//       <span className="text-xs text-slate-400">-</span>
//     );
//   };

//   /* -------------------------------- Render -------------------------------- */

//   const totalPages = getTotalPages(meta);

//   return (
//     <div className="space-y-6">
//       <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//         <div>
//           <h1 className="text-xl font-bold text-slate-900">Cab Bookings</h1>
//           <p className="mt-1 text-sm text-slate-500">
//             Accept or reject guest requests, assign a driver and run the trip
//           </p>
//         </div>

//         <button
//           type="button"
//           onClick={() => load({ silent: true })}
//           disabled={refreshing || loading}
//           className={secondaryButton}
//         >
//           <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
//           Refresh
//         </button>
//       </div>

//       {/* Action panel */}
//       {panel && (
//         <div className="rounded border border-slate-200 bg-white p-5 shadow-sm">
//           <div className="mb-4 flex justify-end">
//             <button
//               type="button"
//               onClick={() => setPanel(null)}
//               disabled={busy}
//               aria-label="Close panel"
//               className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
//             >
//               <X size={18} />
//             </button>
//           </div>

//           {panel.type === "reject" && (
//             <RejectPanel
//               cab={panel.cab}
//               busy={busy}
//               onSubmit={submitReject}
//               onClose={() => setPanel(null)}
//             />
//           )}

//           {panel.type === "assign" && (
//             <AssignPanel
//               cab={panel.cab}
//               busy={busy}
//               onSubmit={submitAssign}
//               onClose={() => setPanel(null)}
//             />
//           )}

//           {panel.type === "complete" && (
//             <CompletePanel
//               cab={panel.cab}
//               canEditAmount={canEditAmount}
//               busy={busy}
//               onSubmit={submitComplete}
//               onClose={() => setPanel(null)}
//             />
//           )}
//         </div>
//       )}

//       {/* Tabs and search */}
//       <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
//         <div className="flex gap-2 overflow-x-auto pb-1">
//           {TABS.map((item) => (
//             <button
//               key={item.key}
//               type="button"
//               onClick={() => changeTab(item.key)}
//               className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
//                 tab === item.key
//                   ? "bg-[#1a1a1a] text-white"
//                   : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
//               }`}
//             >
//               {item.label}
//             </button>
//           ))}
//         </div>

//         <div className="relative w-full lg:w-72">
//           <Search
//             size={16}
//             className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
//           />
//           <input
//             type="search"
//             value={searchInput}
//             onChange={onSearch}
//             placeholder="Search cab no, name or phone"
//             className={`${inputClass} pl-10`}
//           />
//         </div>
//       </div>

//       {/* Table */}
//       <div className="overflow-hidden rounded border border-slate-200 bg-white">
//         {loading ? (
//           <TableSkeleton rows={6} columns={7} />
//         ) : cabs.length === 0 ? (
//           <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
//             <div className="rounded bg-slate-100 p-4 text-slate-500">
//               <Car size={26} />
//             </div>
//             <h3 className="font-semibold text-slate-800">No cab bookings found</h3>
//             <p className="max-w-sm text-sm text-slate-500">
//               {tab === "pending"
//                 ? "There are no new requests right now."
//                 : "Nothing matches this filter."}
//             </p>
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="w-full min-w-[1000px] text-left text-sm">
//               <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
//                 <tr>
//                   <th className="px-4 py-3 font-semibold">Cab</th>
//                   <th className="px-4 py-3 font-semibold">Passenger</th>
//                   <th className="px-4 py-3 font-semibold">Trip</th>
//                   <th className="px-4 py-3 font-semibold">Pickup</th>
//                   <th className="px-4 py-3 font-semibold">Driver / Vehicle</th>
//                   <th className="px-4 py-3 font-semibold">Status</th>
//                   <th className="px-4 py-3 font-semibold">Actions</th>
//                 </tr>
//               </thead>

//               <tbody className="divide-y divide-slate-100">
//                 {cabs.map((cab) => (
//                   <Fragment key={cab._id}>
//                     <tr className="align-top hover:bg-slate-50/60">
//                       <td className="px-4 py-3.5">
//                         <p className="font-semibold text-slate-900">{cab.cabNumber}</p>
//                         <p className="text-xs text-slate-500">
//                           {money(cab.status === "completed" ? cab.final?.total : cab.estimate?.total)}
//                         </p>
//                       </td>

//                       <td className="px-4 py-3.5">
//                         <p className="font-medium text-slate-900">{cab.passenger?.name}</p>
//                         <a
//                           href={`tel:${cab.passenger?.phone}`}
//                           className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600"
//                         >
//                           <Phone size={12} /> {cab.passenger?.phone}
//                         </a>
//                       </td>

//                       <td className="px-4 py-3.5">
//                         <p className="font-medium text-slate-800">
//                           {TRIP_LABELS[cab.tripType] || cab.tripType}
//                         </p>
//                         <p className="text-xs capitalize text-slate-500">
//                           {String(cab.vehicleType).replace("_", " ")}
//                         </p>
//                       </td>

//                       <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">
//                         {formatDateTime(cab.pickupAt)}
//                       </td>

//                       <td className="px-4 py-3.5">
//                         {cab.driver ? (
//                           <>
//                             <p className="font-medium text-slate-800">{cab.driver.name}</p>
//                             <p className="text-xs text-slate-500">
//                               {cab.vehicle?.registrationNumber}
//                             </p>
//                           </>
//                         ) : (
//                           <span className="text-xs text-slate-400">Not assigned</span>
//                         )}
//                       </td>

//                       <td className="px-4 py-3.5">
//                         <StatusBadge status={cab.status} />
//                       </td>

//                       <td className="px-4 py-3.5">
//                         <div className="flex items-start gap-2">
//                           {renderActions(cab)}
//                           <button
//                             type="button"
//                             onClick={() => setOpenId(openId === cab._id ? null : cab._id)}
//                             aria-label="Show details"
//                             aria-expanded={openId === cab._id}
//                             className="rounded border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
//                           >
//                             <ChevronDown
//                               size={14}
//                               className={`transition ${openId === cab._id ? "rotate-180" : ""}`}
//                             />
//                           </button>
//                         </div>
//                       </td>
//                     </tr>

//                     {openId === cab._id && (
//                       <tr>
//                         <td colSpan={7} className="p-0">
//                           <DetailsRow cab={cab} />
//                         </td>
//                       </tr>
//                     )}
//                   </Fragment>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}

//         {!loading && cabs.length > 0 && (
//           <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
//             <p className="text-xs text-slate-500">
//               {meta.total ?? cabs.length} booking(s) · Page {page} of {totalPages}
//             </p>
//             <div className="flex gap-2">
//               <button
//                 type="button"
//                 disabled={page <= 1}
//                 onClick={() => setPage((p) => p - 1)}
//                 aria-label="Previous page"
//                 className="rounded border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
//               >
//                 <ChevronLeft size={16} />
//               </button>
//               <button
//                 type="button"
//                 disabled={page >= totalPages}
//                 onClick={() => setPage((p) => p + 1)}
//                 aria-label="Next page"
//                 className="rounded border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
//               >
//                 <ChevronRight size={16} />
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       <ConfirmDialog
//         open={Boolean(acceptTarget)}
//         tone="success"
//         icon={CheckCircle2}
//         title="Accept this cab request?"
//         message={
//           acceptTarget
//             ? `${acceptTarget.passenger?.name} will be told that cab ${acceptTarget.cabNumber} for ${formatDateTime(
//                 acceptTarget.pickupAt
//               )} is accepted. You can assign a driver next.`
//             : ""
//         }
//         confirmText="Accept request"
//         loading={busy}
//         onConfirm={confirmAccept}
//         onCancel={() => setAcceptTarget(null)}
//       />
//     </div>
//   );
// };

// export default AdminCabBookingsPage;