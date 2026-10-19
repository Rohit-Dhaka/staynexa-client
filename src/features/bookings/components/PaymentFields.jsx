import { Field, inputClass } from "./formUi";
import { PAYMENT_METHODS } from "../utils/bookingUi";

const PaymentFields = ({ value, onChange, amountLabel = "Amount", showAmount = true }) => (
  <div className={`grid grid-cols-1 gap-3 ${showAmount ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
    {showAmount && (
      <Field label={amountLabel}>
        <input
          type="number"
          min="0"
          value={value.amount}
          onChange={(e) => onChange({ amount: e.target.value })}
          className={inputClass}
        />
      </Field>
    )}
    <Field label="Method">
      <select value={value.method} onChange={(e) => onChange({ method: e.target.value })} className={inputClass}>
        {PAYMENT_METHODS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </Field>
    <Field label="Reference">
      <input
        value={value.reference || ""}
        onChange={(e) => onChange({ reference: e.target.value })}
        placeholder="UPI ID, slip no."
        className={inputClass}
      />
    </Field>
  </div>
);

export default PaymentFields;