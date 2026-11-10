import { Suspense } from "react";
import HistoryClient from "../HistoryClient";
import { readOwnerMovements } from "../../../lib/owner-operations";

export const instant = false;
export default async function Page() {
  let movements: Awaited<ReturnType<typeof readOwnerMovements>> | null = null;
  try {
    movements = await readOwnerMovements();
  } catch { /* Show a safe error state below. */ }
  if (!movements) return <p className="o-error" role="alert">Riwayat barang masuk tidak dapat dimuat. Pastikan sesi Owner aktif dan database dapat diakses.</p>;
  return <Suspense><HistoryClient direction="masuk" movements={movements} /></Suspense>;
}
