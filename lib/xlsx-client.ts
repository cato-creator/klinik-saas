// Perakit .xlsx di SISI BROWSER. `xlsx` (SheetJS) di-import dinamis di sini saja,
// jadi ia masuk ke chunk aset klien (TIDAK dihitung ke batas ukuran Worker).
// HANYA dipanggil dari komponen client.
import type { WorkSheet, WorkBook } from "xlsx";
import type { WorkbookSpec, ExportResponse } from "./xlsx-spec";

// SheetJS dimuat dari CDN saat RUNTIME di browser. URL lewat variabel + komentar
// `webpackIgnore` memastikan webpack TIDAK membundel `xlsx` ke worker Cloudflare
// (batas 3 MiB plan gratis). Tipe tetap akurat lewat `import type` (di-erase saat build).
const SHEETJS_CDN = "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

// Rakit WorkbookSpec → file .xlsx lalu picu unduhan di browser.
export async function downloadXlsx(spec: WorkbookSpec, filename: string): Promise<void> {
  const XLSX = (await import(/* webpackIgnore: true */ SHEETJS_CDN)) as unknown as typeof import("xlsx");
  const wb = XLSX.utils.book_new();

  for (const sheet of spec.sheets) {
    const ws: Record<string, unknown> = {};
    let maxC = 0;
    sheet.rows.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell == null) return;
        ws[XLSX.utils.encode_cell({ r, c })] = cell;
        if (c > maxC) maxC = c;
      });
    });
    ws["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(sheet.rows.length - 1, 0), c: maxC },
    });
    if (sheet.cols) ws["!cols"] = sheet.cols;
    XLSX.utils.book_append_sheet(wb, ws as WorkSheet, sheet.name);
  }

  if (spec.calcOnLoad) {
    wb.Workbook = { ...(wb.Workbook ?? {}), CalcPr: { fullCalcOnLoad: true } } as WorkBook["Workbook"];
  }

  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
  const blob = new Blob([out as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Ambil spec dari route export (JSON) lalu unduh .xlsx. Lempar Error bila gagal.
export async function fetchAndDownloadXlsx(url: string, init?: RequestInit): Promise<void> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Gagal mengunduh.");
  }
  const data = (await res.json()) as ExportResponse;
  await downloadXlsx(data.spec, data.filename);
}
