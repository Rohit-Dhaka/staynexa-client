import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  BedDouble,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  CreditCard,
  House,
  Percent,
  RefreshCw,
  ReceiptText,
  Sparkles,
  Users,
  Utensils,
  Wallet,
  UserCheck,
  BriefcaseBusiness,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import toast from "react-hot-toast";
import { getDashboardData } from "../services/dashboard.service";

const CHART_COLORS = ["#6366f1", "#10b981", "#3b82f6", "#f43f5e", "#f59e0b", "#94a3b8"];

const money = (value) =>
  value == null || value === "" || !Number.isFinite(Number(value))
    ? "—"
    : `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const number = (value) =>
  value == null || value === "" || !Number.isFinite(Number(value))
    ? "—"
    : Number(value).toLocaleString("en-IN");

const localDateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const dateLabel = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const objectOf = (value) => {
  if (!value || typeof value !== "object") return {};
  let current = value;
  for (let i = 0; i < 3; i += 1) {
    if (current?.data && typeof current.data === "object" && !Array.isArray(current.data)) {
      current = current.data;
    } else {
      break;
    }
  }
  return current?.summary && typeof current.summary === "object"
    ? { ...current, ...current.summary }
    : current;
};

const arrayOf = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of keys) if (Array.isArray(value[key])) return value[key];
  for (const key of ["items", "results", "staff", "guests", "expenses", "bookings", "tasks", "leaves", "payslips", "offers", "data"]) {
    if (Array.isArray(value[key])) return value[key];
  }
  return [];
};

const pick = (sources, keys) => {
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const key of keys) {
      const value = source[key];
      if (value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value))) {
        return Number(value);
      }
    }
  }
  return null;
};

const firstText = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim()) ?? "—";

const statusOf = (item) =>
  String(item?.status || item?.bookingStatus || item?.paymentStatus || "UNKNOWN")
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

const normalizeBookingStatus = (status) => {
  if (status === "CHECKEDIN") return "CHECKED_IN";
  if (status === "CHECKEDOUT") return "CHECKED_OUT";
  if (status === "CANCELED") return "CANCELLED";
  return status;
};

const isActive = (item) =>
  item?.isActive === true || ["ACTIVE", "PUBLISHED", "ENABLED"].includes(statusOf(item));

export default function SuperAdminDashboard() {
  const [result, setResult] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getDashboardData();
      setResult(next);
      setLastUpdated(new Date());

      const entries = Object.values(next);
      const failed = entries.filter((item) => !item.ok).length;
      if (failed === entries.length) {
        toast.error("Dashboard APIs load nahi hui. API access aur endpoints check karein.");
      } else if (failed) {
        toast.error(`${failed} dashboard module(s) load nahi ho sake. Baaki data available hai.`);
      } else {
        toast.success("Dashboard data updated");
      }
    } catch (error) {
      toast.error(error?.message || "Dashboard load nahi ho saka");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const data = useCallback((key) => objectOf(result[key]?.data), [result]);
  const list = useCallback((key, keys) => arrayOf(result[key]?.data, keys), [result]);

  const frontDesk = data("frontDesk");
  const rooms = data("rooms");
  const payments = data("payments");
  const revenue = data("revenue");
  const housekeepingSummary = data("housekeepingSummary");
  const banquet = data("banquet");
  const payroll = data("payroll");
  const attendance = data("attendanceToday");

  const bookings = list("bookings", ["bookings"]);
  const expenses = list("expenses", ["expenses"]);
  const staffResponse = data("staff");
  const staff = list("staff", ["items", "staff"]);
  const leaves = list("leaves", ["leaves"]);
  const housekeepingTasks = list("housekeeping", ["tasks"]);
  const banquetBookings = list("banquetBookings", ["bookings"]);
  const guests = list("guests", ["guests"]);
  const offers = list("offers", ["offers"]);
  const payslips = list("payrollList", ["payslips"]);

  const revenueTotal = pick([revenue, revenue.summary, revenue.totals, payments, payments.summary], [
    "totalRevenue", "revenue", "grandTotal", "totalBilled", "roomRevenue", "total",
  ]);
  const collected = pick([payments, payments.summary, revenue, revenue.summary], [
    "totalCollected", "collectedAmount", "totalPaid", "paidAmount", "collected",
  ]);
  const outstanding = pick([payments, payments.summary, revenue, revenue.summary], [
    "totalOutstanding", "outstandingAmount", "balanceAmount", "pendingAmount", "totalDue",
  ]);
  const totalRooms = pick([rooms, rooms.summary], ["totalRooms", "total", "roomCount", "totalRoomCount"]);
  const occupiedRooms = pick([rooms, rooms.summary, frontDesk], ["occupiedRooms", "occupied", "roomsOccupied", "checkedInRooms"]);
  const occupancyRaw = pick([rooms, rooms.summary, frontDesk], ["occupancyRate", "occupancyPercentage", "occupancy"]);
  const occupancy = occupancyRaw == null && totalRooms > 0 && occupiedRooms != null
    ? Math.round((occupiedRooms / totalRooms) * 100)
    : occupancyRaw;
  const arrivals = pick([frontDesk, frontDesk.summary], ["todayArrivals", "arrivalsToday", "arrivals", "expectedArrivals"]);
  const departures = pick([frontDesk, frontDesk.summary], ["todayDepartures", "departuresToday", "departures", "expectedDepartures"]);
  const inHouse = pick([frontDesk, frontDesk.summary], ["inHouse", "inHouseGuests", "currentlyCheckedIn", "currentStays"]);
  const pendingTasks = pick(
    [housekeepingSummary, housekeepingSummary.byStatus],
    ["pending", "pendingTasks", "pendingCount", "totalPending"],
  );
  const upcomingEvents = pick([banquet, banquet.summary], ["upcomingEvents", "upcomingBookings", "upcoming", "totalUpcoming"]);
  const expensesTotal = expenses.length
    ? expenses.reduce((sum, item) => sum + (Number(item.amount ?? item.totalAmount ?? item.total ?? 0) || 0), 0)
    : pick([data("expenses")], ["totalAmount", "totalExpenses", "total"]);
  const activeStaff = pick([staffResponse], ["activeCount", "totalActive", "totalStaff"]) ??
    (staff.length ? staff.filter((item) => item.isActive !== false && statusOf(item) !== "INACTIVE").length : null);
  const attendancePresent = pick([attendance, attendance.summary], ["present", "presentCount", "checkedIn", "totalPresent"]);
  const pendingLeaves = leaves.filter((item) => ["PENDING", "SUBMITTED", "REQUESTED"].includes(statusOf(item))).length;
  const activeOffers = offers.filter(isActive).length;
  const pendingPayroll = payslips.filter((item) => ["PENDING", "DRAFT", "GENERATED", "APPROVED"].includes(statusOf(item))).length;

  const bookingStats = useMemo(() => {
    const counts = { CONFIRMED: 0, CHECKED_IN: 0, CHECKED_OUT: 0, CANCELLED: 0, PENDING: 0, OTHER: 0 };
    bookings.forEach((item) => {
      const status = normalizeBookingStatus(statusOf(item));
      if (status in counts) counts[status] += 1;
      else counts.OTHER += 1;
    });
    return counts;
  }, [bookings]);

  const bookingStatusData = useMemo(
    () => [
      { name: "Confirmed", value: bookingStats.CONFIRMED },
      { name: "Checked in", value: bookingStats.CHECKED_IN },
      { name: "Checked out", value: bookingStats.CHECKED_OUT },
      { name: "Cancelled", value: bookingStats.CANCELLED },
      { name: "Pending", value: bookingStats.PENDING },
      { name: "Other", value: bookingStats.OTHER },
    ].filter((item) => item.value > 0),
    [bookingStats],
  );

  const recentBookings = useMemo(
    () => [...bookings]
      .sort((a, b) => new Date(b.createdAt || b.bookingDate || b.checkIn || 0) - new Date(a.createdAt || a.bookingDate || a.checkIn || 0))
      .slice(0, 6),
    [bookings],
  );

  const bookingTrend = useMemo(() => {
    const grouped = new Map();
    const now = new Date();
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - offset);
      grouped.set(localDateKey(date), { date: localDateKey(date), label: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), bookings: 0 });
    }
    bookings.forEach((item) => {
      const rawDate = item.createdAt || item.bookingDate || item.checkIn || item.checkInDate;
      const key = localDateKey(rawDate);
      if (grouped.has(key)) grouped.get(key).bookings += 1;
    });
    return [...grouped.values()];
  }, [bookings]);

  const financeChart = useMemo(() => [
    { name: "Revenue", amount: revenueTotal ?? 0 },
    { name: "Collected", amount: collected ?? 0 },
    { name: "Outstanding", amount: outstanding ?? 0 },
    { name: "Expenses", amount: expensesTotal ?? 0 },
  ], [revenueTotal, collected, outstanding, expensesTotal]);

  const moduleStates = [
    ["Front desk", "frontDesk"], ["Rooms", "rooms"], ["Bookings", "bookings"],
    ["Payments", "payments"], ["Billing revenue", "revenue"], ["Expenses", "expenses"],
    ["Housekeeping summary", "housekeepingSummary"], ["Housekeeping tasks", "housekeeping"],
    ["Banquet", "banquet"], ["Banquet bookings", "banquetBookings"], ["Staff", "staff"],
    ["Attendance", "attendanceToday"], ["Leave requests", "leaves"],
    ["Payroll summary", "payroll"], ["Payslips", "payrollList"], ["Guests", "guests"], ["Offers", "offers"],
  ];

  const cards = [
    { title: "Total revenue", value: money(revenueTotal), subtitle: "Billing summary", icon: Wallet, tone: "violet" },
    { title: "Payments collected", value: money(collected), subtitle: "Recorded collections", icon: CreditCard, tone: "emerald" },
    { title: "Outstanding dues", value: money(outstanding), subtitle: "Unpaid bill balance", icon: ReceiptText, tone: "amber" },
    { title: "Room occupancy", value: occupancy == null ? "—" : `${occupancy}%`, subtitle: totalRooms != null && occupiedRooms != null ? `${number(occupiedRooms)} of ${number(totalRooms)} rooms occupied` : "Room performance", icon: BedDouble, tone: "blue" },
  ];

  const quickLinks = [
    ["Bookings", "Manage reservations", "/bookings", CalendarCheck],
    ["Front desk", "Arrivals and departures", "/front-desk", UserCheck],
    ["Rooms", "Rooms and room types", "/rooms", BedDouble],
    ["Billing", "Invoices and collections", "/billing", ReceiptText],
    ["Expenses", "Track business expenses", "/expenses", Wallet],
    ["Guests", "Guest records", "/guests", Users],
    ["Staff", "Staff administration", "/staff", BriefcaseBusiness],
    ["Attendance", "Attendance and leaves", "/attendance", CalendarDays],
    ["Payroll", "Salary and payslips", "/payroll", Banknote],
    ["Housekeeping", "Tasks and inspections", "/housekeeping", House],
    ["Banquet", "Events and halls", "/banquet", Utensils],
    ["Offers", "Promotions and coupons", "/offers", Percent],
  ];

  return (
    <main className="min-h-screen space-y-6 ">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-600">
            <Sparkles size={16} /> STAYNEXA / ADMIN CONSOLE
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"> Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Hotel operations, finance, staff and performance at a glance.</p>
          <p className="mt-2 text-xs text-slate-400">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5">
            <p className="text-xs text-slate-400">Last refreshed</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-700">
              {lastUpdated ? lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Not yet"}
            </p>
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 disabled:opacity-50">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> {loading ? "Refreshing…" : "Refresh data"}
          </button>
        </div>
      </header>

      {Object.keys(result).length > 0 && moduleStates.some(([, key]) => !result[key]?.ok) && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Some dashboard modules are unavailable</p>
            <p className="mt-1 text-amber-800">A failed endpoint does not stop the other dashboard modules from loading. Check API module health below.</p>
          </div>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const tones = { violet: "bg-violet-50 text-violet-700", emerald: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", blue: "bg-blue-50 text-blue-700" };
          return (
            <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.title}</p>
                  <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{loading ? "…" : card.value}</p>
                </div>
                <div className={`rounded-xl p-3 ${tones[card.tone]}`}><Icon size={21} /></div>
              </div>
              <p className="mt-4 text-xs text-slate-500">{card.subtitle}</p>
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SmallStat icon={CalendarDays} label="Today's arrivals" value={arrivals} description="Front desk overview" tone="indigo" />
        <SmallStat icon={CalendarClock} label="Today's departures" value={departures} description="Front desk overview" tone="blue" />
        <SmallStat icon={Users} label="Guests in house" value={inHouse} description="Current stays" tone="emerald" />
        <SmallStat icon={ClipboardCheck} label="Pending housekeeping" value={pendingTasks} description="Open tasks" tone="amber" />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Booking activity</h2>
              <p className="mt-1 text-sm text-slate-500">Last 7 days · booking records returned by the API</p>
            </div>
            <Link to="/bookings" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800">All bookings <ArrowRight size={15} /></Link>
          </div>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bookingTrend} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                <defs><linearGradient id="bookingFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.28} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }} />
                <Area type="monotone" dataKey="bookings" name="Bookings" stroke="#6366f1" strokeWidth={3} fill="url(#bookingFill)" activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-slate-400">This chart counts records whose booking/creation date falls within the last seven days. The API request currently fetches the latest 100 records.</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Booking status</h2>
          <p className="mt-1 text-sm text-slate-500">Status distribution for returned bookings</p>
          {bookingStatusData.length ? (
            <>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={bookingStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={3}>
                      {bookingStatusData.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={34} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-sm text-slate-500">{number(bookings.length)} bookings in response</p>
            </>
          ) : (
            <EmptyState icon={Activity} title="No booking status data" description="No booking records were returned from the API." />
          )}
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Finance overview</h2>
              <p className="mt-1 text-sm text-slate-500">Revenue, collections, outstanding dues and expense records</p>
            </div>
            <Link to="/billing" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">Open billing</Link>
          </div>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeChart} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN", { notation: "compact", maximumFractionDigits: 1 })}`} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }} />
                <Bar dataKey="amount" name="Amount" radius={[7, 7, 0, 0]}>
                  {financeChart.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Operations snapshot</h2>
          <p className="mt-1 text-sm text-slate-500">Daily operations and team activity</p>
          <div className="mt-5 space-y-4">
            <ProgressRow label="Room occupancy" value={occupancy} suffix="%" />
            <ProgressRow label="Attendance present" value={attendancePresent} max={activeStaff} suffix="" />
            <ProgressRow label="Pending housekeeping" value={pendingTasks} max={Math.max(housekeepingTasks.length, Number(pendingTasks) || 0, 1)} suffix="" />
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Upcoming banquet events</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{upcomingEvents == null ? number(banquetBookings.length || null) : number(upcomingEvents)}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div><h2 className="text-lg font-semibold text-slate-900">Recent bookings</h2><p className="mt-1 text-sm text-slate-500">Latest booking records returned by the API</p></div>
            <Link to="/bookings" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>{["Booking", "Guest", "Check-in", "Check-out", "Amount", "Status"].map((title) => <th key={title} className="px-5 py-3.5 font-semibold">{title}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Loading bookings…</td></tr>
                  : recentBookings.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">No bookings returned by the API.</td></tr>
                    : recentBookings.map((booking, index) => (
                      <tr key={booking._id || booking.bookingNumber || index} className="hover:bg-slate-50">
                        <td className="px-5 py-4 font-semibold text-slate-900">{firstText(booking.bookingNumber, booking._id?.slice(-8))}</td>
                        <td className="px-5 py-4 text-slate-700">{firstText(booking.guestDetails?.name, booking.guest?.name, booking.guestName, booking.customerName)}</td>
                        <td className="px-5 py-4 text-slate-600">{dateLabel(booking.checkIn || booking.checkInDate)}</td>
                        <td className="px-5 py-4 text-slate-600">{dateLabel(booking.checkOut || booking.checkOutDate)}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{money(booking.totalAmount ?? booking.grandTotal ?? booking.amount)}</td>
                        <td className="px-5 py-4"><StatusPill status={normalizeBookingStatus(statusOf(booking))} /></td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
          <p className="mt-1 text-sm text-slate-500">Open a frequently used module</p>
          <div className="mt-4 space-y-2">
            {quickLinks.map(([title, description, href, Icon]) => (
              <Link key={title} to={href} className="group flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-slate-200 hover:bg-slate-50">
                <div className="rounded-lg bg-slate-100 p-2.5 text-slate-700 group-hover:bg-white"><Icon size={18} /></div>
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">{title}</p><p className="mt-0.5 text-xs text-slate-500">{description}</p></div>
                <ArrowRight size={16} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard icon={Utensils} title="Upcoming banquet events" value={upcomingEvents == null ? number(banquetBookings.length || null) : number(upcomingEvents)} description="Banquet summary" href="/banquet" />
        <InfoCard icon={Wallet} title="Expenses in response" value={money(expensesTotal)} description={`${number(expenses.length)} expense records returned`} href="/expenses" />
        <InfoCard icon={BriefcaseBusiness} title="Active staff" value={activeStaff == null ? "—" : number(activeStaff)} description="Staff directory" href="/staff" />
        <InfoCard icon={CalendarCheck} title="Attendance present" value={attendancePresent == null ? "—" : number(attendancePresent)} description="Today's attendance sheet" href="/attendance" />
        <InfoCard icon={CalendarDays} title="Pending leave requests" value={number(pendingLeaves)} description="Pending/submitted leave records returned" href="/attendance/leaves" />
        <InfoCard icon={Banknote} title="Payroll records pending" value={number(pendingPayroll)} description="Payslips in draft/approval stages" href="/payroll" />
        <InfoCard icon={Users} title="Guests returned" value={number(guests.length)} description="Guest records in current response" href="/guests" />
        <InfoCard icon={Percent} title="Active offers" value={number(activeOffers)} description="Offers marked active by API" href="/offers" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-slate-900">API module health</h2><p className="mt-1 text-sm text-slate-500">Live status of each dashboard data source</p></div>
          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{moduleStates.filter(([, key]) => result[key]?.ok).length}/{moduleStates.length} connected</span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {moduleStates.map(([name, key]) => (
            <div key={key} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-3">
              <span className="text-sm text-slate-700">{name}</span>
              {result[key]?.ok ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 size={14} /> Connected</span>
                : result[key] ? <span title={result[key].error} className="inline-flex items-center gap-1 text-xs font-medium text-rose-600"><AlertCircle size={14} /> Unavailable</span>
                  : <span className="text-xs text-slate-400">Loading</span>}
            </div>
          ))}
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2"><Clock3 size={14} /> Dashboard data comes from backend GET endpoints.</span>
        <span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-IN")}` : "Waiting for data"}</span>
      </footer>
    </main>
  );
}

function SmallStat({ icon: Icon, label, value, description, tone }) {
  const styles = { indigo: "bg-indigo-50 text-indigo-700", blue: "bg-blue-50 text-blue-700", emerald: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700" };
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-3 ${styles[tone]}`}><Icon size={20} /></div>
        <div className="min-w-0"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{value == null ? "—" : number(value)}</p></div>
      </div>
      <p className="mt-3 text-xs text-slate-400">{description}</p>
    </article>
  );
}

function InfoCard({ icon: Icon, title, value, description, href }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link to={href} className="block">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-sm font-medium text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>
          <div className="rounded-xl bg-slate-100 p-3 text-slate-700"><Icon size={20} /></div>
        </div>
        <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-indigo-600">Open module <ArrowUpRight size={15} /></div>
      </Link>
    </article>
  );
}

function StatusPill({ status }) {
  const styles = {
    CONFIRMED: "bg-indigo-50 text-indigo-700",
    CHECKED_IN: "bg-emerald-50 text-emerald-700",
    CHECKED_OUT: "bg-blue-50 text-blue-700",
    CANCELLED: "bg-rose-50 text-rose-700",
    PENDING: "bg-amber-50 text-amber-700",
    COMPLETED: "bg-emerald-50 text-emerald-700",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || "bg-slate-100 text-slate-600"}`}>{status.replace(/_/g, " ")}</span>;
}

function ProgressRow({ label, value, max, suffix = "" }) {
  const numeric = value == null || !Number.isFinite(Number(value)) ? null : Number(value);
  const denominator = max == null || !Number.isFinite(Number(max)) || Number(max) <= 0 ? null : Number(max);
  const percent = numeric == null ? 0 : denominator ? Math.min(100, Math.max(0, (numeric / denominator) * 100)) : Math.min(100, Math.max(0, numeric));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900">{numeric == null ? "—" : `${number(numeric)}${suffix}`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl bg-slate-50 px-5 text-center">
      <div className="rounded-xl bg-white p-3 text-slate-400 shadow-sm"><Icon size={24} /></div>
      <p className="mt-3 font-semibold text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}
