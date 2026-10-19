import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Plus, Trash2, XCircle } from "lucide-react";
import toast from "react-hot-toast";

import useAuth from "../../../hooks/useAuth";
import { FormSkeleton } from "../../../components/common/Skeleton";
import {
  checkAvailability,
  createBooking,
  getBooking,
  listCatering,
  listHalls,
  updateBooking,
} from "../services/banquet.service";
import { Card, Field } from "../components/BanquetUi";
import {
  DEFAULT_TAX_PERCENT,
  EVENT_TYPE_OPTIONS,
  MANAGEMENT_ROLES,
  PAYMENT_METHOD_OPTIONS,
  SETUP_STYLE_OPTIONS,
  formatINR,
  getErrorMessage,
  inputClass,
  minutesOf,
  outlineButton,
  primaryButton,
  toDayKey,
} from "../../../utils/banquet.utils";

const emptyForm = (date) => ({
  customerName: "",
  phone: "",
  email: "",
  companyName: "",
  gstin: "",
  address: "",
  eventType: "wedding",
  eventName: "",
  hall: "",
  eventDate: date,
  startTime: "18:00",
  endTime: "23:00",
  expectedGuests: "",
  setupStyle: "banquet",
  specialRequests: "",
  internalNotes: "",
  hallCharge: "",
  discountAmount: "",
  discountReason: "",
  taxPercent: "",
  advanceRequired: "",
  holdHours: "",
  confirmNow: false,
});

const BanquetBookingForm = () => {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isManager = MANAGEMENT_ROLES.includes(user?.role);
  const today = toDayKey();

  const [form, setForm] = useState(() => emptyForm(searchParams.get("date") || today));
  const [catering, setCatering] = useState([]);
  const [extras, setExtras] = useState([]);
  const [advance, setAdvance] = useState({ amount: "", method: "cash", reference: "" });

  const [halls, setHalls] = useState([]);
  const [packages, setPackages] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [checking, setChecking] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingNumber, setBookingNumber] = useState("");

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const [hallList, packageList] = await Promise.all([listHalls({ active: true }), listCatering({ active: true })]);
        if (!active) return;
        setHalls(hallList);
        setPackages(packageList);

        if (editing) {
          const b = await getBooking(id);
          if (!active) return;
          setBookingNumber(b.bookingNumber);
          setForm({
            customerName: b.customer?.name || "",
            phone: b.customer?.phone || "",
            email: b.customer?.email || "",
            companyName: b.customer?.companyName || "",
            gstin: b.customer?.gstin || "",
            address: b.customer?.address || "",
            eventType: b.eventType,
            eventName: b.eventName || "",
            hall: b.hall?._id || "",
            eventDate: b.dateKey,
            startTime: b.startTime,
            endTime: b.endTime,
            expectedGuests: String(b.expectedGuests),
            setupStyle: b.setupStyle || "banquet",
            specialRequests: b.specialRequests || "",
            internalNotes: b.internalNotes || "",
            hallCharge: "",
            discountAmount: b.discountAmount ? String(b.discountAmount) : "",
            discountReason: b.discountReason || "",
            taxPercent: String(b.taxPercent),
            advanceRequired: String(b.advanceRequired),
            holdHours: "",
            confirmNow: false,
          });
          setCatering(b.catering.map((l) => ({ packageId: l.package, plates: String(l.plates) })));
          setExtras(
            b.extras.map((e) => ({ description: e.description, quantity: String(e.quantity), unitPrice: String(e.unitPrice) }))
          );
        }
      } catch (error) {
        toast.error(getErrorMessage(error, "Could not load the form"));
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [editing, id]);

  const change = (event) => {
    const { name, value } = event.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (["eventDate", "startTime", "endTime", "expectedGuests"].includes(name)) setAvailability(null);
  };

  const runAvailability = async () => {
    if (!form.eventDate || !form.startTime || !form.endTime) {
      toast.error("Select the date and the start and end time first");
      return;
    }
    if (minutesOf(form.endTime) <= minutesOf(form.startTime)) {
      toast.error("The end time must be after the start time");
      return;
    }

    setChecking(true);
    try {
      const params = { date: form.eventDate, startTime: form.startTime, endTime: form.endTime };
      if (form.expectedGuests) params.guests = form.expectedGuests;
      if (editing) params.excludeId = id;
      setAvailability(await checkAvailability(params));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setChecking(false);
    }
  };

  const updateCatering = (index, patch) =>
    setCatering((list) => list.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const updateExtra = (index, patch) =>
    setExtras((list) => list.map((extra, i) => (i === index ? { ...extra, ...patch } : extra)));

  const selectedHall = halls.find((h) => h._id === form.hall);
  const duration = Math.max(minutesOf(form.endTime) - minutesOf(form.startTime), 0) / 60;

  const estimatedHall =
    isManager && form.hallCharge !== ""
      ? Number(form.hallCharge) || 0
      : selectedHall
        ? selectedHall.pricingType === "per_hour"
          ? selectedHall.rate * duration
          : selectedHall.rate
        : 0;

  const estimatedCatering = catering.reduce((sum, line) => {
    const pkg = packages.find((p) => p._id === line.packageId);
    return sum + (pkg ? pkg.pricePerPlate * (Number(line.plates) || 0) : 0);
  }, 0);

  const estimatedExtras = extras.reduce(
    (sum, extra) => sum + (Number(extra.quantity) || 0) * (Number(extra.unitPrice) || 0),
    0
  );

  const subtotal = estimatedHall + estimatedCatering + estimatedExtras;
  const discount = Math.min(isManager ? Number(form.discountAmount) || 0 : 0, subtotal);
  const taxPercent = isManager && form.taxPercent !== "" ? Number(form.taxPercent) || 0 : DEFAULT_TAX_PERCENT;
  const taxAmount = ((subtotal - discount) * taxPercent) / 100;
  const estimatedTotal = Math.round(subtotal - discount + taxAmount);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (!form.customerName.trim()) return toast.error("Enter the customer name");
    if (!form.phone.trim()) return toast.error("Enter the customer phone number");
    if (!form.hall) return toast.error("Select a hall");
    if (!form.expectedGuests) return toast.error("Enter the expected number of guests");

    const payload = {
      customer: {
        name: form.customerName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        companyName: form.companyName.trim(),
        gstin: form.gstin.trim().toUpperCase(),
        address: form.address.trim(),
      },
      eventType: form.eventType,
      eventName: form.eventName.trim(),
      hall: form.hall,
      eventDate: form.eventDate,
      startTime: form.startTime,
      endTime: form.endTime,
      expectedGuests: Number(form.expectedGuests),
      setupStyle: form.setupStyle,
      specialRequests: form.specialRequests.trim(),
      internalNotes: form.internalNotes.trim(),
      catering: catering
        .filter((line) => line.packageId)
        .map((line) => ({ packageId: line.packageId, plates: Number(line.plates) })),
      extras: extras
        .filter((extra) => extra.description.trim())
        .map((extra) => ({
          description: extra.description.trim(),
          quantity: Number(extra.quantity) || 1,
          unitPrice: Number(extra.unitPrice) || 0,
        })),
    };

    if (isManager) {
      if (form.hallCharge !== "") payload.hallCharge = Number(form.hallCharge);
      payload.discountAmount = Number(form.discountAmount) || 0;
      payload.discountReason = form.discountReason.trim();
      if (form.taxPercent !== "") payload.taxPercent = Number(form.taxPercent);
      if (form.advanceRequired !== "") payload.advanceRequired = Number(form.advanceRequired);
      if (!editing) {
        if (form.holdHours !== "") payload.holdHours = Number(form.holdHours);
        if (form.confirmNow) payload.confirmNow = true;
      }
    }

    if (!editing && Number(advance.amount) > 0) {
      payload.advancePayment = {
        amount: Number(advance.amount),
        method: advance.method,
        reference: advance.reference.trim(),
      };
    }

    setSubmitting(true);
    try {
      const saved = editing ? await updateBooking(id, payload) : await createBooking(payload);
      toast.success(editing ? "Booking updated successfully" : "Booking created successfully");
      navigate(`/banquet/${saved._id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setSubmitting(false);
    }
  };

  const backPath = editing ? `/banquet/${id}` : "/banquet";

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Link
          to={backPath}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          {editing ? `Edit Booking ${bookingNumber}` : "New Banquet Booking"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick the date and time, check which halls are free, then add the customer and menu details.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <FormSkeleton fields={6} />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Card title="Event Schedule" description="Choose when the event happens, then check which halls are available.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Event date" required htmlFor="eventDate">
                <input
                  id="eventDate"
                  type="date"
                  name="eventDate"
                  min={editing ? undefined : today}
                  value={form.eventDate}
                  onChange={change}
                  className={inputClass}
                />
              </Field>
              <Field label="Start time" required htmlFor="startTime">
                <input id="startTime" type="time" name="startTime" value={form.startTime} onChange={change} className={inputClass} />
              </Field>
              <Field label="End time" required htmlFor="endTime">
                <input id="endTime" type="time" name="endTime" value={form.endTime} onChange={change} className={inputClass} />
              </Field>
              <Field label="Expected guests" required htmlFor="expectedGuests">
                <input
                  id="expectedGuests"
                  type="number"
                  min="1"
                  name="expectedGuests"
                  value={form.expectedGuests}
                  onChange={change}
                  className={inputClass}
                />
              </Field>
            </div>

            <button type="button" onClick={runAvailability} disabled={checking} className={`${outlineButton} mt-4`}>
              {checking && <Loader2 size={16} className="animate-spin" />}
              Check hall availability
            </button>

            {availability && (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {availability.halls.length === 0 && <p className="text-sm text-slate-500">No active halls found.</p>}
                {availability.halls.map((item) => {
                  const selected = form.hall === item.hall._id;
                  return (
                    <button
                      key={item.hall._id}
                      type="button"
                      disabled={!item.available}
                      onClick={() => setForm((f) => ({ ...f, hall: item.hall._id }))}
                      className={`rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                          : item.available
                            ? "border-slate-200 bg-white hover:border-slate-300"
                            : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{item.hall.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Up to {item.hall.capacityMax} guests, floor {item.hall.floor}
                          </p>
                        </div>
                        {item.available ? (
                          <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
                        ) : (
                          <XCircle size={18} className="shrink-0 text-rose-500" />
                        )}
                      </div>
                      <p className="mt-2 text-sm text-slate-700">
                        {item.available ? `Hall charge about ${formatINR(item.estimatedHallCharge)}` : item.reason}
                      </p>
                      {item.conflicts.length > 0 && (
                        <p className="mt-1 text-xs text-slate-500">
                          Existing: {item.conflicts.map((c) => `${c.startTime}-${c.endTime}`).join(", ")}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-4 max-w-md">
              <Field label="Hall" required htmlFor="hall" hint="Select from the results above, or choose directly.">
                <select id="hall" name="hall" value={form.hall} onChange={change} className={inputClass}>
                  <option value="">Select a hall</option>
                  {halls.map((h) => (
                    <option key={h._id} value={h._id}>
                      {h.name} (up to {h.capacityMax} guests)
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card title="Event Details">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Event type" required htmlFor="eventType">
                <select id="eventType" name="eventType" value={form.eventType} onChange={change} className={inputClass}>
                  {EVENT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Event name" htmlFor="eventName" hint="e.g. Sharma & Verma Wedding">
                <input id="eventName" name="eventName" value={form.eventName} onChange={change} maxLength={150} className={inputClass} />
              </Field>
              <Field label="Setup style" htmlFor="setupStyle">
                <select id="setupStyle" name="setupStyle" value={form.setupStyle} onChange={change} className={inputClass}>
                  {SETUP_STYLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card title="Customer">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Customer name" required htmlFor="customerName">
                <input id="customerName" name="customerName" value={form.customerName} onChange={change} maxLength={100} className={inputClass} />
              </Field>
              <Field label="Phone" required htmlFor="phone">
                <input id="phone" name="phone" value={form.phone} onChange={change} maxLength={20} className={inputClass} />
              </Field>
              <Field label="Email" htmlFor="email">
                <input id="email" type="email" name="email" value={form.email} onChange={change} className={inputClass} />
              </Field>
              <Field label="Company name" htmlFor="companyName" hint="For a GST invoice">
                <input id="companyName" name="companyName" value={form.companyName} onChange={change} maxLength={150} className={inputClass} />
              </Field>
              <Field label="GSTIN" htmlFor="gstin">
                <input id="gstin" name="gstin" value={form.gstin} onChange={change} maxLength={15} className={inputClass} />
              </Field>
              <Field label="Address" htmlFor="address">
                <input id="address" name="address" value={form.address} onChange={change} maxLength={300} className={inputClass} />
              </Field>
            </div>
          </Card>

          <Card
            title="Catering"
            description="Select the menu packages and the number of plates for each."
            action={
              <button
                type="button"
                onClick={() => setCatering((l) => [...l, { packageId: "", plates: form.expectedGuests || "" }])}
                disabled={packages.length === 0}
                className={outlineButton}
              >
                <Plus size={15} />
                Add package
              </button>
            }
          >
            {packages.length === 0 && (
              <p className="text-sm text-amber-600">No catering packages found. Add packages from the Catering page.</p>
            )}
            {catering.length === 0 && packages.length > 0 && (
              <p className="text-sm text-slate-500">No catering added. The booking will cover the hall only.</p>
            )}
            <div className="space-y-3">
              {catering.map((line, index) => {
                const pkg = packages.find((p) => p._id === line.packageId);
                return (
                  <div key={index} className="grid grid-cols-1 items-end gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-12">
                    <div className="sm:col-span-6">
                      <Field label="Package" htmlFor={`pkg-${index}`}>
                        <select
                          id={`pkg-${index}`}
                          value={line.packageId}
                          onChange={(e) => updateCatering(index, { packageId: e.target.value })}
                          className={inputClass}
                        >
                          <option value="">Select a package</option>
                          {packages.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name} - {formatINR(p.pricePerPlate)} per plate
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="Plates" htmlFor={`plates-${index}`}>
                        <input
                          id={`plates-${index}`}
                          type="number"
                          min="1"
                          value={line.plates}
                          onChange={(e) => updateCatering(index, { plates: e.target.value })}
                          className={inputClass}
                        />
                      </Field>
                    </div>
                    <p className="text-sm font-medium text-slate-700 sm:col-span-3 sm:pb-2.5">
                      {pkg ? formatINR(pkg.pricePerPlate * (Number(line.plates) || 0)) : "-"}
                    </p>
                    <button
                      type="button"
                      onClick={() => setCatering((l) => l.filter((_, i) => i !== index))}
                      aria-label="Remove package"
                      className="rounded-md p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 sm:col-span-1 sm:mb-0.5"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card
            title="Extra Services"
            description="Decoration, DJ, photography, lighting and other add-ons."
            action={
              <button
                type="button"
                onClick={() => setExtras((l) => [...l, { description: "", quantity: "1", unitPrice: "" }])}
                className={outlineButton}
              >
                <Plus size={15} />
                Add service
              </button>
            }
          >
            {extras.length === 0 && <p className="text-sm text-slate-500">No extra services added.</p>}
            <div className="space-y-3">
              {extras.map((extra, index) => (
                <div key={index} className="grid grid-cols-1 items-end gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-12">
                  <div className="sm:col-span-6">
                    <Field label="Description" htmlFor={`extra-${index}`}>
                      <input
                        id={`extra-${index}`}
                        value={extra.description}
                        onChange={(e) => updateExtra(index, { description: e.target.value })}
                        maxLength={150}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Qty" htmlFor={`qty-${index}`}>
                      <input
                        id={`qty-${index}`}
                        type="number"
                        min="1"
                        value={extra.quantity}
                        onChange={(e) => updateExtra(index, { quantity: e.target.value })}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-3">
                    <Field label="Unit price" htmlFor={`price-${index}`}>
                      <input
                        id={`price-${index}`}
                        type="number"
                        min="0"
                        value={extra.unitPrice}
                        onChange={(e) => updateExtra(index, { unitPrice: e.target.value })}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExtras((l) => l.filter((_, i) => i !== index))}
                    aria-label="Remove service"
                    className="rounded-md p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 sm:col-span-1 sm:mb-0.5"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Notes">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Special requests" htmlFor="specialRequests">
                <textarea id="specialRequests" name="specialRequests" rows={3} maxLength={1000} value={form.specialRequests} onChange={change} className={inputClass} />
              </Field>
              <Field label="Internal notes" htmlFor="internalNotes" hint="Not shown to the customer">
                <textarea id="internalNotes" name="internalNotes" rows={3} maxLength={1000} value={form.internalNotes} onChange={change} className={inputClass} />
              </Field>
            </div>
          </Card>

          {isManager && (
            <Card title="Manager Options" description="Leave blank to use the standard rates and policy.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Custom hall charge" htmlFor="hallCharge">
                  <input id="hallCharge" type="number" min="0" name="hallCharge" value={form.hallCharge} onChange={change} className={inputClass} />
                </Field>
                <Field label="Discount amount" htmlFor="discountAmount">
                  <input id="discountAmount" type="number" min="0" name="discountAmount" value={form.discountAmount} onChange={change} className={inputClass} />
                </Field>
                <Field label="Discount reason" htmlFor="discountReason">
                  <input id="discountReason" name="discountReason" value={form.discountReason} onChange={change} maxLength={200} className={inputClass} />
                </Field>
                <Field label="GST percent" htmlFor="taxPercent" hint={`Default is ${DEFAULT_TAX_PERCENT}%`}>
                  <input id="taxPercent" type="number" min="0" max="100" name="taxPercent" value={form.taxPercent} onChange={change} className={inputClass} />
                </Field>
                <Field label="Advance required" htmlFor="advanceRequired" hint="Default is 30% of the total">
                  <input id="advanceRequired" type="number" min="0" name="advanceRequired" value={form.advanceRequired} onChange={change} className={inputClass} />
                </Field>
                {!editing && (
                  <Field label="Hold for (hours)" htmlFor="holdHours" hint="Default is 48 hours">
                    <input id="holdHours" type="number" min="1" max="168" name="holdHours" value={form.holdHours} onChange={change} className={inputClass} />
                  </Field>
                )}
              </div>
              {!editing && (
                <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.confirmNow} onChange={(e) => setForm({ ...form, confirmNow: e.target.checked })} />
                  Confirm this booking immediately, without waiting for the advance
                </label>
              )}
            </Card>
          )}

          {!editing && (
            <Card
              title="Advance Payment"
              description="Optional. The booking is confirmed automatically once the required advance is received."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Amount" htmlFor="advAmount">
                  <input id="advAmount" type="number" min="0" value={advance.amount} onChange={(e) => setAdvance({ ...advance, amount: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Method" htmlFor="advMethod">
                  <select id="advMethod" value={advance.method} onChange={(e) => setAdvance({ ...advance, method: e.target.value })} className={inputClass}>
                    {PAYMENT_METHOD_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Reference" htmlFor="advRef">
                  <input id="advRef" value={advance.reference} onChange={(e) => setAdvance({ ...advance, reference: e.target.value })} maxLength={100} className={inputClass} />
                </Field>
              </div>
            </Card>
          )}

          <Card title="Estimated Total" description="The final amount is calculated by the server when you save.">
            <dl className="max-w-sm space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Hall charge</dt>
                <dd>{formatINR(estimatedHall)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Catering</dt>
                <dd>{formatINR(estimatedCatering)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Extra services</dt>
                <dd>{formatINR(estimatedExtras)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Discount</dt>
                  <dd>-{formatINR(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500">GST ({taxPercent}%)</dt>
                <dd>{formatINR(taxAmount)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                <dt>Total</dt>
                <dd>{formatINR(estimatedTotal)}</dd>
              </div>
            </dl>
          </Card>

          <div className="flex flex-col-reverse gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-end">
            <button type="button" onClick={() => navigate(backPath)} disabled={submitting} className={outlineButton}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className={primaryButton}>
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {editing ? "Save Changes" : "Create Booking"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default BanquetBookingForm;