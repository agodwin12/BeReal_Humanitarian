// Minimal RFC 4180 CSV reader: handles quoted cells, doubled quotes, CRLF and
// a UTF-8 BOM. Returns rows as objects keyed by the header line.
function parseCsv(text) {
  const input = String(text).replace(/^﻿/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else inQuotes = false;
      } else cell += char;
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (!header) return { header: [], rows: [] };
  const keys = header.map((h) => h.trim());
  return {
    header: keys,
    rows: body.map((cells) => Object.fromEntries(keys.map((k, idx) => [k, cells[idx] ?? ""]))),
  };
}

module.exports = { parseCsv };
