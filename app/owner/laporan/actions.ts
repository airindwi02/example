"use server";

import { readInventoryReport, type InventoryReport } from "../../../lib/owner-operations";

export async function loadInventoryReportAction(input: { start: string; end: string; category: string }): Promise<{ ok: true; data: InventoryReport } | { ok: false; message: string }> {
  try {
    return { ok: true, data: await readInventoryReport(input) };
  } catch (error) {
    return { ok: false, message: error instanceof Error && error.message === "Periode laporan tidak valid." ? error.message : "Laporan tidak dapat dimuat. Pastikan sesi Owner aktif dan database dapat diakses." };
  }
}
