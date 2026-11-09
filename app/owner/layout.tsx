import { Suspense } from "react";
import DashboardGate from "../_auth/DashboardGate";
import type { ReactNode } from "react";
import { OwnerProvider } from "./OwnerState";
import OwnerSectionLayout from "./OwnerSectionLayout";
import { loadMasterData } from "../../lib/owner-master";
import "./owner.css";
async function OwnerShell({ children }: { children: ReactNode }) {
  let data: Awaited<ReturnType<typeof loadMasterData>> | null = null;
  try {
    data = await loadMasterData();
  } catch { /* Render a safe, non-operational error state below. */ }
  if (!data) return <main className="o-main"><p className="o-error" role="alert">Data Owner tidak dapat dimuat. Pastikan sesi Owner aktif dan database dapat diakses, lalu muat ulang halaman.</p></main>;
  return <OwnerProvider items={data.ingredients}><OwnerSectionLayout>{children}</OwnerSectionLayout></OwnerProvider>;
}
export default function OwnerLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p>Memuat...</p>}><DashboardGate path="/owner">
    <OwnerShell>{children}</OwnerShell>
    </DashboardGate></Suspense>
  );
}
