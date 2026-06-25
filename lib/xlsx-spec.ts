// Spesifikasi workbook NETRAL (tanpa library xlsx) — aman dibundel di server.
// Server membangun struktur data ini lalu mengirimnya sebagai JSON; browser yang
// merakitnya jadi file .xlsx (lihat lib/xlsx-client.ts). Tujuannya: `xlsx` (SheetJS)
// TIDAK ikut ke bundle Cloudflare Worker (batas ukuran 3 MiB plan gratis).

// Sel mengikuti bentuk SheetJS CellObject tapi sebagai tipe plain (JSON-serializable):
//   t = tipe: 's' (string) | 'n' (number) | 'z' (blank)
//   v = nilai; f = rumus (formula); z = format angka (number format)
export type XlsxCell = {
  t: "s" | "n" | "z";
  v?: string | number;
  f?: string;
  z?: string;
};

export type XlsxColInfo = { wch?: number; hidden?: boolean };

export type XlsxSheet = {
  name: string;
  rows: (XlsxCell | null)[][];
  cols?: XlsxColInfo[];
};

export type WorkbookSpec = {
  sheets: XlsxSheet[];
  calcOnLoad?: boolean; // minta Excel hitung ulang rumus saat dibuka
};

// Respons standar route export: nama file + spec workbook.
export type ExportResponse = { filename: string; spec: WorkbookSpec };

// Nama kolom Excel dari indeks 0-based (0→"A", 25→"Z", 26→"AA"). Pengganti
// XLSX.utils.encode_col agar tidak perlu import xlsx di server.
export function colName(i: number): string {
  let n = i;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

// Helper sel ringkas (dipakai di server saat membangun spec).
export const sStr = (v: string): XlsxCell => ({ t: "s", v });
export const sNum = (v: number, z?: string): XlsxCell => ({ t: "n", v, ...(z ? { z } : {}) });
export const sFormula = (f: string, v: number, z?: string): XlsxCell => ({ t: "n", f, v, ...(z ? { z } : {}) });
export const sBlank: XlsxCell = { t: "z" };
