import { useState } from "react";
import toast from "react-hot-toast";

import Modal from "../../../components/common/Modal";
import { createHall, updateHall } from "../services/banquet.service";
import { Field, ModalActions } from "./BanquetUi";

import {PRICING_TYPE_OPTIONS,SETUP_STYLE_OPTIONS,getErrorMessage,inputClass,} from "../../../utils/banquet.utils";

const toForm = (hall) => ({
  name: hall?.name || "",
  code: hall?.code || "",
  floor: String(hall?.floor ?? 0),
  areaSqFt: String(hall?.areaSqFt ?? ""),
  capacityMin: String(hall?.capacityMin ?? 0),
  capacityMax: String(hall?.capacityMax ?? ""),
  pricingType: hall?.pricingType || "per_hour",
  rate: String(hall?.rate ?? ""),
  bufferMinutes: String(hall?.bufferMinutes ?? 60),
  description: hall?.description || "",
  amenities: (hall?.amenities || []).join(", "),
  setupStyles: hall?.setupStyles || [],
  isActive: hall?.isActive ?? true,
});

const HallFormModal = ({ hall, onClose, onSaved }) => {
  const [form, setForm] = useState(() => toForm(hall));
  const [saving, setSaving] = useState(false);

  const change = (event) => setForm((f) => ({ ...f, [event.target.name]: event.target.value }));

  const toggleStyle = (value) =>
    setForm((f) => ({
      ...f,
      setupStyles: f.setupStyles.includes(value)
        ? f.setupStyles.filter((s) => s !== value)
        : [...f.setupStyles, value],
    }));

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Enter the hall name");
    if (!form.capacityMax) return toast.error("Enter the maximum capacity");
    if (form.rate === "") return toast.error("Enter the rate");

    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      floor: Number(form.floor || 0),
      areaSqFt: Number(form.areaSqFt || 0),
      capacityMin: Number(form.capacityMin || 0),
      capacityMax: Number(form.capacityMax),
      pricingType: form.pricingType,
      rate: Number(form.rate),
      bufferMinutes: Number(form.bufferMinutes || 0),
      description: form.description.trim(),
      amenities: form.amenities.split(",").map((a) => a.trim()).filter(Boolean),
      setupStyles: form.setupStyles,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (hall) await updateHall(hall._id, payload);
      else await createHall(payload);
      toast.success(hall ? "Hall updated successfully" : "Hall created successfully");
      onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      title={hall ? "Edit Hall" : "Add Hall"}
      onClose={onClose}
      busy={saving}
      footer={
        <ModalActions onCancel={onClose} onConfirm={submit} confirmText={hall ? "Save Changes" : "Create Hall"} busy={saving} />
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Hall name" required htmlFor="name">
          <input id="name" name="name" value={form.name} onChange={change} className={inputClass} />
        </Field>
        <Field label="Code" htmlFor="code" hint="Short code, e.g. GH1">
          <input id="code" name="code" value={form.code} onChange={change} maxLength={20} className={inputClass} />
        </Field>
        <Field label="Minimum capacity" htmlFor="capacityMin">
          <input id="capacityMin" type="number" min="0" name="capacityMin" value={form.capacityMin} onChange={change} className={inputClass} />
        </Field>
        <Field label="Maximum capacity" required htmlFor="capacityMax">
          <input id="capacityMax" type="number" min="1" name="capacityMax" value={form.capacityMax} onChange={change} className={inputClass} />
        </Field>
        <Field label="Pricing" htmlFor="pricingType">
          <select id="pricingType" name="pricingType" value={form.pricingType} onChange={change} className={inputClass}>
            {PRICING_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={form.pricingType === "per_hour" ? "Rate per hour" : "Flat rate per event"} required htmlFor="rate">
          <input id="rate" type="number" min="0" name="rate" value={form.rate} onChange={change} className={inputClass} />
        </Field>
        <Field label="Floor" htmlFor="floor">
          <input id="floor" type="number" name="floor" value={form.floor} onChange={change} className={inputClass} />
        </Field>
        <Field label="Area (sq ft)" htmlFor="areaSqFt">
          <input id="areaSqFt" type="number" min="0" name="areaSqFt" value={form.areaSqFt} onChange={change} className={inputClass} />
        </Field>
        <Field label="Buffer between events (minutes)" htmlFor="bufferMinutes" hint="Time kept free for cleaning and setup">
          <input id="bufferMinutes" type="number" min="0" name="bufferMinutes" value={form.bufferMinutes} onChange={change} className={inputClass} />
        </Field>
        <Field label="Amenities" htmlFor="amenities" hint="Separate with commas, e.g. AC, Stage, Parking">
          <input id="amenities" name="amenities" value={form.amenities} onChange={change} className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description" htmlFor="description">
            <textarea id="description" name="description" rows={2} maxLength={500} value={form.description} onChange={change} className={inputClass} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-medium text-slate-700">Supported setup styles</p>
          <div className="flex flex-wrap gap-2">
            {SETUP_STYLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleStyle(option.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  form.setupStyles.includes(option.value)
                    ? "border-indigo-500 bg-black text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          This hall is active and can be booked
        </label>
      </div>
    </Modal>
  );
};

export default HallFormModal;