import { useState } from "react";
import toast from "react-hot-toast";

import Modal from "../../../components/common/Modal";
import { createCatering, updateCatering } from "../services/banquet.service";
import { Field, ModalActions } from "./BanquetUi";
// import { FOOD_TYPE_OPTIONS, MEAL_TYPE_OPTIONS, getErrorMessage, inputClass } from "../banquet.utils";
import { FOOD_TYPE_OPTIONS, MEAL_TYPE_OPTIONS, getErrorMessage, inputClass } from "../../../utils/banquet.utils";

const toForm = (pkg) => ({
  name: pkg?.name || "",
  mealType: pkg?.mealType || "dinner",
  foodType: pkg?.foodType || "veg",
  pricePerPlate: String(pkg?.pricePerPlate ?? ""),
  minGuests: String(pkg?.minGuests ?? 1),
  items: (pkg?.items || []).join("\n"),
  description: pkg?.description || "",
  isActive: pkg?.isActive ?? true,
});

const CateringFormModal = ({ pkg, onClose, onSaved }) => {
  const [form, setForm] = useState(() => toForm(pkg));
  const [saving, setSaving] = useState(false);

  const change = (event) => setForm((f) => ({ ...f, [event.target.name]: event.target.value }));

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Enter the package name");
    if (form.pricePerPlate === "") return toast.error("Enter the price per plate");

    const payload = {
      name: form.name.trim(),
      mealType: form.mealType,
      foodType: form.foodType,
      pricePerPlate: Number(form.pricePerPlate),
      minGuests: Number(form.minGuests || 1),
      items: form.items.split("\n").map((i) => i.trim()).filter(Boolean),
      description: form.description.trim(),
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (pkg) await updateCatering(pkg._id, payload);
      else await createCatering(payload);
      toast.success(pkg ? "Package updated successfully" : "Package created successfully");
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
      title={pkg ? "Edit Catering Package" : "Add Catering Package"}
      onClose={onClose}
      busy={saving}
      footer={
        <ModalActions onCancel={onClose} onConfirm={submit} confirmText={pkg ? "Save Changes" : "Create Package"} busy={saving} />
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Package name" required htmlFor="name">
            <input id="name" name="name" value={form.name} onChange={change} placeholder="e.g. Royal Veg Dinner" className={inputClass} />
          </Field>
        </div>
        <Field label="Meal type" htmlFor="mealType">
          <select id="mealType" name="mealType" value={form.mealType} onChange={change} className={inputClass}>
            {MEAL_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Food type" htmlFor="foodType">
          <select id="foodType" name="foodType" value={form.foodType} onChange={change} className={inputClass}>
            {FOOD_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Price per plate" required htmlFor="pricePerPlate">
          <input id="pricePerPlate" type="number" min="0" name="pricePerPlate" value={form.pricePerPlate} onChange={change} className={inputClass} />
        </Field>
        <Field label="Minimum plates" htmlFor="minGuests">
          <input id="minGuests" type="number" min="1" name="minGuests" value={form.minGuests} onChange={change} className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Menu items" htmlFor="items" hint="One item per line">
            <textarea id="items" name="items" rows={5} value={form.items} onChange={change} className={inputClass} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Description" htmlFor="description">
            <input id="description" name="description" value={form.description} onChange={change} maxLength={500} className={inputClass} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          This package is active and can be selected for bookings
        </label>
      </div>
    </Modal>
  );
};

export default CateringFormModal;