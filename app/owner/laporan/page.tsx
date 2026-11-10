import { connection } from "next/server";
import ReportClient from "../ReportClient";
import { readInventoryReport } from "../../../lib/owner-operations";

export const instant = false;
import { todayDate } from "../../daily-worker/data";
export default async function Page() {
  await connection();
  let data: Awaited<ReturnType<typeof readInventoryReport>> | null = null;
  try {
    const end = todayDate();
    data = await readInventoryReport({ start: `${end.slice(0, 7)}-01`, end, category: "Semua Kategori" });
  } catch { /* Show a safe error state below. */ }
  if (!data) return <p className="o-error" role="alert">Laporan persediaan tidak dapat dimuat. Pastikan sesi Owner aktif dan database dapat diakses.</p>;
  const categories = [...new Set(data.rows.map((row) => row.category))];
  return <ReportClient initialData={data} categories={categories} />;
}
