/**
 * §8.3 — shared bulk-export pattern reused across every resource that
 * supports GET /export (applications, volunteers, in-kind donations, pets,
 * users, ...). Only CSV is implemented in this pass, since it's what the
 * Identity & Access domain's /api/auth/users/export needs; sendExcel/sendPdf
 * (exceljs/pdfkit-backed) are a follow-up addition for whichever resource
 * needs them first, rather than shipped here as non-working stubs.
 */
function toCsv(rows, fields) {
  const escapeCell = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const header = fields.map((f) => escapeCell(f.label || f.key)).join(",");
  const body = rows
    .map((row) => fields.map((f) => escapeCell(resolvePath(row, f.key))).join(","))
    .join("\n");

  return `${header}\n${body}`;
}

function resolvePath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function sendCsv(res, filename, rows, fields) {
  const csv = toCsv(rows, fields);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(csv);
}

module.exports = { toCsv, sendCsv };
