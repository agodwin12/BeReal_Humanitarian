// Minimal CSV writer (RFC 4180 quoting). Values are stringified; objects
// are JSON-encoded so nothing is silently lost.
function cell(value) {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(columns, rows) {
  const header = columns.map((c) => cell(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => cell(typeof c.value === "function" ? c.value(row) : row[c.value])).join(","));
  return `﻿${[header, ...lines].join("\r\n")}\r\n`;
}

module.exports = { toCsv };
