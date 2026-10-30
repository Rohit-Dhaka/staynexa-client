import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  KeyRound,
  Trash2,
  UserCheck,
  UserX,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  ShieldCheck,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  getStaffList,
  activateStaff,
  deactivateStaff,
  deleteStaff,
} from "../services/staff.service";

import ResetPasswordModal from "../components/ResetPasswordModal";
import ExportButtons from "../../../components/common/ExportButtons";
import { fetchAllPages } from "../../../utils/exportUtils";

const LIMIT = 10;

const selectClass =
  "w-full min-w-0 rounded border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-400 sm:w-auto";

const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40";

const StaffList = () => {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();

  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const openCreate = () => navigate("/staff/new");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const openEdit = (staff) => navigate(`/staff/${staff._id}/edit`);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (role) params.role = role;
      if (status) params.isActive = status;

      const data = await getStaffList(params);
      setItems(Array.isArray(data?.items) ? data.items : []);
      setMeta(data?.meta || null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [page, search, role, status]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleToggleActive = async (staff) => {
    if (staff.role === "super_admin") {
      toast.error("Super Admin cannot be activated or deactivated here.");
      return;
    }

    setBusyId(staff._id);
    try {
      if (staff.isActive) {
        await deactivateStaff(staff._id);
        toast.success(`${staff.name} deactivated`);
      } else {
        await activateStaff(staff._id);
        toast.success(`${staff.name} activated`);
      }
      await fetchStaff();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteTarget.role === "super_admin") {
      toast.error("Super Admin accounts cannot be deleted.");
      setDeleteTarget(null);
      return;
    }

    setDeleting(true);
    try {
      await deleteStaff(deleteTarget._id);
      toast.success("Staff deleted successfully");
      setDeleteTarget(null);

      if (items.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        await fetchStaff();
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete staff");
    } finally {
      setDeleting(false);
    }
  };

  const titleCase = (text) =>
    String(text || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "";

  const exportColumns = [
    { header: "Name", key: "name" },
    { header: "Email", key: "email" },
    { header: "Phone", key: "phone" },
    { header: "Role", value: (staff) => titleCase(staff.role) },
    { header: "Department", value: (staff) => titleCase(staff.department) },
    { header: "Designation", key: "designation" },
    { header: "Joining Date", value: (staff) => formatDate(staff.joiningDate) },
    {
      header: "Status",
      value: (staff) => (staff.isActive ? "Active" : "Inactive"),
    },
  ];

  const getExportRows = () =>
    fetchAllPages((currentPage) => {
      const params = { ...currentPage };
      if (search) params.search = search;
      if (role) params.role = role;
      if (status) params.isActive = status;
      return getStaffList(params);
    });

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setRole("");
    setStatus("");
    setPage(1);
  };

  const hasFilters = Boolean(searchInput || role || status);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      
      <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-700">
              <Users size={19} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
              Staff
            </h1>
          </div>
          <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
            Create and manage manager and staff accounts.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:w-auto sm:flex sm:flex-wrap sm:items-center">
          <div className="flex min-w-0 items-center justify-center gap-2 ">
            <ExportButtons
              title="Staff List"
              fileName="staff-list"
              columns={exportColumns}
              getRows={getExportRows}
            />
              <button
            type="button"
            onClick={openCreate}
            className={`${buttonClass} w-full bg-gray-900 text-white sm:w-auto`}
          >
            <Plus size={16} />
            Add Staff
          </button>
          </div>
        
        </div>
      </header>

      
      <section className="min-w-0 rounded border border-gray-200 bg-white p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
          <SlidersHorizontal size={16} className="text-gray-500" />
          Search and Filters
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
          <div className="relative min-w-0">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search name, email or phone"
              aria-label="Search staff by name, email or phone"
              className="w-full min-w-0 rounded border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-gray-400"
            />
          </div>

          <select
            aria-label="Filter by role"
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">All Roles</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
          </select>

          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="">All Statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasFilters}
            className={`${buttonClass} w-full border border-gray-200 text-gray-700 sm:col-span-2 lg:col-span-1 lg:w-auto`}
          >
            <X size={15} />
            Clear Filters
          </button>
        </div>
      </section>

      
      <section className="min-w-0 overflow-hidden rounded border border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-3 py-3 sm:px-4">
          <h2 className="text-sm font-semibold text-gray-900">Staff Directory</h2>
          <span className="text-xs text-gray-500">
            {meta?.total ?? items.length} records
          </span>
        </div>

        
        <div className="space-y-3 p-3 md:hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded border border-gray-100 p-8 text-sm text-gray-500">
              <Loader2 size={18} />
              Loading staff...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded border border-gray-100 px-4 py-10 text-center">
              <Users size={24} className="mx-auto text-gray-300" />
              <p className="mt-2 text-sm font-medium text-gray-700">No staff found</p>
              <p className="mt-1 text-xs text-gray-500">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            items.map((staff) => {
              const isSuperAdmin = staff.role === "super_admin";

              return (
                <article
                  key={staff._id}
                  className="min-w-0 rounded border border-gray-200 p-3"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gray-100 text-sm font-semibold text-gray-700">
                      {String(staff.name || "S")
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold text-gray-900">
                        {staff.name}
                      </p>
                      <p className="mt-0.5 break-all text-xs text-gray-500">
                        {staff.email || "No email provided"}
                      </p>
                      <p className="mt-1 break-words text-xs text-gray-600">
                        {staff.phone || "No phone provided"}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                        staff.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {staff.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        isSuperAdmin
                          ? "bg-rose-50 text-rose-700"
                          : staff.role === "manager"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-gray-900 text-white"
                      }`}
                    >
                      {isSuperAdmin ? "Super Admin" : titleCase(staff.role)}
                    </span>
                    {isSuperAdmin && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-rose-600">
                        <ShieldCheck size={13} />
                        Protected account
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(staff)}
                      title="Edit staff"
                      aria-label={`Edit ${staff.name}`}
                      className="inline-flex min-h-10 items-center justify-center gap-1 rounded border border-gray-200 px-2 text-xs font-medium text-gray-700"
                    >
                      <Pencil size={15} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetTarget(staff)}
                      title="Reset password"
                      aria-label={`Reset password for ${staff.name}`}
                      className="inline-flex min-h-10 items-center justify-center gap-1 rounded border border-gray-200 px-2 text-xs font-medium text-gray-700"
                    >
                      <KeyRound size={15} />
                      <span>Password</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(staff)}
                      disabled={isSuperAdmin || busyId === staff._id}
                      title={staff.isActive ? "Deactivate" : "Activate"}
                      aria-label={`${staff.isActive ? "Deactivate" : "Activate"} ${staff.name}`}
                      className="inline-flex min-h-10 items-center justify-center gap-1 rounded border border-gray-200 px-2 text-xs font-medium text-gray-700 disabled:opacity-40"
                    >
                      {busyId === staff._id ? (
                        <Loader2 size={15} />
                      ) : staff.isActive ? (
                        <UserX size={15} />
                      ) : (
                        <UserCheck size={15} />
                      )}
                      <span>{staff.isActive ? "Disable" : "Enable"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(staff)}
                      disabled={isSuperAdmin}
                      title="Delete staff"
                      aria-label={`Delete ${staff.name}`}
                      className="inline-flex min-h-10 items-center justify-center gap-1 rounded border border-red-100 px-2 text-xs font-medium text-red-600 disabled:opacity-40"
                    >
                      <Trash2 size={15} />
                      <span>Delete</span>
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Staff Member</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    <Loader2 size={20} className="mx-auto" />
                    <span className="mt-2 block text-sm">Loading staff...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    No staff found
                  </td>
                </tr>
              ) : (
                items.map((staff) => {
                  const isSuperAdmin = staff.role === "super_admin";

                  return (
                    <tr key={staff._id}>
                      <td className="max-w-[280px] px-4 py-4">
                        <p className="break-words font-semibold text-gray-900">
                          {staff.name}
                        </p>
                        <p className="mt-0.5 break-all text-xs text-gray-500">
                          {staff.email}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        {staff.phone || "-"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isSuperAdmin
                              ? "bg-rose-50 text-rose-700"
                              : staff.role === "manager"
                                ? "bg-purple-50 text-purple-700"
                                : "bg-gray-900 text-white"
                          }`}
                        >
                          {isSuperAdmin ? "Super Admin" : titleCase(staff.role)}
                        </span>
                        {isSuperAdmin && (
                          <p className="mt-1 text-[11px] text-rose-600">
                            Protected account
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            staff.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {staff.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(staff)}
                            title="Edit"
                            aria-label={`Edit ${staff.name}`}
                            className="rounded p-2 text-gray-600"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setResetTarget(staff)}
                            title="Reset password"
                            aria-label={`Reset password for ${staff.name}`}
                            className="rounded p-2 text-gray-600"
                          >
                            <KeyRound size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(staff)}
                            disabled={isSuperAdmin || busyId === staff._id}
                            title={staff.isActive ? "Deactivate" : "Activate"}
                            aria-label={`${staff.isActive ? "Deactivate" : "Activate"} ${staff.name}`}
                            className="rounded p-2 text-gray-600 disabled:opacity-40"
                          >
                            {busyId === staff._id ? (
                              <Loader2 size={16} />
                            ) : staff.isActive ? (
                              <UserX size={16} />
                            ) : (
                              <UserCheck size={16} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(staff)}
                            disabled={isSuperAdmin}
                            title="Delete"
                            aria-label={`Delete ${staff.name}`}
                            className="rounded p-2 text-red-600 disabled:opacity-40"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        
        {meta && meta.total > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <p className="text-center text-xs text-gray-500 sm:text-left sm:text-sm">
              Page {meta.page} of {meta.totalPages} · {meta.total} total
            </p>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={() => setPage((previous) => previous - 1)}
                disabled={!meta.hasPrevPage || loading}
                className={`${buttonClass} border border-gray-200 text-gray-700`}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((previous) => previous + 1)}
                disabled={!meta.hasNextPage || loading}
                className={`${buttonClass} border border-gray-200 text-gray-700`}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      <ResetPasswordModal
        open={Boolean(resetTarget)}
        staff={resetTarget}
        onClose={() => setResetTarget(null)}
        onDone={() => setResetTarget(null)}
      />

      
      {deleteTarget && deleteTarget.role !== "super_admin" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-staff-title"
            className="w-full max-w-sm rounded bg-white p-4 sm:p-6"
          >
            <h2
              id="delete-staff-title"
              className="text-base font-semibold text-gray-900 sm:text-lg"
            >
              Delete staff?
            </h2>
            <p className="mt-2 break-words text-sm leading-6 text-gray-600">
              <span className="font-semibold text-gray-900">
                {deleteTarget.name}
              </span>{" "}
              will be permanently deleted and can no longer log in. This
              cannot be undone. To block login but keep the record, use
              Deactivate instead.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className={`${buttonClass} w-full border border-gray-200 text-gray-700`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className={`${buttonClass} w-full bg-red-600 text-white`}
              >
                {deleting && <Loader2 size={16} />}
                Delete Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;
