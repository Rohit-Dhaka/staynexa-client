import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BedDouble,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import {
  deleteRoom,
  deleteRoomType,
  getRoomTypes,
  getRooms,
  getRoomsSummary,
  updateRoomStatus,
} from "../services/rooms.service";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import {
  SummaryCardsSkeleton,
  TableSkeleton,
} from "../../../components/common/Skeleton";
import ExportButtons from "../../../components/common/ExportButtons";

const STATUS_META = {
  available: { label: "Available", badge: "bg-emerald-50 text-emerald-700" },
  occupied: { label: "Occupied", badge: "bg-rose-50 text-rose-700" },
  reserved: { label: "Reserved", badge: "bg-amber-50 text-amber-700" },
  cleaning: { label: "Cleaning", badge: "bg-sky-50 text-sky-700" },
  maintenance: { label: "Maintenance", badge: "bg-orange-50 text-orange-700" },
  out_of_order: { label: "Out of Order", badge: "bg-slate-100 text-slate-600" },
};
const STATUS_KEYS = Object.keys(STATUS_META);
const inputClass =
  "rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const primaryButton =
  "flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700";
const formatPrice = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const useDebounce = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};
const getTotalPages = (meta) =>
  meta.totalPages || Math.ceil((meta.total || 0) / (meta.limit || 10)) || 1;
const EmptyState = ({ text }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
    <BedDouble size={28} />
    <p className="text-sm">{text}</p>
  </div>
);

const roomExportColumns = [
  { header: "Room Number", key: "roomNumber" },
  { header: "Floor", key: "floor" },
  { header: "Room Type", value: (room) => room.roomType?.name || "-" },
  {
    header: "Price / Night",
    value: (room) => room.priceOverride ?? room.roomType?.basePrice ?? 0,
    type: "currency",
  },
  {
    header: "Price Override",
    value: (room) => room.priceOverride ?? "-",
    type: "currency",
  },
  {
    header: "Status",
    value: (room) => STATUS_META[room.status]?.label || room.status || "-",
  },
];
const roomTypeExportColumns = [
  { header: "Room Type", key: "name" },
  { header: "Base Price", key: "basePrice", type: "currency" },
  { header: "Adult Capacity", value: (type) => type.capacity?.adults ?? 0 },
  { header: "Child Capacity", value: (type) => type.capacity?.children ?? 0 },
  { header: "Bed Type", key: "bedType" },
  {
    header: "Amenities",
    value: (type) => (type.amenities || []).join(", ") || "-",
  },
];

const SummaryCards = ({ summary }) => {
  if (!summary) return <SummaryCardsSkeleton count={STATUS_KEYS.length + 1} />;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">Total Rooms</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{summary.total ?? 0}</p>
      </div>
      {STATUS_KEYS.map((key) => (
        <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{STATUS_META[key].label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{summary[key] ?? 0}</p>
        </div>
      ))}
    </div>
  );
};

const Pagination = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
      <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page" className="rounded-lg border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /></button>
        <button type="button" onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Next page" className="rounded-lg border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
};

const RoomsTab = ({ canManage }) => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [meta, setMeta] = useState({});
  const [summary, setSummary] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [roomType, setRoomType] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const debouncedSearch = useDebounce(search);

  const loadSummary = useCallback(() => {
    getRoomsSummary().then((data) => setSummary(data.summary)).catch(() => {});
  }, []);
  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRooms({ page, limit: 10, search: debouncedSearch || undefined, status: status || undefined, roomType: roomType || undefined });
      setRooms(data.rooms || []);
      setMeta(data.meta || {});
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load rooms");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, roomType]);
  useEffect(() => { loadRooms(); }, [loadRooms]);
  useEffect(() => {
    loadSummary();
    getRoomTypes({ limit: 100 }).then((data) => setRoomTypes(data.roomTypes || [])).catch(() => {});
  }, [loadSummary]);
  const refresh = () => { loadRooms(); loadSummary(); };

  const handleStatusChange = async (room, nextStatus) => {
    if (nextStatus === room.status) return;
    setBusyId(room._id);
    try {
      await updateRoomStatus(room._id, nextStatus);
      toast.success(`Room ${room.roomNumber} is now ${STATUS_META[nextStatus].label}`);
      refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update status");
    } finally { setBusyId(null); }
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget._id);
    try {
      await deleteRoom(deleteTarget._id);
      toast.success("Room deleted successfully");
      setDeleteTarget(null);
      if (rooms.length === 1 && page > 1) setPage(page - 1); else refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete room");
    } finally { setBusyId(null); }
  };

  const getAllFilteredRooms = async () => {
    const first = await getRooms({ page: 1, limit: 100, search: debouncedSearch || undefined, status: status || undefined, roomType: roomType || undefined });
    const allRooms = [...(first.rooms || [])];
    const pages = getTotalPages(first.meta || {});
    for (let currentPage = 2; currentPage <= pages; currentPage += 1) {
      const data = await getRooms({ page: currentPage, limit: 100, search: debouncedSearch || undefined, status: status || undefined, roomType: roomType || undefined });
      allRooms.push(...(data.rooms || []));
    }
    return allRooms;
  };

  return (
    <div className="space-y-5">
      <SummaryCards summary={summary} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 lg:max-w-3xl">
          <div className="relative"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search room number" className={`${inputClass} w-full pl-10`} /></div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={inputClass}><option value="">All Statuses</option>{STATUS_KEYS.map((key) => <option key={key} value={key}>{STATUS_META[key].label}</option>)}</select>
          <select value={roomType} onChange={(e) => { setRoomType(e.target.value); setPage(1); }} className={inputClass}><option value="">All Room Types</option>{roomTypes.map((type) => <option key={type._id} value={type._id}>{type.name}</option>)}</select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons title="Rooms Report" fileName="rooms" columns={roomExportColumns} rows={rooms} getRows={getAllFilteredRooms} />
          {canManage && <button type="button" onClick={() => navigate("/rooms/new")} className={primaryButton}><Plus size={16} />Add Room</button>}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? <TableSkeleton rows={6} columns={6} /> : rooms.length === 0 ? <EmptyState text="No rooms found" /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-medium">Room</th><th className="px-4 py-3 font-medium">Floor</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Price / Night</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{rooms.map((room) => { const price = room.priceOverride ?? room.roomType?.basePrice ?? 0; const busy = busyId === room._id; return (
              <tr key={room._id} className="hover:bg-slate-50/60"><td className="px-4 py-3 font-semibold text-slate-900">{room.roomNumber}</td><td className="px-4 py-3 text-slate-600">{room.floor}</td><td className="px-4 py-3 text-slate-600">{room.roomType?.name || "-"}</td><td className="px-4 py-3 text-slate-600">{formatPrice(price)}{room.priceOverride != null && <span className="ml-1.5 text-xs text-indigo-600">custom</span>}</td>
                <td className="px-3 py-3"><div className="flex items-center gap-1.5 whitespace-nowrap">{STATUS_KEYS.map((key) => { const selected = room.status === key; return <label key={key} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${selected ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"} ${busy ? "cursor-not-allowed opacity-60" : ""}`}><input type="radio" name={`room-status-${room._id || room.id}`} value={key} checked={selected} onChange={() => handleStatusChange(room, key)} disabled={busy} className="h-3.5 w-3.5 accent-blue-600" /><span className="leading-none">{STATUS_META[key].label}</span></label>; })}</div></td>
                <td className="px-4 py-3">{canManage && <div className="flex justify-end gap-1"><button type="button" onClick={() => navigate(`/rooms/${room._id}/edit`)} disabled={busy} aria-label="Edit room" className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"><Pencil size={15} /></button><button type="button" onClick={() => setDeleteTarget(room)} disabled={busy} aria-label="Delete room" className="rounded-md p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"><Trash2 size={15} /></button></div>}</td>
              </tr>); })}</tbody>
          </table></div>
        )}
        <Pagination page={page} totalPages={getTotalPages(meta)} onChange={setPage} />
      </div>
      <ConfirmDialog open={Boolean(deleteTarget)} title="Delete this room?" message={`Room ${deleteTarget?.roomNumber ?? ""} will be permanently removed. This action cannot be undone.`} confirmText="Delete Room" loading={Boolean(deleteTarget) && busyId === deleteTarget?._id} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
};

const RoomTypesTab = ({ canManage }) => {
  const navigate = useNavigate();
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const debouncedSearch = useDebounce(search);
  const loadRoomTypes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRoomTypes({ limit: 100, search: debouncedSearch || undefined });
      setRoomTypes(data.roomTypes || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load room types");
    } finally { setLoading(false); }
  }, [debouncedSearch]);
  useEffect(() => { loadRoomTypes(); }, [loadRoomTypes]);
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget._id);
    try {
      await deleteRoomType(deleteTarget._id);
      toast.success("Room type deleted successfully");
      setDeleteTarget(null);
      loadRoomTypes();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete room type");
    } finally { setBusyId(null); }
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search room type" className={`${inputClass} w-full pl-10`} /></div>
        <div className="flex flex-wrap items-center gap-2"><ExportButtons title="Room Types Report" fileName="room-types" columns={roomTypeExportColumns} rows={roomTypes} />{canManage && <button type="button" onClick={() => navigate("/rooms/types/new")} className={primaryButton}><Plus size={16} />Add Room Type</button>}</div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? <TableSkeleton rows={5} columns={6} /> : roomTypes.length === 0 ? <EmptyState text="No room types found" /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Base Price</th><th className="px-4 py-3 font-medium">Capacity</th><th className="px-4 py-3 font-medium">Bed</th><th className="px-4 py-3 font-medium">Amenities</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{roomTypes.map((type) => { const busy = busyId === type._id; const amenities = type.amenities || []; return (
              <tr key={type._id} className="hover:bg-slate-50/60"><td className="px-4 py-3"><div className="flex items-center gap-3">{type.images?.[0]?.url ? <img src={type.images[0].url} alt={type.name} className="h-10 w-14 shrink-0 rounded-md object-cover" /> : <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400"><BedDouble size={16} /></div>}<span className="font-semibold text-slate-900">{type.name}</span></div></td><td className="px-4 py-3 text-slate-600">{formatPrice(type.basePrice)}</td><td className="px-4 py-3 text-slate-600">{type.capacity?.adults ?? 0} adults, {type.capacity?.children ?? 0} children</td><td className="px-4 py-3 capitalize text-slate-600">{type.bedType}</td><td className="px-4 py-3 text-slate-600">{amenities.length === 0 ? "-" : `${amenities.slice(0, 3).join(", ")}${amenities.length > 3 ? ` +${amenities.length - 3}` : ""}`}</td><td className="px-4 py-3">{canManage && <div className="flex justify-end gap-1"><button type="button" onClick={() => navigate(`/rooms/types/${type._id}/edit`)} disabled={busy} aria-label="Edit room type" className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"><Pencil size={15} /></button><button type="button" onClick={() => setDeleteTarget(type)} disabled={busy} aria-label="Delete room type" className="rounded-md p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"><Trash2 size={15} /></button></div>}</td></tr>
            ); })}</tbody>
          </table></div>
        )}
      </div>
      <ConfirmDialog open={Boolean(deleteTarget)} title="Delete this room type?" message={`"${deleteTarget?.name ?? ""}" will be permanently removed. This action cannot be undone.`} confirmText="Delete Room Type" loading={Boolean(deleteTarget) && busyId === deleteTarget?._id} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
};

const TABS = [
  { key: "rooms", label: "Rooms" },
  { key: "types", label: "Room Types" },
];
const Rooms = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "types" ? "types" : "rooms";
  const changeTab = (key) => setSearchParams(key === "types" ? { tab: "types" } : {});
  const canManage = [ROLES.SUPER_ADMIN, ROLES.MANAGER].includes(user?.role);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between"><div><h1 className="text-xl font-bold text-slate-900">Room Management</h1><p className="mt-1 text-sm text-slate-500">Manage rooms, room types and room status from one place.</p></div><div className="flex gap-1 border-b border-slate-200">{TABS.map((item) => <button key={item.key} type="button" onClick={() => changeTab(item.key)} className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${tab === item.key ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{item.label}</button>)}</div></div>
      {tab === "rooms" ? <RoomsTab canManage={canManage} /> : <RoomTypesTab canManage={canManage} />}
    </div>
  );
};
export default Rooms;
