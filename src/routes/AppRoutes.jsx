import { Navigate, Route, Routes } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { INTERNAL_ROLES, ROLES } from "../constants/roles";

import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";

import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import GuestLayout from "../layouts/GuestLayout";

import Login from "../features/auth/pages/Login";
import GuestSignup from "../features/auth/pages/GuestSignup";
import Profile from "../features/auth/pages/Profile";
import ChangePassword from "../features/auth/pages/ChangePassword";
// import Dashboard from "../features/dashboard/pages/Dashboard";
import GuestHome from "../features/guests/pages/GuestHome";
import StaffList from "../features/staff/pages/StaffList";
import Rooms from "../features/rooms/pages/Rooms";
import Bookings from "../features/bookings/pages/Bookings";
import FrontDesk from "../features/frontdesk/pages/FrontDesk";

import Unauthorized from "../pages/Unauthorized";
import NotFound from "../pages/NotFound";
import RoomForm from "../features/rooms/components/RoomFormModal";
import RoomTypeForm from "../features/rooms/components/RoomTypeFormModal";
import StaffForm from "../features/staff/pages/StaffForm";

// import BookingForm from "../features/bookings/components/BookingForm";

import NewBooking from "../features/bookings/pages/NewBooking";
import BookingDetail from "../features/bookings/pages/BookingDetail";
import BookingInvoice from "../features/bookings/pages/BookingInvoice";
import BookingCalendar from "../features/bookings/pages/BookingCalendar";

import MyAttendance from "../features/attendance/pages/MyAttendance";
import DailyAttendance from "../features/attendance/pages/DailyAttendance";
import MonthlySheet from "../features/attendance/pages/MonthlySheet";
import Leaves from "../features/attendance/pages/Leaves";
import LeaveBalances from "../features/attendance/pages/LeaveBalances";
import AttendanceSettings from "../features/attendance/pages/AttendanceSettings";

import Banquet from "../features/banquet/pages/Banquet";
import BanquetBookingForm from "../features/banquet/pages/BanquetBookingForm";
import BanquetBookingDetail from "../features/banquet/pages/BanquetBookingDetail";
import BanquetCalendar from "../features/banquet/pages/BanquetCalendar";
import Halls from "../features/banquet/pages/Halls";
import CateringPackages from "../features/banquet/pages/CateringPackages";

import Housekeeping from "../features/housekeeping/pages/Housekeeping";
import HousekeepingForm from "../features/housekeeping/pages/HousekeepingForm.jsx";
import HousekeepingDetail from "../features/housekeeping/pages/HousekeepingDetail";

import PayrollRuns from "../features/payroll/pages/PayrollRuns";
import SalaryStructures from "../features/payroll/pages/SalaryStructures";
import Advances from "../features/payroll/pages/Advances";
import PayrollSettings from "../features/payroll/pages/PayrollSettings";
import PayslipDetail from "../features/payroll/pages/PayslipDetail";
import MyPayslips from "../features/payroll/pages/MyPayslips";
import Notifications from "../features/notifications/pages/Notifications.jsx";
import ExpensesPage from "../features/expenses/pages/ExpensesPage.jsx";
import ExpenseForm from "../features/expenses/pages/ExpenseForm.jsx";
import ExpenseDetails from "../features/expenses/pages/ExpenseDetails.jsx";
import ExpenseEdit from "../features/expenses/pages/ExpenseEdit.jsx";
import GuestList from "../features/guests/pages/GuestList.jsx";
import GuestForm from "../features/guests/pages/GuestForm.jsx";
import GuestProfile from "../features/guests/pages/GuestProfile.jsx";
import GuestServices from "../features/guests/pages/GuestServices.jsx";
import Reviews from "../features/guests/pages/Reviews.jsx";

import OffersPage from "../features/offers/pages/OffersPage";
import OfferForm from "../features/offers/pages/OfferForm";
import SuperAdminDashboard from "../features/dashboard/pages/SuperAdminDashboard.jsx";

// import GuestReservation from "../features/guest/pages/GuestReservation";
import GuestReservation from "../features/guests/pages/GuestReservation"
import GuestBanquet from "../features/banquet/pages/GuestBanquet.jsx";

const SharedLayout = () => {
  const { user } = useAuth();
  return user?.role === ROLES.GUEST ? <GuestLayout /> : <DashboardLayout />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />

    <Route element={<AuthLayout />}>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<GuestSignup />} />
    </Route>

    <Route element={<ProtectedRoute />}>
      <Route element={<SharedLayout />}>
        <Route path="/profile" element={<Profile />} />
        <Route path="/change-password" element={<ChangePassword />} />
      </Route>

      <Route element={<RoleRoute allowedRoles={INTERNAL_ROLES} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<SuperAdminDashboard />} />

          <Route path="/rooms" element={<Rooms />} />
          <Route path="/rooms/new" element={<RoomForm />} />
          <Route path="/rooms/:id/edit" element={<RoomForm />} />
          <Route path="/rooms/types/new" element={<RoomTypeForm />} />
          <Route path="/rooms/types/:id/edit" element={<RoomTypeForm />} />

          <Route path="/bookings/new" element={<NewBooking />} />
          <Route path="/bookings/:id" element={<BookingDetail />} />
          <Route path="/bookings/:id/invoice" element={<BookingInvoice />} />
          <Route path="/calendar" element={<BookingCalendar />} />
          <Route path="/bookings" element={<Bookings />} />

          <Route path="/payroll" element={<PayrollRuns />} />          
          <Route path="/structures" element={<SalaryStructures />} />
          <Route path="/advances" element={<Advances />} />
          <Route path="/payrollsettings" element={<PayrollSettings />} />
          <Route path="/payrollmy" element={<MyPayslips />} />
          <Route path="/payroll/:id" element={<PayslipDetail />} />

          <Route path="/guests" element={<GuestList />} />
          <Route path="/guests/new" element={<GuestForm />} />
          <Route path="/guests/:id" element={<GuestProfile />} />
          <Route path="/guests/:id/edit" element={<GuestForm />} />
          <Route path="/guest-services" element={<GuestServices />} />
          <Route path="/reviews" element={<Reviews />} />

          <Route path="/offers" element={<OffersPage />} />
          <Route path="/offers/new" element={<OfferForm />} />
          <Route path="/offers/:id/edit" element={<OfferForm />} />

          <Route path="/front-desk" element={<FrontDesk />} />
          <Route element={<RoleRoute allowedRoles={[ROLES.SUPER_ADMIN]} />}>
            {/* <Route path="/staff" element={<StaffList />} />             */}
            <Route path="/staff">
              <Route index element={<StaffList />} />
              <Route path="new" element={<StaffForm />} />
              <Route path=":id/edit" element={<StaffForm />} />
            </Route>

            <Route path="/housekeeping" element={<Housekeeping />} />
            <Route path="/housekeeping/new" element={<HousekeepingForm />} />
            <Route path="/housekeeping/:id" element={<HousekeepingDetail />} />

            <Route path="/attendance" element={<MyAttendance />} />
            <Route path="/attendance/daily" element={<DailyAttendance />} />
            <Route path="/attendance/monthly" element={<MonthlySheet />} />
            <Route path="/attendance/leaves" element={<Leaves />} />
            <Route path="/attendance/balances" element={<LeaveBalances />} />
            <Route
              path="/attendance/settings"
              element={<AttendanceSettings />}
            />

            <Route path="/banquet" element={<Banquet />} />
            <Route path="/banquet/new" element={<BanquetBookingForm />} />
            <Route path="/banquet/calendar" element={<BanquetCalendar />} />
            <Route path="/banquet/halls" element={<Halls />} />
            <Route path="/banquet/catering" element={<CateringPackages />} />
            <Route path="/banquet/:id" element={<BanquetBookingDetail />} />
            <Route path="/banquet/:id/edit" element={<BanquetBookingForm />} />

            <Route path="/notifications" element={<Notifications />} />

            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/expenses/new" element={<ExpenseForm />} />
            <Route path="/expenses/:id" element={<ExpenseDetails />} />
            <Route path="/expenses/:id/edit" element={<ExpenseEdit />} />
          </Route>
        </Route>
      </Route>

      <Route element={<RoleRoute allowedRoles={[ROLES.GUEST]} />}>
        <Route element={<GuestLayout />}>
          <Route path="/guest" element={<GuestHome />} />
          <Route path="/guest/reservation" element={<GuestReservation />} />
          {/* <Route path="/guest/banquetGuestReservation />} /> */}
          <Route path="/guest/banquet" element={<GuestBanquet/>} />
          {/* <Route path="/guest/bookings" element={<NewBooking />} /> */}
        </Route>
      </Route>
      <Route path="/unauthorized" element={<Unauthorized />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
