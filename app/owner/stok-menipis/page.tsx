import LowStockClient from "../LowStockClient";
import { loadMasterData } from "../../../lib/owner-master";
export default async function Page() {
  let data: Awaited<ReturnType<typeof loadMasterData>> | null = null;
  try {
    data = await loadMasterData();
  } catch { /* Show a safe error state below. */ }
  if (!data) return <p className="o-error" role="alert">Peringatan stok tidak dapat dimuat. Pastikan sesi Owner aktif dan database dapat diakses.</p>;
  return <LowStockClient initialData={data.ingredients} />;
}
