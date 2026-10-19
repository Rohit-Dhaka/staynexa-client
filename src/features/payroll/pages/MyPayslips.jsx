import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ReceiptText } from "lucide-react";
import toast from "react-hot-toast";

import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import { listAdvances, listPayslips } from "../services/payroll.service";
import { Badge } from "../components/PayrollUi";
import {
  PAYSLIP_STATUS_META,
  formatDate,
  formatINR,
  getErrorMessage,
  periodLabel,
} from "../payroll.utils";

const MyPayslips = () => {
  const { user } = useAuth();
  const isStaff = user?.role === ROLES.STAFF;

  const [payslips, setPayslips] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      listPayslips({ mine: true, limit: 36 }),
      isStaff ? listAdvances({ status: "active", limit: 50 }) : Promise.resolve({ items: [] }),
    ]).then(([slips, adv]) => {
      if (!active) return;
      if (slips.status === "fulfilled") setPayslips(slips.value.items);
      else toast.error(getErrorMessage(slips.reason, "Could not load your payslips"));
      if (adv.status === "fulfilled") setAdvances(adv.value.items);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [isStaff]);

  const outstanding = advances.reduce((sum, a) => sum + a.balanceAmount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Payslips</h1>
        <p className="mt-1 text-sm text-slate-500">Your monthly payslips. Open one to view or print it.</p>
      </div>

      {outstanding > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You have {formatINR(outstanding)} of salary advance still to be recovered
          {advances[0] ? `, deducted in installments from ${periodLabel(advances[0].firstRecoveryPeriod)}` : ""}.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex justify-center py-16 text-slate-400">
            <Loader2 className="animate-spin" />
          </div>
        ) : payslips.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <div className="rounded-xl bg-slate-100 p-4 text-slate-500">
              <ReceiptText size={28} />
            </div>
            <p className="text-sm text-slate-500">No payslips are available yet.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 text-right font-medium">Net pay</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Paid on</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payslips.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <Link to={`/payroll/${p._id}`} className="font-medium text-indigo-600 hover:underline">
                      {periodLabel(p.periodKey)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatINR(p.netPay)}</td>
                  <td className="px-4 py-3">
                    <Badge meta={PAYSLIP_STATUS_META[p.status]} value={p.status} />
                  </td>
                  <td className="px-4 py-3">{p.paidAt ? formatDate(p.paidAt) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MyPayslips;