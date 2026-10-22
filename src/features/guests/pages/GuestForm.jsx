import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import {
  createGuest,
  getGuestById,
  updateGuest,
} from "../services/guestExperience.service";

const BACK_PATH = "/guests";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60";

const ID_TYPES = [
  { value: "aadhaar", label: "Aadhaar" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driving licence" },
  { value: "voter_id", label: "Voter ID" },
  { value: "pan", label: "PAN" },
];

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  gender: "male",
  dateOfBirth: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  idType: "",
  idNumber: "",
  notes: "",
};

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

const toForm = (guest) => ({
  name: guest.name || "",
  phone: guest.phone || "",
  email: guest.email || "",
  gender: guest.gender || "male",
  dateOfBirth: toDateInput(guest.dateOfBirth),
  address: guest.address || "",
  city: guest.city || "",
  state: guest.state || "",
  country: guest.country || "India",
  idType: guest.idProof?.type || "",
  idNumber: guest.idProof?.number || "",
  notes: guest.notes || "",
});

const Field = ({ id, label, required, children }) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-700">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
  </div>
);

const GuestForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return undefined;
    let active = true;

    getGuestById(id)
      .then((data) => {
        if (active) setForm(toForm(data.guest));
      })
      .catch((error) => {
        if (!active) return;
        toast.error(error.response?.data?.message || "Could not load guest");
        navigate(BACK_PATH, { replace: true });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, isEdit, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (form.name.trim().length < 2) return "Enter the guest's name";
    if (!PHONE_REGEX.test(form.phone.trim())) return "Enter a valid phone number";
    if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) {
      return "Enter a valid email address";
    }
    if (form.dateOfBirth && new Date(form.dateOfBirth) > new Date()) {
      return "Date of birth cannot be in the future";
    }
    if (Boolean(form.idType) !== Boolean(form.idNumber.trim())) {
      return "Select the ID type and enter the ID number together";
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase(),
      gender: form.gender,
      dateOfBirth: form.dateOfBirth || null,
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      country: form.country.trim(),
      notes: form.notes.trim(),
      idProof: { type: form.idType, number: form.idNumber.trim() },
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateGuest(id, payload);
        toast.success("Guest updated successfully");
      } else {
        await createGuest(payload);
        toast.success("Guest created successfully");
      }
      navigate(BACK_PATH);
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
      setSubmitting(false);
    }
  };

  const input = (name, extra = {}) => (
    <input
      id={name}
      name={name}
      value={form[name]}
      onChange={handleChange}
      disabled={submitting}
      className={inputClass}
      {...extra}
    />
  );

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-none px-4">
      <div>
        <Link
          to={BACK_PATH}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Guests
        </Link>
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          {isEdit ? "Edit Guest" : "Add Guest"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="mb-5 text-sm font-semibold text-slate-900">Basic details</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field id="name" label="Full name" required>
              {input("name", { maxLength: 100, placeholder: "e.g. Rahul Verma" })}
            </Field>
            <Field id="phone" label="Phone" required>
              {input("phone", { type: "tel", maxLength: 20, placeholder: "e.g. 9876543210" })}
            </Field>
            <Field id="email" label="Email">
              {input("email", { type: "email", maxLength: 150 })}
            </Field>
            <Field id="gender" label="Gender">
              <select
                id="gender"
                name="gender"
                value={form.gender}
                onChange={handleChange}
                disabled={submitting}
                className={inputClass}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field id="dateOfBirth" label="Date of birth">
              {input("dateOfBirth", { type: "date" })}
            </Field>
          </div>
        </section>

        <section className="rounded border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="mb-5 text-sm font-semibold text-slate-900">Address</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <Field id="address" label="Address">
                {input("address", { maxLength: 200 })}
              </Field>
            </div>
            <Field id="city" label="City">
              {input("city", { maxLength: 80 })}
            </Field>
            <Field id="state" label="State">
              {input("state", { maxLength: 80 })}
            </Field>
            <Field id="country" label="Country">
              {input("country", { maxLength: 80 })}
            </Field>
          </div>
        </section>

        <section className="rounded border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="mb-5 text-sm font-semibold text-slate-900">ID proof and notes</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field id="idType" label="ID type">
              <select
                id="idType"
                name="idType"
                value={form.idType}
                onChange={handleChange}
                disabled={submitting}
                className={inputClass}
              >
                <option value="">Select ID type</option>
                {ID_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field id="idNumber" label="ID number">
                {input("idNumber", { maxLength: 40 })}
              </Field>
            </div>
            <div className="sm:col-span-3">
              <Field id="notes" label="Notes">
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  maxLength={500}
                  value={form.notes}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="Preferences, allergies, special instructions"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 rounded border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            <span className="text-rose-500">*</span> Required fields
          </p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate(BACK_PATH)}
              disabled={submitting}
              className="rounded border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded bg-[#1a1a1a] px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-70"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? "Update Guest" : "Create Guest"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default GuestForm;