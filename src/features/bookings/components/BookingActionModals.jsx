import CheckInModal from "./CheckInModal";
import CheckOutModal from "./CheckOutModal";
import PaymentModal from "./PaymentModal";
import RefundModal from "./RefundModal";
import ExtendStayModal from "./ExtendStayModal";
import ChangeRoomModal from "./ChangeRoomModal";
import CancelModal from "./CancelModal";
import NoShowModal from "./NoShowModal";
import BillModal from "./BillModal";
import ConvertHoldModal from "./ConvertHoldModal";
import ExtendHoldModal from "./ExtendHoldModal";

export const MODAL_COMPONENTS = {
  checkin: CheckInModal,
  checkout: CheckOutModal,
  payment: PaymentModal,
  refund: RefundModal,
  extend: ExtendStayModal,
  changeRoom: ChangeRoomModal,
  cancel: CancelModal,
  noShow: NoShowModal,
  charge: BillModal,
  convert: ConvertHoldModal,
  extendHold: ExtendHoldModal,
};

const BookingActionModals = ({ action, booking, onClose, onDone }) => {
  const Component = action ? MODAL_COMPONENTS[action] : null;
  if (!Component) return null;
  return <Component booking={booking} onClose={onClose} onDone={onDone} />;
};

export default BookingActionModals;