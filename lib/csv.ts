export type CsvCell = string | number;

export function serializeCsv(rows: CsvCell[][]) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

export function csvDownloadResponse(rows: CsvCell[][], filename: string) {
  return new Response(`\uFEFF${serializeCsv(rows)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function escapeCsvCell(value: CsvCell) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
