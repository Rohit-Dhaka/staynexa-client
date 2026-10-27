





import { useEffect, useState } from "react";

import { Link, useNavigate, useParams } from "react-router-dom";

import {

  ArrowLeft,

  Check,

  CheckCircle2,

  Copy,

  Eye,

  EyeOff,

  Loader2,

  RefreshCw,

} from "lucide-react";

import toast from "react-hot-toast";

import { ROLES } from "../../../constants/roles";

import { FormSkeleton } from "../../../components/common/Skeleton";

import {

  createStaff,

  getStaffById,

  updateStaff,

} from "../services/staff.service";

import {

  DEPARTMENT_OPTIONS,

  GENDER_OPTIONS,

  ID_TYPE_OPTIONS,

  ROLE_OPTIONS,

  generatePassword,

  getPasswordError,

} from "../staff.utils";



const BACK_PATH = "/staff";



const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;



const inputClass =

  "w-full rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60";



const labelClass = "mb-1.5 block text-xs font-medium text-slate-700";





const toDateInput = (value) => {

  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 10);

};



const emptyForm = () => ({

  name: "",

  email: "",

  password: "",

  role: ROLES.STAFF,

  phone: "",

  department: "",

  designation: "",

  gender: "",

  dateOfBirth: "",

  joiningDate: toDateInput(new Date()),

  line1: "",

  city: "",

  state: "",

  pincode: "",

  emName: "",

  emPhone: "",

  emRelation: "",

  idType: "",

  idNumber: "",

});



const toForm = (staff) => ({

  name: staff.name || "",

  email: staff.email || "",

  password: "",

  role: staff.role || ROLES.STAFF,

  phone: staff.phone || "",

  department: staff.department || "",

  designation: staff.designation || "",

  gender: staff.gender || "",

  dateOfBirth: toDateInput(staff.dateOfBirth),

  joiningDate: toDateInput(staff.joiningDate),

  line1: staff.address?.line1 || "",

  city: staff.address?.city || "",

  state: staff.address?.state || "",

  pincode: staff.address?.pincode || "",

  emName: staff.emergencyContact?.name || "",

  emPhone: staff.emergencyContact?.phone || "",

  emRelation: staff.emergencyContact?.relation || "",

  idType: staff.idProof?.type || "",

  idNumber: staff.idProof?.number || "",

});



const buildPayload = (form, isEdit) => {
  const payload = {
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    role: form.role,
    phone: form.phone.trim(),
    department: form.department,
    designation: form.designation.trim(),
    gender: form.gender,
    dateOfBirth: form.dateOfBirth || null,
    joiningDate: form.joiningDate || null,
    address: {
      line1: form.line1.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
    },
    emergencyContact: {
      name: form.emName.trim(),
      phone: form.emPhone.trim(),
      relation: form.emRelation.trim(),
    },
    idProof:
      form.idType && form.idNumber.trim()
        ? { type: form.idType, number: form.idNumber.trim() }
        : null,
  };

  
  if (!isEdit) payload.password = form.password;

  return payload;
};

const SectionCard = ({ title, description, children }) => (

  <section className="rounded border border-slate-200 bg-white p-5 sm:p-6">

    <div className="mb-5">

      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>

      {description && (

        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>

      )}

    </div>

    {children}

  </section>

);



const Field = ({ id, label, required, children, hint }) => (

  <div>

    <label htmlFor={id} className={labelClass}>

      {label} {required && <span className="text-rose-500">*</span>}

    </label>

    {children}

    {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}

  </div>

);



const StaffForm = () => {

  const { id } = useParams();

  const navigate = useNavigate();

  const isEdit = Boolean(id);



  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(isEdit);

  const [submitting, setSubmitting] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [created, setCreated] = useState(null); 

  const [copied, setCopied] = useState(false);



  useEffect(() => {

    if (!isEdit) return undefined;



    let active = true;



    getStaffById(id)

      .then((data) => {

        if (!active) return;

        const staff = data?.staff ?? data?.data?.staff ?? data?.data ?? data;

          if (!staff?._id) {
            throw new Error("Staff details were not found in the API response");
          }

          setForm(toForm(staff));

      })

      .catch((error) => {

        if (!active) return;

        toast.error(

          error.response?.data?.message || "Could not load staff details"

        );

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

    setForm((previous) => ({ ...previous, [name]: value }));

  };



  const handleGenerate = () => {

    setForm((previous) => ({ ...previous, password: generatePassword() }));

    setShowPassword(true);

  };



  const validate = () => {

    if (form.name.trim().length < 2) return "Enter the staff member's name";

    if (!EMAIL_REGEX.test(form.email.trim())) {

      return "Enter a valid email address";

    }

    if (!isEdit) {

      const passwordError = getPasswordError(form.password);

      if (passwordError) return passwordError;

    }

    if (form.phone.trim() && !PHONE_REGEX.test(form.phone.trim())) {

      return "Enter a valid phone number";

    }

    if (form.emPhone.trim() && !PHONE_REGEX.test(form.emPhone.trim())) {

      return "Enter a valid emergency contact phone number";

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



    const payload = buildPayload(form, isEdit);



    setSubmitting(true);



    try {

      if (isEdit) {

        await updateStaff(id, payload);

        toast.success("Staff member updated successfully");

        navigate(BACK_PATH);

      } else {

        await createStaff(payload);

        toast.success("Staff account created successfully");

        

        setCreated({

          name: payload.name,

          email: payload.email,

          password: form.password,

        });

        setSubmitting(false);

      }

    } catch (err) {

      toast.error(err.response?.data?.message || "Something went wrong");

      setSubmitting(false);

    }

  };



  const handleCopyCredentials = async () => {

    if (!created) return;

    try {

      await navigator.clipboard.writeText(

        `Email: ${created.email}\nPassword: ${created.password}`

      );

      setCopied(true);

      toast.success("Login details copied");

      setTimeout(() => setCopied(false), 2000);

    } catch {

      toast.error("Could not copy the login details");

    }

  };



  const addAnother = () => {

    setForm(emptyForm());

    setCreated(null);

    setShowPassword(false);

  };



  /* --------------------------- Success screen --------------------------- */



  if (created) {

    return (

      <div className=" space-y-6 w-full max-w-none ">

        <div className="rounded border border-slate-200 bg-white p-6 text-center sm:p-8">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">

            <CheckCircle2 size={30} />

          </div>



          <h1 className="mt-4 text-xl font-bold text-slate-900">

            Staff account created

          </h1>

          <p className="mt-1 text-sm text-slate-500">

            Share these login details with {created.name}. The password is not

            shown again.

          </p>



          <dl className="mt-6 space-y-3 rounded bg-slate-50 p-4 text-left text-sm">

            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">

              <dt className="text-slate-500">Email</dt>

              <dd className="break-all font-medium text-slate-900">

                {created.email}

              </dd>

            </div>

            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">

              <dt className="text-slate-500">Temporary password</dt>

              <dd className="break-all font-mono font-medium text-slate-900">

                {created.password}

              </dd>

            </div>

          </dl>



          <p className="mt-3 text-xs text-slate-500">

            The staff member will be asked to choose a new password the first

            time they sign in.

          </p>



          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">

            <button

              type="button"

              onClick={handleCopyCredentials}

              className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"

            >

              {copied ? (

                <Check size={16} className="text-emerald-600" />

              ) : (

                <Copy size={16} />

              )}

              Copy login details

            </button>

            <button

              type="button"

              onClick={addAnother}

              className="rounded border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"

            >

              Add Another

            </button>

            <button

              type="button"

              onClick={() => navigate(BACK_PATH)}

              className="rounded bg-[#1a1a1a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"

            >

              Back to Staff List

            </button>

          </div>

        </div>

      </div>

    );

  }



  /* -------------------------------- Form -------------------------------- */



  return (

    <div className=" space-y-6 w-full max-w-none ">

      <div>

        <Link

          to={BACK_PATH}

          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"

        >

          <ArrowLeft size={16} />

          Back to Staff

        </Link>

        <h1 className="mt-3 text-xl font-bold text-slate-900">

          {isEdit ? "Edit Staff Member" : "Add Staff Member"}

        </h1>

        <p className="mt-1 text-sm text-slate-500">

          {isEdit

            ? "Update this staff member's profile. Use Reset Password in the staff list to change their password."

            : "Create a login and profile for a new staff member."}

        </p>

      </div>



      {loading ? (

        <div className="rounded border border-slate-200 bg-white p-5 sm:p-6">

          <FormSkeleton fields={8} />

        </div>

      ) : (

        <form onSubmit={handleSubmit} className="space-y-5">

         

          <SectionCard

            title="Account & Login"

            description="The staff member signs in with this email and password."

          >

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">

              <Field id="name" label="Full Name" required>

                <input

                  id="name"

                  name="name"

                  value={form.name}

                  onChange={handleChange}

                  placeholder="e.g. Amit Sharma"

                  maxLength={100}

                  disabled={submitting}

                  className={inputClass}

                />

              </Field>



              <Field id="email" label="Email" required>

                <input

                  id="email"

                  name="email"

                  type="email"

                  value={form.email}

                  onChange={handleChange}

                  placeholder="amit@hotel.com"

                  maxLength={150}

                  autoComplete="off"

                  disabled={submitting}

                  className={inputClass}

                />

              </Field>



              <Field id="role" label="Role" required>

                <select

                  id="role"

                  name="role"

                  value={form.role}

                  onChange={handleChange}

                  disabled={submitting}

                  className={inputClass}

                >

                  {ROLE_OPTIONS.map((option) => (

                    <option key={option.value} value={option.value}>

                      {option.label}

                    </option>

                  ))}

                </select>

              </Field>



              {!isEdit && (

                <div>

                  <div className="mb-1.5 flex items-center justify-between">

                    <label

                      htmlFor="password"

                      className="text-xs font-medium text-slate-700"

                    >

                     
                       Password{" "}

                      <span className="text-rose-500">*</span>

                    </label>

                    <button

                      type="button"

                      onClick={handleGenerate}

                      disabled={submitting}

                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition hover:text-indigo-800 disabled:opacity-50"

                    >

                      <RefreshCw size={12} />

                      Generate

                    </button>

                  </div>



                  <div className="relative">

                    <input

                      id="password"

                      name="password"

                      type={showPassword ? "text" : "password"}

                      value={form.password}

                      onChange={handleChange}

                      placeholder="Enter or generate a password"

                      autoComplete="new-password"

                      maxLength={64}

                      disabled={submitting}

                      className={`${inputClass} pr-11`}

                    />

                    <button

                      type="button"

                      onClick={() => setShowPassword((previous) => !previous)}

                      aria-label={

                        showPassword ? "Hide password" : "Show password"

                      }

                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"

                    >

                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}

                    </button>

                  </div>



                  <p className="mt-1.5 text-xs text-slate-500">

                    At least 8 characters with a letter and a number. The staff

                    member must change it at first login.

                  </p>

                </div>

              )}

            </div>

          </SectionCard>



          

          <SectionCard

            title="Work Details"

            description="Where this person works and when they joined."

          >

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">

              <Field id="department" label="Department">

                <select

                  id="department"

                  name="department"

                  value={form.department}

                  onChange={handleChange}

                  disabled={submitting}

                  className={inputClass}

                >

                  <option value="">Select department</option>

                  {DEPARTMENT_OPTIONS.map((option) => (

                    <option key={option.value} value={option.value}>

                      {option.label}

                    </option>

                  ))}

                </select>

              </Field>



              <Field id="designation" label="Designation">

                <input

                  id="designation"

                  name="designation"

                  value={form.designation}

                  onChange={handleChange}

                  placeholder="e.g. Receptionist"

                  maxLength={100}

                  disabled={submitting}

                  className={inputClass}

                />

              </Field>



              <Field id="joiningDate" label="Joining Date">

                <input

                  id="joiningDate"

                  name="joiningDate"

                  type="date"

                  value={form.joiningDate}

                  onChange={handleChange}

                  disabled={submitting}

                  className={inputClass}

                />

              </Field>

            </div>

          </SectionCard>



      

          <SectionCard

            title="Personal Details"

            description="Contact information and address."

          >

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">

              <Field id="phone" label="Phone">

                <input

                  id="phone"

                  name="phone"

                  type="tel"

                  value={form.phone}

                  onChange={handleChange}

                  placeholder="e.g. 9876543210"

                  maxLength={20}

                  disabled={submitting}

                  className={inputClass}

                />

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

                  <option value="">Select gender</option>

                  {GENDER_OPTIONS.map((option) => (

                    <option key={option.value} value={option.value}>

                      {option.label}

                    </option>

                  ))}

                </select>

              </Field>



              <Field id="dateOfBirth" label="Date of Birth">

                <input

                  id="dateOfBirth"

                  name="dateOfBirth"

                  type="date"

                  max={toDateInput(new Date())}

                  value={form.dateOfBirth}

                  onChange={handleChange}

                  disabled={submitting}

                  className={inputClass}

                />

              </Field>



              <div className="sm:col-span-3">

                <Field id="line1" label="Address">

                  <input

                    id="line1"

                    name="line1"

                    value={form.line1}

                    onChange={handleChange}

                    placeholder="House number, street, area"

                    maxLength={200}

                    disabled={submitting}

                    className={inputClass}

                  />

                </Field>

              </div>



              <Field id="city" label="City">

                <input

                  id="city"

                  name="city"

                  value={form.city}

                  onChange={handleChange}

                  maxLength={80}

                  disabled={submitting}

                  className={inputClass}

                />

              </Field>



              <Field id="state" label="State">

                <input

                  id="state"

                  name="state"

                  value={form.state}

                  onChange={handleChange}

                  maxLength={80}

                  disabled={submitting}

                  className={inputClass}

                />

              </Field>



              <Field id="pincode" label="Pincode">

                <input

                  id="pincode"

                  name="pincode"

                  value={form.pincode}

                  onChange={handleChange}

                  inputMode="numeric"

                  maxLength={12}

                  disabled={submitting}

                  className={inputClass}

                />

              </Field>
                <Field id="idType" label="ID Proof Type">

                <select

                  id="idType"

                  name="idType"

                  value={form.idType}

                  onChange={handleChange}

                  disabled={submitting}

                  className={inputClass}

                >

                  <option value="">Select ID type</option>

                  {ID_TYPE_OPTIONS.map((option) => (

                    <option key={option.value} value={option.value}>

                      {option.label}

                    </option>

                  ))}

                </select>

              </Field>



              <div className="sm:col-span-2">

                <Field id="idNumber" label="ID Number">

                  <input

                    id="idNumber"

                    name="idNumber"

                    value={form.idNumber}

                    onChange={handleChange}

                    placeholder="Enter ID number"

                    maxLength={30}

                    disabled={submitting}

                    className={inputClass}

                  />

                </Field>

              </div>

            </div>

          </SectionCard>



        

          <SectionCard

            title="Emergency Contact & ID Proof"

            description="Who to call in an emergency, and an identity document for the records."

          >

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">

              <Field id="emName" label="Emergency Contact Name">

                <input

                  id="emName"

                  name="emName"

                  value={form.emName}

                  onChange={handleChange}

                  maxLength={100}

                  disabled={submitting}

                  className={inputClass}

                />

              </Field>



              <Field id="emPhone" label="Emergency Contact Phone">

                <input

                  id="emPhone"

                  name="emPhone"

                  type="tel"

                  value={form.emPhone}

                  onChange={handleChange}

                  maxLength={20}

                  disabled={submitting}

                  className={inputClass}

                />

              </Field>



              <Field id="emRelation" label="Relation">

                <input

                  id="emRelation"

                  name="emRelation"

                  value={form.emRelation}

                  onChange={handleChange}

                  placeholder="e.g. Father, Spouse"

                  maxLength={50}

                  disabled={submitting}

                  className={inputClass}

                />

              </Field>



            

            </div>

          </SectionCard>



       

          <div className="flex flex-col-reverse gap-3 rounded border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-xs text-slate-500">

              <span className="text-rose-500">*</span> Required fields

            </p>



            <div className="flex flex-col-reverse gap-3 sm:flex-row">

              <button

                type="button"

                onClick={() => navigate(BACK_PATH)}

                disabled={submitting}

                className="rounded border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"

              >

                Cancel

              </button>

              <button

                type="submit"

                disabled={submitting}

                className="flex items-center justify-center gap-2 rounded bg-[#1a1a1a] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"

              >

                {submitting && <Loader2 size={16} className="animate-spin" />}

                {isEdit ? "Update Staff" : "Create Staff"}

              </button>

            </div>

          </div>

        </form>

      )}

    </div>

  );

};



export default StaffForm;