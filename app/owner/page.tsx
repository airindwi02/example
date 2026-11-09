import OwnerDashboardClient from "./OwnerDashboardClient";
import { readOwnerDashboard } from "../../lib/owner-operations";

export default async function OwnerDashboardPage() {
  let data: Awaited<ReturnType<typeof readOwnerDashboard>> | null = null;
  try {
    data = await readOwnerDashboard();
  } catch { /* Never replace database errors with sample data. */ }
  if (!data) return <p className="o-error" role="alert">Dashboard Owner tidak dapat dimuat. Pastikan sesi Owner aktif dan database dapat diakses, lalu muat ulang.</p>;
  return <OwnerDashboardClient data={data} />;
}
