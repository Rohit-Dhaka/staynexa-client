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
  "rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

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

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const openCreate = () => {
    navigate("/staff/new");
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const openEdit = (staff) => {
      console.log("Selected staff:", staff);

    navigate(`/staff/${staff._id}/edit`);
  };

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (role) params.role = role;
      if (status) params.isActive = status;

      const data = await getStaffList(params);
      setItems(data.items);
      setMeta(data.meta);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load staff");
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
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
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
        setPage((prev) => prev - 1);
      } else {
        fetchStaff();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete staff");
    } finally {
      setDeleting(false);
    }
  };

  const titleCase = (text) =>
  String(text || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

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
  { header: "Role", value: (s) => titleCase(s.role) },
  { header: "Department", value: (s) => titleCase(s.department) },
  { header: "Designation", key: "designation" },
  { header: "Joining Date", value: (s) => formatDate(s.joiningDate) },
  { header: "Status", value: (s) => (s.isActive ? "Active" : "Inactive") },
];
const getExportRows = () =>
  fetchAllPages((p) => {
    const params = { ...p };
    if (search) params.search = search;
    if (role) params.role = role;
    if (status) params.isActive = status;
    return getStaffList(params);
  });

  return (
    <div className="space-y-5">
      
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500">
            Create and manage manager and staff accounts
          </p>
        </div>
            <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            title="Staff List"
            fileName="staff-list"
            columns={exportColumns}
            getRows={getExportRows}
          />
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={16} />
            Add staff
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email or phone"
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className={selectClass}
        >
          <option value="">All roles</option>
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className={selectClass}
        >
          <option value="">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Phone</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-14 text-center text-gray-400"
                  >
                    <Loader2 className="mx-auto animate-spin" size={22} />
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-14 text-center text-gray-400"
                  >
                    No staff found
                  </td>
                </tr>
              )}

              {!loading &&
                items.map((staff) => {
                  const isSuperAdmin = staff.role === "super_admin";

                  return (
                  <tr key={staff._id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {staff.name}
                      </p>
                      <p className="text-xs text-gray-500">{staff.email}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {staff.phone || "-"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                          staff.role === "super_admin"
                            ? "bg-rose-50 text-rose-700"
                            : staff.role === "manager"
                              ? "bg-purple-50 text-purple-700"
                              : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {staff.role === "super_admin"
                          ? "Super Admin"
                          : staff.role}
                      </span>
                      {staff.role === "super_admin" && (
                        <p className="mt-1 text-[11px] font-medium text-rose-600">
                          Protected account
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          staff.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {staff.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(staff)}
                          title="Edit"
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setResetTarget(staff)}
                          title="Reset password"
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                        >
                          <KeyRound size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(staff)}
                          disabled={isSuperAdmin || busyId === staff._id}
                          title={
                            isSuperAdmin
                              ? "Super Admin cannot be deactivated"
                              : staff.isActive
                                ? "Deactivate"
                                : "Activate"
                          }
                          aria-label={
                            isSuperAdmin
                              ? "Super Admin status is protected"
                              : staff.isActive
                                ? "Deactivate staff"
                                : "Activate staff"
                          }
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          {busyId === staff._id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : staff.isActive ? (
                            <UserX size={16} />
                          ) : (
                            <UserCheck size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(staff)}
                          disabled={isSuperAdmin}
                          title={
                            isSuperAdmin
                              ? "Super Admin cannot be deleted"
                              : "Delete"
                          }
                          aria-label={
                            isSuperAdmin
                              ? "Super Admin deletion is protected"
                              : "Delete staff"
                          }
                          className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {meta && meta.total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-sm text-gray-500 sm:flex-row">
            <p>
              Page {meta.page} of {meta.totalPages} &middot; {meta.total} total
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((prev) => prev - 1)}
                disabled={!meta.hasPrevPage}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={() => setPage((prev) => prev + 1)}
                disabled={!meta.hasNextPage}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ResetPasswordModal
        open={Boolean(resetTarget)}
        staff={resetTarget}
        onClose={() => setResetTarget(null)}
        onDone={() => setResetTarget(null)}
      />

      {deleteTarget && deleteTarget.role !== "super_admin" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Delete staff?</h2>
            <p className="mt-2 text-sm text-gray-500">
              <span className="font-semibold text-gray-900">
                {deleteTarget.name}
              </span>{" "}
              will be permanently deleted and can no longer login. This cannot
              be undone. To block login but keep the record, use Deactivate
              instead.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70"
              >
                {deleting && <Loader2 size={16} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;
