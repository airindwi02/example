import { Suspense } from "react";
import MasterDataClient from "../MasterDataClient";
import { loadMasterData } from "../../../lib/owner-master";

export const instant = false;
async function MasterData() {
  let data: Awaited<ReturnType<typeof loadMasterData>> | null = null;
  try { data = await loadMasterData(); } catch { /* Show a safe error without database details. */ }
  if (!data) return <div className="o-error" role="alert">Data master belum dapat dimuat. Pastikan Anda masuk sebagai Owner aktif lalu muat ulang halaman.</div>;
  return <MasterDataClient initialData={data}/>;
}
export default function Page() {
  return (
    <Suspense fallback={<p>Memuat data master…</p>}>
      <MasterData />
    </Suspense>
  );
}
