export const ROLES = Object.freeze({
  SUPER_ADMIN: "super_admin",
  MANAGER: "manager",
  STAFF: "staff",
  GUEST: "guest",
});

export const ROLE_HOME = Object.freeze({
  [ROLES.SUPER_ADMIN]: "/dashboard",
  [ROLES.MANAGER]: "/dashboard",
  [ROLES.STAFF]: "/dashboard",
  [ROLES.GUEST]: "/guest",
});

export const INTERNAL_ROLES = [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.STAFF];

export const getHomePath = (role) => ROLE_HOME[role] || "/login";