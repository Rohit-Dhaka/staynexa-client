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
import GuestReservation from "../features/guests/pages/GuestReservation";
import GuestBanquet from "../features/banquet/pages/GuestBanquet.jsx";
import MyBookings from "../features/bookings/pages/MyBookings.jsx";
import GuestBanquetBooking from "../features/banquet/pages/GuestBanquetBooking.jsx";

import GuestBanquetReservations from "../features/banquet/pages/GuestBanquetReservations.jsx";
import GuestBanquetReservationDetails from "../features/banquet/pages/GuestBanquetReservationDetails.jsx";
import GuestServiceRequests from "../features/guests/pages/GuestServiceRequests.jsx";
import GuestReviews from "../features/reviews/pages/GuestReviews.jsx";
import RestaurantDashboard from "../features/restaurant/pages/RestaurantDashboard.jsx";


import GuestRestaurantPage from "../features/restaurant/pages/GuestRestaurantPage.jsx";
import RestaurantSettingsPage from "../features/restaurant/pages/RestaurantSettingsPage.jsx";
import RestaurantOrdersPage from "../features/restaurant/pages/RestaurantOrdersPage";

import RestaurantManagementLayout, {
  MenuSection,
  CategoriesSection,
  TablesSection,
} from "../features/restaurant/pages/RestaurantManagementPage";
import GuestOrderTrackingPage from "../features/restaurant/pages/GuestOrderTrackingPage.jsx";
import PaymentReceiptPage from "../features/restaurant/pages/PaymentReceiptPage.jsx";



import AdminCabBookingsPage from "../features/cab/pages/AdminCabBookingsPage.jsx";
import CabBookingPage from "../features/cab/pages/CabBookingPage.jsx";
import AdminCabDashboardPage from "../features/cab/pages/AdminCabDashboardPage.jsx";
import AdminCabVehiclesPage from "../features/cab/pages/AdminCabVehiclesPage.jsx";
import AdminCabRatesPage from "../features/cab/pages/AdminCabRatesPage.jsx";
import AdminCabDriversPage from "../features/cab/pages/AdminCabDriversPage.jsx";
import AdminCabDispatchPage from "../features/cab/pages/AdminCabDispatchPage.jsx";
import MaintenanceHistory from "../features/mainteance/page/MaintenanceHistory.jsx";
import MaintenanceDashboard from "../features/mainteance/page/MaintenanceDashboard.jsx";
import AIManagerPage from "../features/ai/pages/AIManagerPage.jsx";
import GuestLostFound from "../features/lostFound/pages/GuestLostFound.jsx";
import AdminLostFound from "../features/lostFound/pages/AdminLostFound.jsx";


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



          <Route path="/restaurant" element={<RestaurantDashboard />} />

          <Route path="/restaurant/manage" element={<RestaurantManagementLayout />} >
            <Route index element={<Navigate to="menu" replace />} />
            <Route path="menu" element={<MenuSection />} />
            <Route path="categories" element={<CategoriesSection />} />
            <Route path="tables" element={<TablesSection />} />
          </Route>

          
          <Route path="/restaurant/orders" element={<RestaurantOrdersPage />} />
          <Route path="/restaurant/orders/create" element={<RestaurantOrdersPage />} />
          <Route path="/restaurant/receipt/:orderId" element={<PaymentReceiptPage />}/>


          {/* <Route path="/admin/cab-bookings" element={<AdminCabBookingsPage />} />
          <Route path="/admin/cab-dashboard" element={<AdminCabDashboardPage />} />
          <Route path="/admin/cab-vehicles" element={<AdminCabVehiclesPage />}/>
          <Route path="/admin/cab-rates" element={<AdminCabRatesPage />} />
          <Route path="/admin/cab-drivers" element={<AdminCabDriversPage />} />
          <Route path="/admin/cab-dispatch" element={<AdminCabDispatchPage />} /> */}

          {/* <Route path="/admin/cab">
  <Route index element={<AdminCabDashboardPage />} />
  <Route path="bookings" element={<AdminCabBookingsPage />} />
  <Route path="dispatch" element={<AdminCabDispatchPage />} />
  <Route path="vehicles" element={<AdminCabVehiclesPage />} />
  <Route path="drivers" element={<AdminCabDriversPage />} />
  <Route path="rates" element={<AdminCabRatesPage />} />
</Route> */}


<Route path="/admin/cab" element={<AdminCabDashboardPage />}>
  <Route path="bookings" element={<AdminCabBookingsPage />} />
  <Route path="dispatch" element={<AdminCabDispatchPage />} />
  <Route path="vehicles" element={<AdminCabVehiclesPage />} />
  <Route path="drivers" element={<AdminCabDriversPage />} />
  <Route path="rates" element={<AdminCabRatesPage />} />
  
</Route>





        <Route path="/maintenance/dashboard" element={<MaintenanceDashboard />} />
        <Route path="/maintenance/history" element={<MaintenanceHistory />} />



          
          
          
          <Route
            path="/restaurant/settings"
            element={<RestaurantSettingsPage />}
          />

          <Route path="/front-desk" element={<FrontDesk />} />
          <Route element={<RoleRoute allowedRoles={[ROLES.SUPER_ADMIN]} />}>
            
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
            <Route path="/attendance/settings" element={<AttendanceSettings />} />

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




            <Route path="/ai-manager" element={<AIManagerPage />} />
            <Route path="/lostfound" element={<AdminLostFound />} />
            


          </Route>
        </Route>
      </Route>

      <Route element={<RoleRoute allowedRoles={[ROLES.GUEST]} />}>
        <Route element={<GuestLayout />}>
          <Route path="/guest" element={<GuestHome />} />
          <Route path="/guest/reservation" element={<GuestReservation />} />
          <Route path="/guest/restaurant" element={<GuestRestaurantPage />} />
          <Route path="/guest/orders/track" element={<GuestOrderTrackingPage />}/>
        
          
          <Route path="/guest/banquet" element={<GuestBanquet />} />
          <Route path="/guest/bookings" element={<MyBookings />} />
          <Route path="/guest/banquet/:hallId/book" element={<GuestBanquetBooking />} />
          <Route path="/guest/banquet/my-reservations" element={<GuestBanquetReservations />} />
          <Route path="/guest/banquet/reservations/:bookingId" element={<GuestBanquetReservationDetails />} />
          <Route path="/guest/services" element={<GuestServiceRequests />} />
          <Route path="/guest/reviews" element={<GuestReviews />} />


          <Route path="/guest/cabs/new" element={<CabBookingPage />} />
          <Route path="/guest/lostfound" element={<GuestLostFound />} />
          
        </Route>
      </Route>
      <Route path="/unauthorized" element={<Unauthorized />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
