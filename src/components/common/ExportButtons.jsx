import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { exportToExcel, exportToPDF } from "../../utils/exportUtils";


const ExportButtons = ({ title, fileName, columns, rows = [], getRows }) => {
  const [busy, setBusy] = useState(null); 

  const handleExport = async (type) => {
    try {
      setBusy(type);

      const data = getRows ? await getRows() : rows;

      if (!data || data.length === 0) {
        toast.error("There is no data available to export.");
        return;
      }

      if (type === "pdf") {
        await exportToPDF({ title, fileName, columns, rows: data });
      } else {
        await exportToExcel({ title, fileName, columns, rows: data });
      }

      toast.success(
        type === "pdf"
          ? "PDF downloaded successfully"
          : "Excel file downloaded successfully",
      );
    } catch (err) {
      console.error(err);
      toast.error("Export failed");
    } finally {
      setBusy(null);
    }
  };

  const btn =
    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="flex items-center gap-2">
      
      <button
        type="button"
        onClick={() => handleExport("pdf")}
        disabled={busy !== null}
        title="Download PDF"
        className={`${btn} border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}
      >
        {busy === "pdf" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Download size={16} />
        )}
        PDF
      </button>

      
      <button
        type="button"
        onClick={() => handleExport("excel")}
        disabled={busy !== null}
        title="Download Excel"
        className={`${btn} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
      >
        {busy === "excel" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Download size={16} />
        )}
        Excel
      </button>
    </div>
  );
};

export default ExportButtons;
