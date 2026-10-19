import { ROLES } from "../../constants/roles";

export const ROLE_OPTIONS = [
  { value: ROLES.MANAGER, label: "Manager" },
  { value: ROLES.STAFF, label: "Staff" },
];

export const ROLE_BADGE = {
  [ROLES.MANAGER]: "bg-indigo-50 text-indigo-700",
  [ROLES.STAFF]: "bg-sky-50 text-sky-700",
};

// Values must match the DEPARTMENTS list in backend staff.validator.js
export const DEPARTMENT_OPTIONS = [
  { value: "front_desk", label: "Front Desk" },
  { value: "housekeeping", label: "Housekeeping" },
  { value: "food_beverage", label: "Food & Beverage" },
  { value: "maintenance", label: "Maintenance" },
  { value: "accounts", label: "Accounts" },
  { value: "security", label: "Security" },
  { value: "management", label: "Management" },
  { value: "other", label: "Other" },
];

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export const ID_TYPE_OPTIONS = [
  { value: "aadhaar", label: "Aadhaar" },
  { value: "pan", label: "PAN" },
  { value: "driving_license", label: "Driving License" },
  { value: "voter_id", label: "Voter ID" },
  { value: "passport", label: "Passport" },
];

export const labelFor = (options, value) =>
  options.find((option) => option.value === value)?.label || value || "-";

export const getInitials = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

// Same rule as the backend: 8+ characters, at least one letter and one number.
export const getPasswordError = (password, label = "Password") => {
  if (!password || password.length < 8) {
    return `${label} must be at least 8 characters`;
  }
  if (password.length > 64) return `${label} must be at most 64 characters`;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return `${label} must contain at least one letter and one number`;
  }
  return "";
};

// Random 12 character password (no look-alike characters such as 0/O or 1/l).
export const generatePassword = (length = 12) => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "@#$%&*!";
  const all = upper + lower + digits + symbols;

  const random = (max) => {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % max;
  };

  const pick = (set) => set[random(set.length)];

  // Guarantee one of each group, then fill the rest.
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < length) chars.push(pick(all));

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = random(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
};