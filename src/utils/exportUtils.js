const BRAND_HEX = "FF991B1B";
const BRAND_RGB = [153, 27, 27];

const getCell = (row, col) =>
  typeof col.value === "function" ? col.value(row) : row[col.key];

const nowText = () =>
  new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const stamp = () => new Date().toISOString().slice(0, 10);

const thinBorder = { style: "thin", color: { argb: "FFE2E8F0" } };
const cellBorder = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };

export const exportToExcel = async ({ title, fileName, columns, rows }) => {
  const { default: ExcelJS } = await import("exceljs");

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(title.replace(/[\\/?*[\]:]/g, " ").slice(0, 31));
  const colCount = columns.length;

  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { size: 15, bold: true, color: { argb: BRAND_HEX } };
  ws.getRow(1).height = 26;

  ws.mergeCells(2, 1, 2, colCount);
  const dateCell = ws.getCell(2, 1);
  dateCell.value = `Generated: ${nowText()}  |  Total records: ${rows.length}`;
  dateCell.font = { size: 9, color: { argb: "FF64748B" } };

  const headerRow = ws.getRow(4);
  columns.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_HEX } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = cellBorder;
  });
  headerRow.height = 22;

  const widths = columns.map((c) => String(c.header).length);

  rows.forEach((row, rIdx) => {
    const excelRow = ws.getRow(5 + rIdx);

    columns.forEach((c, i) => {
      let v = getCell(row, c);
      if (v === undefined || v === null) v = "";

      const cell = excelRow.getCell(i + 1);
      cell.value = v;
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = cellBorder;

      if (c.type === "currency") {
        cell.numFmt = '"₹"#,##0.00';
        cell.alignment = { vertical: "middle", horizontal: "right" };
      } else if (c.type === "number") {
        cell.alignment = { vertical: "middle", horizontal: "right" };
      }

      if (rIdx % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }

      widths[i] = Math.max(widths[i], String(v).length);
    });
  });

  columns.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width || Math.min(Math.max(widths[i] + 4, 12), 40);
  });

  ws.views = [{ state: "frozen", ySplit: 4 }];

  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${fileName}-${stamp()}.xlsx`
  );
};

export const exportToPDF = async ({ title, fileName, columns, rows }) => {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({
    orientation: columns.length > 6 ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BRAND_RGB);
  doc.text(title, 40, 42);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated: ${nowText()}   |   Total records: ${rows.length}`, 40, 58);

  const body = rows.map((row) =>
    columns.map((c) => {
      const v = getCell(row, c);
      if (v === undefined || v === null || v === "") return "-";
      if (c.type === "currency") return `Rs. ${Number(v).toLocaleString("en-IN")}`;
      return String(v);
    })
  );

  autoTable(doc, {
    startY: 72,
    head: [columns.map((c) => c.header)],
    body,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 5,
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      textColor: [51, 65, 85],
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: BRAND_RGB,
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: columns.reduce((acc, c, i) => {
      if (c.type === "currency" || c.type === "number") acc[i] = { halign: "right" };
      return acc;
    }, {}),
    margin: { left: 40, right: 40, bottom: 40 },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - 40, pageHeight - 20, {
        align: "right",
      });
      doc.text("StayNexa", 40, pageHeight - 20);
    },
  });

  doc.save(`${fileName}-${stamp()}.pdf`);
};

export const fetchAllPages = async (fetchPage, { limit = 100, maxPages = 50 } = {}) => {
  const all = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const res = await fetchPage({ page, limit });
    const items = res.items ?? res.tasks ?? res.staff ?? [];
    all.push(...items);

    const pages = res.pages ?? res.pagination?.totalPages ?? res.meta?.totalPages ?? 1;
    if (page >= pages) break;
  }

  return all;
};


// const BRAND_HEX = "FF991B1B"; 
// const BRAND_RGB = [153, 27, 27];

// const getCell = (row, col) =>
//   typeof col.value === "function" ? col.value(row) : row[col.key];

// const nowText = () =>
//   new Date().toLocaleString("en-IN", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//   });

// const downloadBlob = (blob, filename) => {
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement("a");
//   a.href = url;
//   a.download = filename;
//   document.body.appendChild(a);
//   a.click();
//   a.remove();
//   URL.revokeObjectURL(url);
// };

// const stamp = () => new Date().toISOString().slice(0, 10);

// export const exportToExcel = async ({ title, fileName, columns, rows }) => {
//   const { default: ExcelJS } = await import("exceljs");

//   const wb = new ExcelJS.Workbook();
//   const ws = wb.addWorksheet(title.slice(0, 31));
//   const colCount = columns.length;

  
//   ws.mergeCells(1, 1, 1, colCount);
//   const titleCell = ws.getCell(1, 1);
//   titleCell.value = title;
//   titleCell.font = { size: 15, bold: true, color: { argb: BRAND_HEX } };
//   ws.getRow(1).height = 26;

  
//   ws.mergeCells(2, 1, 2, colCount);
//   const dateCell = ws.getCell(2, 1);
//   dateCell.value = `Generated: ${nowText()}  |  Total records: ${rows.length}`;
//   dateCell.font = { size: 9, color: { argb: "FF64748B" } };

  
//   const headerRow = ws.getRow(4);
//   columns.forEach((c, i) => {
//     const cell = headerRow.getCell(i + 1);
//     cell.value = c.header;
//     cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
//     cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_HEX } };
//     cell.alignment = { vertical: "middle", horizontal: "center" };
//     cell.border = {
//       top: { style: "thin", color: { argb: "FFE2E8F0" } },
//       left: { style: "thin", color: { argb: "FFE2E8F0" } },
//       bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
//       right: { style: "thin", color: { argb: "FFE2E8F0" } },
//     };
//   });
//   headerRow.height = 22;

  
//   const widths = columns.map((c) => String(c.header).length);

//   rows.forEach((row, rIdx) => {
//     const excelRow = ws.getRow(5 + rIdx);

//     columns.forEach((c, i) => {
//       let v = getCell(row, c);
//       if (v === undefined || v === null) v = "";

//       const cell = excelRow.getCell(i + 1);
//       cell.value = v;
//       cell.alignment = { vertical: "middle", wrapText: true };
//       cell.border = {
//         top: { style: "thin", color: { argb: "FFE2E8F0" } },
//         left: { style: "thin", color: { argb: "FFE2E8F0" } },
//         bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
//         right: { style: "thin", color: { argb: "FFE2E8F0" } },
//       };

//       if (c.type === "currency") {
//         cell.numFmt = '"₹"#,##0.00';
//         cell.alignment = { vertical: "middle", horizontal: "right" };
//       } else if (c.type === "number") {
//         cell.alignment = { vertical: "middle", horizontal: "right" };
//       }

//       if (rIdx % 2 === 1) {
//         cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
//       }

//       widths[i] = Math.max(widths[i], String(v).length);
//     });
//   });

//   columns.forEach((c, i) => {
//     ws.getColumn(i + 1).width = c.width || Math.min(Math.max(widths[i] + 4, 12), 40);
//   });

  
//   ws.views = [{ state: "frozen", ySplit: 4 }];

//   const buffer = await wb.xlsx.writeBuffer();
//   downloadBlob(
//     new Blob([buffer], {
//       type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//     }),
//     `${fileName}-${stamp()}.xlsx`
//   );
// };


// export const exportToPDF = async ({ title, fileName, columns, rows }) => {
//   const { default: jsPDF } = await import("jspdf");
//   const { default: autoTable } = await import("jspdf-autotable");

//   const doc = new jsPDF({
//     orientation: columns.length > 6 ? "landscape" : "portrait",
//     unit: "pt",
//     format: "a4",
//   });

//   const pageWidth = doc.internal.pageSize.getWidth();
//   const pageHeight = doc.internal.pageSize.getHeight();

  
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(16);
//   doc.setTextColor(...BRAND_RGB);
//   doc.text(title, 40, 42);

//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(9);
//   doc.setTextColor(100);
//   doc.text(`Generated: ${nowText()}   |   Total records: ${rows.length}`, 40, 58);

  
//   const body = rows.map((row) =>
//     columns.map((c) => {
//       const v = getCell(row, c);
//       if (v === undefined || v === null || v === "") return "-";
//       if (c.type === "currency") return `Rs. ${Number(v).toLocaleString("en-IN")}`;
//       return String(v);
//     })
//   );

//   autoTable(doc, {
//     startY: 72,
//     head: [columns.map((c) => c.header)],
//     body,
//     theme: "grid",
//     styles: {
//       fontSize: 8,
//       cellPadding: 5,
//       lineColor: [226, 232, 240],
//       lineWidth: 0.5,
//       textColor: [51, 65, 85],
//       overflow: "linebreak",
//     },
//     headStyles: {
//       fillColor: BRAND_RGB,
//       textColor: 255,
//       fontStyle: "bold",
//       halign: "center",
//     },
//     alternateRowStyles: { fillColor: [248, 250, 252] },
//     columnStyles: columns.reduce((acc, c, i) => {
//       if (c.type === "currency" || c.type === "number") acc[i] = { halign: "right" };
//       return acc;
//     }, {}),
//     margin: { left: 40, right: 40, bottom: 40 },
//     didDrawPage: () => {
//       doc.setFontSize(8);
//       doc.setTextColor(150);
//       doc.text(
//         `Page ${doc.internal.getCurrentPageInfo().pageNumber}`,
//         pageWidth - 40,
//         pageHeight - 20,
//         { align: "right" }
//       );
//       doc.text("ERP Panel", 40, pageHeight - 20);
//     },
//   });

//   doc.save(`${fileName}-${stamp()}.pdf`);
// };