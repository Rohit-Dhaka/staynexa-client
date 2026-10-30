
import { useState } from "react";
import {
  AlertCircle,
  ImagePlus,
  PackagePlus,
  Search,
  X,
} from "lucide-react";

import {
  Button,
  Field,
  inputClass,
  selectClass,
  textareaClass,
} from "./LostFoundUI";

import lostFoundService from "../services/lostFoundService";



const CATEGORIES = [
  { value: "phone", label: "Phone" },
  { value: "wallet", label: "Wallet" },
  { value: "jewellery", label: "Jewellery" },
  { value: "documents", label: "Documents" },
  { value: "clothing", label: "Clothing" },
  { value: "electronics", label: "Electronics" },
  { value: "bag", label: "Bag" },
  { value: "keys", label: "Keys" },
  { value: "accessories", label: "Accessories" },
  { value: "other", label: "Other" },
];

const AREAS = [
  { value: "room", label: "Guest Room" },
  { value: "restaurant", label: "Restaurant" },
  { value: "banquet", label: "Banquet Hall" },
  { value: "cab", label: "Cab" },
  { value: "lobby", label: "Lobby" },
  { value: "parking", label: "Parking" },
  { value: "spa", label: "Spa" },
  { value: "gym", label: "Gym" },
  { value: "pool", label: "Swimming Pool" },
  { value: "other", label: "Other" },
];

const INITIAL_LOST_FORM = {
  itemName: "",
  category: "",
  lostArea: "",
  lostAt: "",
  bookingNumber: "",
  roomNumber: "",
  contactName: "",
  contactPhone: "",
  description: "",
  color: "",
  brand: "",
  identifyingDetails: "",
  lostLocationNote: "",
  photos: [],
};

const INITIAL_FOUND_FORM = {
  itemName: "",
  category: "",
  foundArea: "",
  foundAt: "",
  roomNumber: "",
  foundLocationNote: "",
  description: "",
  color: "",
  brand: "",
  storageLocation: "",
  photos: [],
  isHighValue: false,
  retentionDays: 90,
};



function toLocalDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

function normalizePhotos(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function validatePhone(phone) {
  return /^[+\d\s()-]{7,20}$/.test(phone.trim());
}


function TextInput({
  label,
  name,
  value,
  onChange,
  required = false,
  placeholder = "",
  type = "text",
  min,
  max,
  hint,
}) {
  return (
    <Field label={label} required={required} hint={hint}>
      <input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        className={inputClass}
      />
    </Field>
  );
}

function SelectInput({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  placeholder = "Select an option",
}) {
  return (
    <Field label={label} required={required}>
      <select
        name={name}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        className={selectClass}
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function TextAreaInput({
  label,
  name,
  value,
  onChange,
  required = false,
  placeholder = "",
  rows = 3,
  hint,
}) {
  return (
    <Field label={label} required={required} hint={hint}>
      <textarea
        name={name}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        rows={rows}
        className={textareaClass}
      />
    </Field>
  );
}


function FormSection({ title, description, children }) {
  return (
    <section className="space-y-4">
      <div className="border-b border-slate-200 pb-3">
        <h3 className="text-base font-semibold text-slate-900">
          {title}
        </h3>

        {description && (
          <p className="mt-1 text-sm leading-5 text-slate-500">
            {description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}


function PhotoUrlInput({ photos, onChange }) {
  const [photoUrl, setPhotoUrl] = useState("");

  const addPhoto = () => {
    const url = photoUrl.trim();

    if (!url) return;

    try {
      const parsedUrl = new URL(url);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return;
      }
    } catch {
      return;
    }

    if (photos.includes(url)) {
      setPhotoUrl("");
      return;
    }

    onChange([...photos, url]);
    setPhotoUrl("");
  };

  const removePhoto = (urlToRemove) => {
    onChange(photos.filter((url) => url !== urlToRemove));
  };

  return (
    <div className="space-y-3">
      <Field
        label="Photo URLs"
        hint="Add publicly accessible image URLs. Direct file upload is not configured in this form."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={photoUrl}
            onChange={(event) => setPhotoUrl(event.target.value)}
            placeholder="https://example.com/item-photo.jpg"
            className={inputClass}
          />

          <Button
            variant="secondary"
            onClick={addPhoto}
            className="shrink-0"
          >
            <ImagePlus size={16} />
            Add URL
          </Button>
        </div>
      </Field>

      {photos.length > 0 && (
        <div className="space-y-2">
          {photos.map((url) => (
            <div
              key={url}
              className="flex min-w-0 items-center gap-3 rounded border border-slate-200 p-3"
            >
              <ImagePlus
                size={18}
                className="shrink-0 text-slate-500"
              />

              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 break-all text-sm text-blue-700 underline underline-offset-2"
              >
                {url}
              </a>

              <button
                type="button"
                onClick={() => removePhoto(url)}
                aria-label="Remove photo URL"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


export default function LostFoundForm({
  mode = "lost",
  initialData = {},
  onSubmit,
  onCancel,
}) {
  const isFound = mode === "found";

  const defaults = isFound
    ? INITIAL_FOUND_FORM
    : INITIAL_LOST_FORM;

  const [form, setForm] = useState(() => ({
    ...defaults,
    ...initialData,
    photos: normalizePhotos(initialData.photos),
  }));

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setSubmitError("");
  };

  const updatePhotos = (photos) => {
    setForm((previous) => ({
      ...previous,
      photos,
    }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.itemName.trim()) {
      nextErrors.itemName = "Item name is required.";
    }

    if (!form.category) {
      nextErrors.category = "Please select a category.";
    }

    if (isFound && !form.foundArea) {
      nextErrors.foundArea = "Please select where the item was found.";
    }

    if (!isFound && !form.lostArea) {
      nextErrors.lostArea = "Please select where the item was lost.";
    }

    if (!isFound && !form.contactName.trim()) {
      nextErrors.contactName = "Contact name is required.";
    }

    if (!isFound && !form.contactPhone.trim()) {
      nextErrors.contactPhone = "Contact phone is required.";
    } else if (
      !isFound &&
      !validatePhone(form.contactPhone)
    ) {
      nextErrors.contactPhone = "Enter a valid contact phone number.";
    }

    const dateValue = isFound ? form.foundAt : form.lostAt;

    if (dateValue && Number.isNaN(new Date(dateValue).getTime())) {
      nextErrors[isFound ? "foundAt" : "lostAt"] =
        "Enter a valid date and time.";
    }

    if (isFound) {
      const retentionDays = Number(form.retentionDays);

      if (
        !Number.isInteger(retentionDays) ||
        retentionDays < 1 ||
        retentionDays > 3650
      ) {
        nextErrors.retentionDays =
          "Retention days must be between 1 and 3650.";
      }

      if (!form.storageLocation.trim()) {
        nextErrors.storageLocation =
          "Storage location is required.";
      }
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitError("");

    if (!validateForm()) {
      return;
    }


    const submitHandler =
      onSubmit ??
      (isFound
        ? lostFoundService.createFoundItem
        : lostFoundService.createMyReport);

    if (typeof submitHandler !== "function") {
      setSubmitError(
        "Unable to submit this form because the submission service is unavailable."
      );
      return;
    }

    const payload = {
      ...form,
      itemName: form.itemName.trim(),
      description: form.description.trim(),
      color: form.color.trim(),
      brand: form.brand.trim(),
      photos: normalizePhotos(form.photos),
    };

    if (isFound) {
      payload.foundArea = form.foundArea;
      payload.foundAt = form.foundAt
        ? new Date(form.foundAt).toISOString()
        : undefined;

      payload.roomNumber = form.roomNumber.trim();
      payload.foundLocationNote = form.foundLocationNote.trim();
      payload.storageLocation = form.storageLocation.trim();
      payload.retentionDays = Number(form.retentionDays);
      payload.isHighValue = Boolean(form.isHighValue);

      delete payload.lostArea;
      delete payload.lostAt;
      delete payload.bookingNumber;
      delete payload.contactName;
      delete payload.contactPhone;
      delete payload.identifyingDetails;
      delete payload.lostLocationNote;
    } else {
      payload.lostArea = form.lostArea;
      payload.lostAt = form.lostAt
        ? new Date(form.lostAt).toISOString()
        : undefined;

      payload.bookingNumber = form.bookingNumber.trim();
      payload.roomNumber = form.roomNumber.trim();
      payload.contactName = form.contactName.trim();
      payload.contactPhone = form.contactPhone.trim();
      payload.identifyingDetails = form.identifyingDetails.trim();
      payload.lostLocationNote = form.lostLocationNote.trim();

      delete payload.foundArea;
      delete payload.foundAt;
      delete payload.foundLocationNote;
      delete payload.storageLocation;
      delete payload.retentionDays;
      delete payload.isHighValue;
    }

    try {
      setSubmitting(true);

      await submitHandler(payload);
    } catch (error) {
      setSubmitError(
        error?.message ||
          "Unable to save the record. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <form onSubmit={handleSubmit} className="space-y-7">
   

      <div className="flex items-start gap-3 rounded border border-slate-200 bg-slate-50 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-slate-700">
          {isFound ? (
            <PackagePlus size={21} />
          ) : (
            <Search size={21} />
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {isFound ? "Register Found Item" : "Report Lost Item"}
          </h2>

          <p className="mt-1 text-sm leading-5 text-slate-500">
            {isFound
              ? "Record an item found on the hotel premises."
              : "Provide the item details to help the hotel locate it."}
          </p>
        </div>
      </div>

   

      <FormSection
        title="Item Details"
        description="Provide identifying information about the item."
      >
        <TextInput
          label="Item Name"
          name="itemName"
          value={form.itemName}
          onChange={updateField}
          required
          placeholder="e.g. Black leather wallet"
        />

        <SelectInput
          label="Category"
          name="category"
          value={form.category}
          onChange={updateField}
          options={CATEGORIES}
          required
        />

        {errors.itemName && (
          <p className="text-xs text-red-600">{errors.itemName}</p>
        )}

        {errors.category && (
          <p className="text-xs text-red-600">{errors.category}</p>
        )}

        <TextInput
          label="Color"
          name="color"
          value={form.color}
          onChange={updateField}
          placeholder="e.g. Black"
        />

        <TextInput
          label="Brand"
          name="brand"
          value={form.brand}
          onChange={updateField}
          placeholder="e.g. Samsung"
        />

        <div className="sm:col-span-2">
          <TextAreaInput
            label="Description"
            name="description"
            value={form.description}
            onChange={updateField}
            placeholder="Describe the item, its appearance, and any distinctive features."
            rows={3}
          />
        </div>
      </FormSection>

      

      <FormSection
        title="Location and Time"
        description="Add the location and approximate time of the incident."
      >
        <SelectInput
          label={isFound ? "Found Area" : "Lost Area"}
          name={isFound ? "foundArea" : "lostArea"}
          value={isFound ? form.foundArea : form.lostArea}
          onChange={updateField}
          options={AREAS}
          required
        />

        <TextInput
          label={isFound ? "Found Date and Time" : "Lost Date and Time"}
          name={isFound ? "foundAt" : "lostAt"}
          value={isFound ? form.foundAt : form.lostAt}
          onChange={updateField}
          type="datetime-local"
          max={toLocalDateTimeValue()}
        />

        {(errors.foundArea || errors.lostArea) && (
          <p className="text-xs text-red-600">
            {errors.foundArea || errors.lostArea}
          </p>
        )}

        {(errors.foundAt || errors.lostAt) && (
          <p className="text-xs text-red-600">
            {errors.foundAt || errors.lostAt}
          </p>
        )}

        <TextInput
          label="Room Number"
          name="roomNumber"
          value={form.roomNumber}
          onChange={updateField}
          placeholder="e.g. 204"
        />

        <div className="sm:col-span-2">
          <TextAreaInput
            label={
              isFound
                ? "Found Location Details"
                : "Additional Location Details"
            }
            name={isFound ? "foundLocationNote" : "lostLocationNote"}
            value={
              isFound
                ? form.foundLocationNote
                : form.lostLocationNote
            }
            onChange={updateField}
            placeholder="Provide landmarks or additional location details."
            rows={2}
          />
        </div>
      </FormSection>

  

      {!isFound && (
        <>
          <FormSection
            title="Guest Contact Details"
            description="Provide contact information for follow-up."
          >
            <TextInput
              label="Guest Name"
              name="contactName"
              value={form.contactName}
              onChange={updateField}
              required
              placeholder="Enter your full name"
            />

            <TextInput
              label="Contact Phone"
              name="contactPhone"
              value={form.contactPhone}
              onChange={updateField}
              required
              type="tel"
              placeholder="Enter your phone number"
            />

            {errors.contactName && (
              <p className="text-xs text-red-600">
                {errors.contactName}
              </p>
            )}

            {errors.contactPhone && (
              <p className="text-xs text-red-600">
                {errors.contactPhone}
              </p>
            )}

            <TextInput
              label="Booking Number"
              name="bookingNumber"
              value={form.bookingNumber}
              onChange={updateField}
              placeholder="Optional booking reference"
            />

            <div className="sm:col-span-2">
              <TextAreaInput
                label="Identifying Details"
                name="identifyingDetails"
                value={form.identifyingDetails}
                onChange={updateField}
                placeholder="Engravings, stickers, contents, or other identifying details."
                rows={3}
              />
            </div>
          </FormSection>
        </>
      )}

      

      {isFound && (
        <FormSection
          title="Storage and Retention"
          description="Record where the item is stored and how long it should be retained."
        >
          <TextInput
            label="Storage Location"
            name="storageLocation"
            value={form.storageLocation}
            onChange={updateField}
            required
            placeholder="e.g. Security Office, Cabinet A"
          />

          {errors.storageLocation && (
            <p className="text-xs text-red-600">
              {errors.storageLocation}
            </p>
          )}

          <TextInput
            label="Retention Period (Days)"
            name="retentionDays"
            value={form.retentionDays}
            onChange={updateField}
            type="number"
            min="1"
            max="3650"
            required
            hint="Number of days the hotel will retain the item."
          />

          {errors.retentionDays && (
            <p className="text-xs text-red-600">
              {errors.retentionDays}
            </p>
          )}

          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-start gap-3 rounded border border-slate-200 p-4 transition-colors hover:bg-slate-50">
              <input
                type="checkbox"
                name="isHighValue"
                checked={Boolean(form.isHighValue)}
                onChange={updateField}
                className="mt-1 h-4 w-4 rounded border-slate-300 accent-slate-900"
              />

              <span>
                <span className="block text-sm font-medium text-slate-800">
                  High-Value Item
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Mark the item for additional handling and attention.
                </span>
              </span>
            </label>
          </div>
        </FormSection>
      )}

    

      <FormSection
        title="Item Photos"
        description="Optionally add image URLs to help identify the item."
      >
        <div className="sm:col-span-2">
          <PhotoUrlInput
            photos={form.photos}
            onChange={updatePhotos}
          />
        </div>
      </FormSection>

   

      {submitError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded border border-red-200 bg-red-50 p-4"
        >
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0 text-red-600"
          />

          <p className="text-sm leading-6 text-red-700">
            {submitError}
          </p>
        </div>
      )}

   

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
        )}

        <Button
          type="submit"
          loading={submitting}
          disabled={submitting}
        >
          {submitting
            ? "Saving..."
            : isFound
              ? "Register Found Item"
              : "Submit Lost Report"}
        </Button>
      </div>
    </form>
  );
}
